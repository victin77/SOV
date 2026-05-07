import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import QRCode from 'qrcode';
import { prisma } from './prisma';
import { ingestInboundWhatsAppMessage } from './whatsappMessages';
import { normalizePhoneNumber } from './whatsapp';

const AUTH_DIR = path.join(process.cwd(), 'wa-qr-auth');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

interface SessionContext {
  sessionId: string;
  companyId: string;
}

class QrSession extends EventEmitter {
  ctx: SessionContext;
  sock: WASocket | null = null;
  status: 'idle' | 'connecting' | 'qr' | 'connected' | 'disconnected' = 'idle';
  phoneNumber: string | null = null;

  constructor(ctx: SessionContext) {
    super();
    this.ctx = ctx;
  }

  private authPath() {
    return path.join(AUTH_DIR, this.ctx.sessionId);
  }

  async start() {
    if (this.status === 'connecting' || this.status === 'connected') return;
    this.status = 'connecting';

    const { state, saveCreds } = await useMultiFileAuthState(this.authPath());
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' }) as any;

    this.sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['SOV CRM', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 1 });
          this.status = 'qr';
          await prisma.whatsAppQrSession.update({
            where: { id: this.ctx.sessionId },
            data: { status: 'QR_PENDING', lastQr: dataUrl, lastError: null },
          }).catch(() => {});
        } catch (err) {
          console.error('[QR] encode error:', err);
        }
      }

      if (connection === 'open') {
        this.status = 'connected';
        const me = this.sock?.user;
        this.phoneNumber = me?.id?.split(':')[0]?.split('@')[0] || null;
        await prisma.whatsAppQrSession.update({
          where: { id: this.ctx.sessionId },
          data: {
            status: 'CONNECTED',
            phoneNumber: this.phoneNumber,
            lastQr: null,
            lastError: null,
            connectedAt: new Date(),
          },
        }).catch(() => {});
      }

      if (connection === 'close') {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        this.status = 'disconnected';

        await prisma.whatsAppQrSession.update({
          where: { id: this.ctx.sessionId },
          data: { status: 'DISCONNECTED', lastError: loggedOut ? 'logged_out' : 'disconnected' },
        }).catch(() => {});

        if (loggedOut) {
          this.clearAuth();
        } else {
          setTimeout(() => this.start().catch((e) => console.error('[QR] reconnect error:', e)), 3000);
        }
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (!msg.message) continue;

        const text = this.extractText(msg);
        if (!text) continue;

        const fromJid = msg.key.remoteJid || '';
        const fromNumber = fromJid.split('@')[0];

        const contactName = msg.pushName || undefined;

        try {
          await ingestInboundWhatsAppMessage(prisma, {
            from: fromNumber,
            message: text,
            contactName,
            companyId: this.ctx.companyId,
            provider: 'qr',
          });
        } catch (err) {
          console.error('[QR] ingest error:', err);
        }
      }
    });
  }

  private extractText(msg: proto.IWebMessageInfo): string | null {
    const m = msg.message;
    if (!m) return null;
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return `[imagem] ${m.imageMessage.caption}`;
    if (m.videoMessage?.caption) return `[vídeo] ${m.videoMessage.caption}`;
    if (m.documentMessage?.caption) return `[documento] ${m.documentMessage.caption}`;
    if (m.audioMessage) return '[áudio]';
    if (m.stickerMessage) return '[sticker]';
    return null;
  }

  async sendText(toNumber: string, text: string): Promise<{ id: string }> {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('Sessão QR não está conectada');
    }
    const normalized = normalizePhoneNumber(toNumber) || toNumber.replace(/\D/g, '');
    const jid = `${normalized}@s.whatsapp.net`;
    const result = await this.sock.sendMessage(jid, { text });
    return { id: result?.key?.id || '' };
  }

  async logout() {
    try {
      if (this.sock) await this.sock.logout();
    } catch (err) {
      console.error('[QR] logout error:', err);
    }
    this.clearAuth();
    this.status = 'disconnected';
  }

  private clearAuth() {
    try {
      const dir = this.authPath();
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('[QR] clear auth error:', err);
    }
  }
}

class QrSessionManager {
  private sessions = new Map<string, QrSession>();

  get(sessionId: string): QrSession | undefined {
    return this.sessions.get(sessionId);
  }

  isConnected(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.status === 'connected';
  }

  getOrCreate(ctx: SessionContext): QrSession {
    let s = this.sessions.get(ctx.sessionId);
    if (!s) {
      s = new QrSession(ctx);
      this.sessions.set(ctx.sessionId, s);
    }
    return s;
  }

  async stop(sessionId: string) {
    const s = this.sessions.get(sessionId);
    if (s) {
      await s.logout();
      this.sessions.delete(sessionId);
    }
  }
}

export const qrManager = new QrSessionManager();

export async function startQrSession(sessionId: string, companyId: string) {
  const session = qrManager.getOrCreate({ sessionId, companyId });
  await prisma.whatsAppQrSession.update({
    where: { id: sessionId },
    data: { status: 'CONNECTING', lastError: null },
  }).catch(() => {});
  await session.start();
}

export async function stopQrSession(sessionId: string) {
  await qrManager.stop(sessionId);
  await prisma.whatsAppQrSession.update({
    where: { id: sessionId },
    data: { status: 'DISCONNECTED', lastQr: null },
  }).catch(() => {});
}

export async function resolveQrSessionForUser(userId: string, companyId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { whatsappPreference: true } });
  if (!user) return null;

  if (user.whatsappPreference === 'PERSONAL') {
    const personal = await prisma.whatsAppQrSession.findFirst({
      where: { userId, companyId, status: 'CONNECTED' },
      orderBy: { connectedAt: 'desc' },
    });
    if (personal && qrManager.isConnected(personal.id)) return personal;
  }

  const company = await prisma.whatsAppQrSession.findFirst({
    where: { companyId, userId: null, status: 'CONNECTED' },
    orderBy: { connectedAt: 'desc' },
  });
  if (company && qrManager.isConnected(company.id)) return company;

  return null;
}

export async function sendViaQrSession(sessionId: string, toNumber: string, message: string) {
  const session = qrManager.get(sessionId);
  if (!session || session.status !== 'connected') {
    throw new Error('Sessão QR indisponível');
  }
  return session.sendText(toNumber, message);
}

export async function bootstrapQrSessions() {
  const sessions = await prisma.whatsAppQrSession.findMany({
    where: { status: { in: ['CONNECTED', 'CONNECTING', 'QR_PENDING'] } },
  });
  for (const s of sessions) {
    try {
      await startQrSession(s.id, s.companyId);
    } catch (err) {
      console.error(`[QR Bootstrap] session ${s.id}:`, err);
    }
  }
}
