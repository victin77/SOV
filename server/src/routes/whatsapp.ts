import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { firstString } from '../utils/request';
import { normalizePhoneNumber } from '../utils/whatsapp';
import {
  ingestInboundWhatsAppMessage,
  mapWhatsAppActivity,
  promoteWhatsAppPendingToLead,
  sendLeadWhatsAppMessage,
} from '../utils/whatsappMessages';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';
import {
  resolveCompanyIdByPhoneNumberId,
  resolveCompanyIdByWebhookToken,
  resolveCompanyWhatsAppConfig,
} from '../utils/companyWhatsApp';
import { startQrSession, stopQrSession, qrManager } from '../utils/whatsappQr';

const router = Router();
const WHATSAPP_ACTIVITY_TYPES = ['WHATSAPP_SENT', 'WHATSAPP_RECEIVED'] as const;

type RawBodyRequest = Request & { rawBody?: string };

function getVerifyToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.VERIFY_TOKEN || null;
}

function getAppSecret() {
  return process.env.WHATSAPP_APP_SECRET || process.env.APP_SECRET || null;
}

function extractPhoneNumberId(payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const phoneNumberId = firstString(change?.value?.metadata?.phone_number_id);
      if (phoneNumberId) return phoneNumberId;
    }
  }

  return null;
}

function verifySignature(req: RawBodyRequest, appSecret?: string | null) {
  if (!appSecret) return true;

  const signatureHeader = req.headers['x-hub-signature-256'];
  if (typeof signatureHeader !== 'string' || !req.rawBody) return false;

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex')}`;
  const providedBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function getSearchFilter(search?: string) {
  if (!search) return {};

  return {
    OR: [
      { name: { contains: search } },
      { company: { contains: search } },
      { phone: { contains: search } },
    ],
  };
}

function extractInboundMessages(payload: any) {
  const extracted: Array<{ from: string; message: string; contactName?: string }> = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      const contactNames = new Map<string, string>();

      for (const contact of contacts) {
        const waId = normalizePhoneNumber(contact?.wa_id) || contact?.wa_id;
        const profileName = firstString(contact?.profile?.name);
        if (waId && profileName) {
          contactNames.set(waId, profileName);
        }
      }

      const messages = Array.isArray(value?.messages) ? value.messages : [];
      for (const message of messages) {
        const from = firstString(message?.from);
        if (!from) continue;

        let text = firstString(message?.text?.body);

        if (!text && message?.interactive?.button_reply?.title) {
          text = firstString(message.interactive.button_reply.title);
        }

        if (!text && message?.interactive?.list_reply?.title) {
          text = firstString(message.interactive.list_reply.title);
        }

        if (!text && message?.button?.text) {
          text = firstString(message.button.text);
        }

        if (!text) {
          const type = firstString(message?.type) || 'message';
          text = `[${type}]`;
        }

        const normalizedFrom = normalizePhoneNumber(from) || from;
        extracted.push({
          from,
          message: text,
          contactName: contactNames.get(normalizedFrom),
        });
      }
    }
  }

  return extracted;
}

router.get('/webhook', async (req: Request, res: Response) => {
  const mode = firstString(req.query['hub.mode']);
  const token = firstString(req.query['hub.verify_token']);
  const challenge = firstString(req.query['hub.challenge']);
  const companyId = await resolveCompanyIdByWebhookToken(prisma, token);
  const verifyToken = companyId
    ? (await resolveCompanyWhatsAppConfig(prisma, companyId)).webhookVerifyToken
    : getVerifyToken();

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken && challenge) {
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ error: 'Webhook verification failed' });
});

