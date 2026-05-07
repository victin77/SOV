import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import {
  buildAuthorizationUrl,
  exchangeCodeForRefreshToken,
  isCalendarSyncEnabled,
  revokeRefreshToken,
} from '../utils/googleCalendar';

const router = Router();

const STATE_COOKIE = 'gcal_oauth_state';
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 min
const FRONTEND_RETURN_PATH = '/settings?gcal=';

function frontendUrl(suffix: string): string {
  const base = process.env.APP_URL || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}${FRONTEND_RETURN_PATH}${suffix}`;
}

function readRawCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const sep = trimmed.indexOf('=');
    if (sep < 0) continue;
    if (trimmed.slice(0, sep) === name) {
      return decodeURIComponent(trimmed.slice(sep + 1));
    }
  }
  return null;
}

router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    if (!isCalendarSyncEnabled()) {
      res.json({ available: false, connected: false });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { googleCalendarRefreshToken: true, googleCalendarConnectedAt: true },
    });
    res.json({
      available: true,
      connected: Boolean(user?.googleCalendarRefreshToken),
      connectedAt: user?.googleCalendarConnectedAt || null,
    });
  } catch (err) {
    console.error('GET /auth/google-calendar/status failed', err);
    res.status(500).json({ error: 'Erro ao consultar status do Google Calendar' });
  }
});

router.get('/connect', authenticate, async (req: Request, res: Response) => {
  try {
    if (!isCalendarSyncEnabled()) {
      res.status(503).json({ error: 'Integracao com Google Calendar nao configurada no servidor' });
      return;
    }

    // Assina state com user.id pra evitar troca de identidade entre clique e callback
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = `${req.user!.userId}.${nonce}`;

    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE_MS,
      path: '/',
    });

    const url = buildAuthorizationUrl(state);
    res.json({ url });
  } catch (err) {
    console.error('GET /auth/google-calendar/connect failed', err);
    res.status(500).json({ error: 'Erro ao iniciar conexao com Google Calendar' });
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

    res.clearCookie(STATE_COOKIE, { path: '/' });

    if (error || !code || !state) {
      res.redirect(frontendUrl('error'));
      return;
    }

    const cookieState = readRawCookie(req, STATE_COOKIE);
    if (!cookieState || cookieState !== state) {
      res.redirect(frontendUrl('error'));
      return;
    }

    const [userId] = state.split('.');
    if (!userId) {
      res.redirect(frontendUrl('error'));
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      res.redirect(frontendUrl('error'));
      return;
    }

    const refreshToken = await exchangeCodeForRefreshToken(code);
    if (!refreshToken) {
      // Ja estava conectado antes e revogou o consent: usuario precisa
      // remover o app em myaccount.google.com/permissions e tentar de novo
      res.redirect(frontendUrl('no_refresh'));
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarRefreshToken: refreshToken,
        googleCalendarConnectedAt: new Date(),
      },
    });

    await logAudit({
      userId: user.id,
      companyId: user.companyId,
      action: 'CONNECT_GOOGLE_CALENDAR',
      entity: 'user',
      entityId: user.id,
    });

    res.redirect(frontendUrl('connected'));
  } catch (err) {
    console.error('GET /auth/google-calendar/callback failed', err);
    res.redirect(frontendUrl('error'));
  }
});

router.post('/disconnect', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { googleCalendarRefreshToken: true },
    });

    if (user?.googleCalendarRefreshToken) {
      await revokeRefreshToken(user.googleCalendarRefreshToken);
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        googleCalendarRefreshToken: null,
        googleCalendarConnectedAt: null,
      },
    });

    await logAudit({
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      action: 'DISCONNECT_GOOGLE_CALENDAR',
      entity: 'user',
      entityId: req.user!.userId,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /auth/google-calendar/disconnect failed', err);
    res.status(500).json({ error: 'Erro ao desconectar Google Calendar' });
  }
});

export default router;
