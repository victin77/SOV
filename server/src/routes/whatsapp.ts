import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { firstString } from '../utils/request';
import { normalizePhoneNumber } from '../utils/whatsapp';
import { ingestInboundWhatsAppMessage, mapWhatsAppActivity, sendLeadWhatsAppMessage } from '../utils/whatsappMessages';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';
import {
  resolveCompanyIdByPhoneNumberId,
  resolveCompanyIdByWebhookToken,
  resolveCompanyWhatsAppConfig,
} from '../utils/companyWhatsApp';

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

export default router;