router.post('/webhook', async (req: RawBodyRequest, res: Response) => {
  try {
    const phoneNumberId = extractPhoneNumberId(req.body);
    const companyId = await resolveCompanyIdByPhoneNumberId(prisma, phoneNumberId);
    const resolvedConfig = await resolveCompanyWhatsAppConfig(prisma, companyId);

    if (!verifySignature(req, resolvedConfig.appSecret || getAppSecret())) {
      res.status(403).json({ error: 'Webhook signature inválida' });
      return;
    }

    const inboundMessages = extractInboundMessages(req.body);
    for (const inboundMessage of inboundMessages) {
      await ingestInboundWhatsAppMessage(prisma, {
        ...inboundMessage,
        companyId,
        provider: resolvedConfig.provider,
      });
    }

    res.json({ received: true, count: inboundMessages.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar webhook do WhatsApp' });
  }
});

router.use(authenticate);

router.get('/status', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const resolvedConfig = await resolveCompanyWhatsAppConfig(prisma, companyId);
  const storedConfig = await prisma.companyWhatsAppConfig.findUnique({
    where: { companyId },
    select: {
      enabled: true,
      phoneNumberId: true,
      apiTokenEncrypted: true,
      webhookVerifyTokenEncrypted: true,
      appSecretEncrypted: true,
    },
  });

  res.json({
    provider: resolvedConfig.provider,
    configured: resolvedConfig.configured,
    enabled: storedConfig?.enabled ?? false,
    tokenConfigured: Boolean(storedConfig?.apiTokenEncrypted || resolvedConfig.apiToken),
    phoneNumberIdConfigured: Boolean(storedConfig?.phoneNumberId || resolvedConfig.phoneNumberId),
    verifyTokenConfigured: Boolean(storedConfig?.webhookVerifyTokenEncrypted || resolvedConfig.webhookVerifyToken),
    appSecretConfigured: Boolean(storedConfig?.appSecretEncrypted || resolvedConfig.appSecret),
    webhookPath: '/api/whatsapp/webhook',
  });
});

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const search = firstString(req.query.search)?.trim();
    const leadScope = {
      ...companyWhere(req),
      ...(req.user!.role === 'SELLER' ? { assignedToId: req.user!.userId } : {}),
      ...getSearchFilter(search),
    };

    const latestActivities = await prisma.activity.findMany({
      where: {
        ...companyWhere(req),
        type: { in: [...WHATSAPP_ACTIVITY_TYPES] },
        lead: leadScope,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            company: true,
            status: true,
            stageId: true,
            stage: { select: { id: true, name: true, color: true } },
            assignedTo: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });

    type ConversationItem = {
      lead: NonNullable<(typeof latestActivities)[number]['lead']>;
      lastMessage: ReturnType<typeof mapWhatsAppActivity> | null;
    };

    const seenLeadIds = new Set<string>();
    const conversations: ConversationItem[] = latestActivities.flatMap((activity) => {
      if (!activity.lead || seenLeadIds.has(activity.leadId)) return [];
      seenLeadIds.add(activity.leadId);

      return [{
        lead: activity.lead,
        lastMessage: mapWhatsAppActivity(activity),
      }];
    });

    if (search) {
      const matchingLeads = await prisma.lead.findMany({
        where: {
          ...leadScope,
          phone: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          company: true,
          status: true,
          stageId: true,
          stage: { select: { id: true, name: true, color: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
        },
        take: 20,
      });

      for (const lead of matchingLeads) {
        if (seenLeadIds.has(lead.id)) continue;
        conversations.push({
          lead,
          lastMessage: null,
        });
      }
    }

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar conversas do WhatsApp' });
  }
});

router.get('/conversations/:leadId/messages', async (req: Request, res: Response) => {
  try {
    const leadId = firstString(req.params.leadId);
    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: {
        ...companyWhere(req),
        id: leadId,
        ...(req.user!.role === 'SELLER' ? { assignedToId: req.user!.userId } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        company: true,
        status: true,
        stageId: true,
        stage: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    const activities = await prisma.activity.findMany({
      where: {
        ...companyWhere(req),
        leadId,
        type: { in: [...WHATSAPP_ACTIVITY_TYPES] },
      },
      orderBy: { createdAt: 'asc' },
      take: 300,
    });

    res.json({
      lead,
      messages: activities.map(mapWhatsAppActivity),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar mensagens do WhatsApp' });
  }
});

router.post('/conversations/:leadId/messages', async (req: Request, res: Response) => {
  try {
    const leadId = firstString(req.params.leadId);
    const { message } = req.body as { message?: string };

    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }

    if (!message?.trim()) {
      res.status(400).json({ error: 'Mensagem do WhatsApp é obrigatória' });
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: {
        ...companyWhere(req),
        id: leadId,
        ...(req.user!.role === 'SELLER' ? { assignedToId: req.user!.userId } : {}),
      },
      select: { id: true },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    const result = await sendLeadWhatsAppMessage(prisma, {
      leadId,
      userId: req.user!.userId,
      message: message.trim(),
    });

    res.status(201).json({
      ok: true,
      provider: result.provider,
      link: result.link,
      providerResponse: result.providerResponse,
      message: mapWhatsAppActivity(result.activity),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao enviar mensagem do WhatsApp' });
  }
});

// ===================== Pendentes (números desconhecidos) =====================

// Lista conversas pendentes (uma por número, com última mensagem e contagem)
router.get('/pending', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const search = firstString(req.query.search)?.trim();

  const where = {
    companyId,
    ...(search ? { fromNumber: { contains: search.replace(/\D/g, '') } } : {}),
  };

  const messages = await prisma.whatsAppPendingMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const grouped = new Map<string, {
    fromNumber: string;
    contactName: string | null;
    lastMessage: string;
    lastAt: Date;
    count: number;
  }>();

  for (const m of messages) {
    const existing = grouped.get(m.fromNumber);
    if (!existing) {
      grouped.set(m.fromNumber, {
        fromNumber: m.fromNumber,
        contactName: m.contactName || null,
        lastMessage: m.message,
        lastAt: m.createdAt,
        count: 1,
      });
    } else {
      existing.count += 1;
      if (!existing.contactName && m.contactName) {
        existing.contactName = m.contactName;
      }
    }
  }

  const conversations = Array.from(grouped.values()).sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
  );

  res.json({ conversations });
});

// Lista mensagens de um número pendente específico
router.get('/pending/:phone/messages', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const phone = firstString(req.params.phone);
  if (!phone) {
    res.status(400).json({ error: 'Número inválido' });
    return;
  }

  const fromNumber = phone.replace(/\D/g, '');
  const messages = await prisma.whatsAppPendingMessage.findMany({
    where: { companyId, fromNumber },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  if (messages.length === 0) {
    res.status(404).json({ error: 'Nenhuma mensagem pendente desse número' });
    return;
  }

  res.json({
    fromNumber,
    contactName: messages.find((m) => m.contactName)?.contactName || null,
    messages: messages.map((m) => ({
      id: m.id,
      text: m.message,
      provider: m.provider,
      createdAt: m.createdAt,
    })),
  });
});

// Promove um número pendente a Lead (cria lead e move mensagens)
router.post('/pending/:phone/promote', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const phone = firstString(req.params.phone);
  if (!phone) {
    res.status(400).json({ error: 'Número inválido' });
    return;
  }

  const { name, assignedToId } = req.body as { name?: string; assignedToId?: string };
  const fromNumber = phone.replace(/\D/g, '');

  try {
    const result = await promoteWhatsAppPendingToLead(prisma, {
      fromNumber,
      companyId,
      leadName: name,
      assignedToId: assignedToId || req.user!.userId,
    });
    res.status(201).json({
      ok: true,
      lead: { id: result.lead.id, name: result.lead.name, phone: result.lead.phone },
      movedCount: result.movedCount,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha ao promover lead' });
  }
});

// ===================== QR Code (Baileys) =====================

router.get('/preference', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { whatsappPreference: true },
  });
  res.json({ preference: user?.whatsappPreference || 'COMPANY' });
});

router.put('/preference', async (req: Request, res: Response) => {
  const { preference } = req.body as { preference?: string };
  if (preference !== 'COMPANY' && preference !== 'PERSONAL') {
    res.status(400).json({ error: 'Preferência inválida' });
    return;
  }
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { whatsappPreference: preference },
  });
  res.json({ ok: true });
});

router.get('/qr-sessions', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER';

  const where = isAdmin
    ? { companyId }
    : { companyId, OR: [{ userId: req.user!.userId }, { userId: null }] };

  const sessions = await prisma.whatsAppQrSession.findMany({
    where,
    select: {
      id: true,
      label: true,
      status: true,
      phoneNumber: true,
      userId: true,
      lastError: true,
      connectedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ userId: 'asc' }, { createdAt: 'desc' }],
  });

  res.json({ sessions });
});

router.post('/qr-sessions', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const { label, isCompany } = req.body as { label?: string; isCompany?: boolean };

  if (!label?.trim()) {
    res.status(400).json({ error: 'Nome é obrigatório' });
    return;
  }

  const wantsCompany = Boolean(isCompany);
  if (wantsCompany && req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
    res.status(403).json({ error: 'Apenas admin/gerente pode criar conexão da empresa' });
    return;
  }

  const session = await prisma.whatsAppQrSession.create({
    data: {
      label: label.trim(),
      companyId,
      userId: wantsCompany ? null : req.user!.userId,
      status: 'CONNECTING',
    },
  });

  startQrSession(session.id, companyId).catch((err) => console.error('[QR] start error:', err));

  res.status(201).json({ session });
});

router.get('/qr-sessions/:id', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const id = firstString(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const session = await prisma.whatsAppQrSession.findFirst({
    where: { id, companyId },
  });
  if (!session) {
    res.status(404).json({ error: 'Sessão não encontrada' });
    return;
  }
  if (session.userId && session.userId !== req.user!.userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
    res.status(403).json({ error: 'Sem permissão' });
    return;
  }
  res.json({ session });
});

router.post('/qr-sessions/:id/reconnect', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const id = firstString(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const session = await prisma.whatsAppQrSession.findFirst({ where: { id, companyId } });
  if (!session) {
    res.status(404).json({ error: 'Sessão não encontrada' });
    return;
  }
  if (session.userId && session.userId !== req.user!.userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
    res.status(403).json({ error: 'Sem permissão' });
    return;
  }

  startQrSession(session.id, companyId).catch((err) => console.error('[QR] reconnect error:', err));
  res.json({ ok: true });
});

router.delete('/qr-sessions/:id', async (req: Request, res: Response) => {
  const companyId = getCompanyIdFromRequest(req);
  const id = firstString(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const session = await prisma.whatsAppQrSession.findFirst({ where: { id, companyId } });
  if (!session) {
    res.status(404).json({ error: 'Sessão não encontrada' });
    return;
  }
  if (session.userId && session.userId !== req.user!.userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
    res.status(403).json({ error: 'Sem permissão' });
    return;
  }
  if (!session.userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
    res.status(403).json({ error: 'Sem permissão' });
    return;
  }

  await stopQrSession(session.id);
  await prisma.whatsAppQrSession.delete({ where: { id: session.id } });

  res.json({ ok: true });
});

export default router;
