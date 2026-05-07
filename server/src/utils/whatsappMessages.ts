import type { Prisma, PrismaClient } from '@prisma/client';
import { logAudit } from './audit';
import { getNextPipelinePosition, getDefaultStage } from './pipeline';
import { buildWhatsAppLink, isWhatsAppCloudConfigured, normalizePhoneNumber, sendWhatsAppCloudMessage } from './whatsapp';
import { resolveCompanyWhatsAppConfig } from './companyWhatsApp';
import { resolveQrSessionForUser, sendViaQrSession } from './whatsappQr';

const WHATSAPP_ACTIVITY_TYPES = ['WHATSAPP_SENT', 'WHATSAPP_RECEIVED'] as const;

type WhatsAppActivityType = typeof WHATSAPP_ACTIVITY_TYPES[number];

function asRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Prisma.JsonValue> : {};
}

function asString(value: Prisma.JsonValue | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function asNullableString(value: Prisma.JsonValue | undefined) {
  return typeof value === 'string' ? value : null;
}

function previewMessage(message: string) {
  return message.trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function mapWhatsAppActivity(activity: {
  id: string;
  type: string;
  description: string;
  createdAt: Date;
  metadata: Prisma.JsonValue | null;
}) {
  const metadata = asRecord(activity.metadata);
  const direction = asString(metadata.direction) || (activity.type === 'WHATSAPP_RECEIVED' ? 'inbound' : 'outbound');

  return {
    id: activity.id,
    type: activity.type as WhatsAppActivityType,
    direction,
    text: asString(metadata.message) || activity.description,
    phone: asNullableString(metadata.phone),
    provider: asNullableString(metadata.provider),
    link: asNullableString(metadata.link),
    createdAt: activity.createdAt,
  };
}

export async function sendLeadWhatsAppMessage(
  prisma: PrismaClient,
  params: {
    leadId: string;
    userId: string;
    message: string;
  },
) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    select: { id: true, name: true, phone: true, companyId: true },
  });

  if (!lead) {
    throw new Error('Lead não encontrado');
  }

  const normalizedPhone = normalizePhoneNumber(lead.phone);
  if (!normalizedPhone) {
    throw new Error('Lead não possui telefone válido para WhatsApp');
  }

  const resolvedConfig = await resolveCompanyWhatsAppConfig(prisma, lead.companyId);
  let provider: 'company_config' | 'env_fallback' | 'link_only' | 'qr' = resolvedConfig.provider;
  let providerResponse: unknown = null;

  const qrSession = lead.companyId ? await resolveQrSessionForUser(params.userId, lead.companyId) : null;

  if (qrSession) {
    providerResponse = await sendViaQrSession(qrSession.id, normalizedPhone, params.message);
    provider = 'qr';
  } else if (isWhatsAppCloudConfigured(resolvedConfig)) {
    providerResponse = await sendWhatsAppCloudMessage({
      to: normalizedPhone,
      message: params.message,
      apiToken: resolvedConfig.apiToken,
      phoneNumberId: resolvedConfig.phoneNumberId,
      apiVersion: resolvedConfig.apiVersion,
    });
  }

  const link = buildWhatsAppLink(normalizedPhone, params.message);

  const activity = await prisma.activity.create({
    data: {
      type: 'WHATSAPP_SENT',
      description: `Mensagem de WhatsApp enviada para ${lead.name}`,
      leadId: lead.id,
      companyId: lead.companyId,
      metadata: {
        direction: 'outbound',
        provider,
        message: params.message,
        preview: previewMessage(params.message),
        phone: normalizedPhone,
        link,
      },
    },
  });

  await logAudit({
    userId: params.userId,
    companyId: lead.companyId,
    action: 'SEND_WHATSAPP',
    entity: 'lead',
    entityId: lead.id,
    details: {
      provider,
      phone: normalizedPhone,
    },
  });

  return {
    activity,
    lead,
    provider,
    providerResponse,
    link,
  };
}

export async function findLeadByPhone(
  prisma: PrismaClient,
  phone: string,
  companyId?: string | null,
) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return null;

  // Filtro grosso no SQL pelos últimos 4 dígitos (sempre ficam juntos
  // mesmo em telefones formatados tipo "(11) 98765-4321"); depois match
  // exato em memória comparando o telefone normalizado, o que cobre
  // diferenças de máscara, prefixo 55, espaços, parênteses, hífens etc.
  const tail = normalized.slice(-4);
  const candidates = await prisma.lead.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      phone: { not: null, contains: tail },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      assignedToId: true,
      companyId: true,
      status: true,
      stageId: true,
    },
    take: 200,
  });

  return candidates.find((c) => normalizePhoneNumber(c.phone) === normalized) || null;
}

export async function ingestInboundWhatsAppMessage(
  prisma: PrismaClient,
  params: {
    from: string;
    message: string;
    contactName?: string;
    companyId?: string | null;
    provider?: string;
  },
) {
  const normalizedFrom = normalizePhoneNumber(params.from);
  if (!normalizedFrom) return null;

  const lead = await findLeadByPhone(prisma, params.from, params.companyId);

  // Se não achou lead, guarda como mensagem pendente — o usuário decide
  // se quer promover a lead na UI do inbox.
  if (!lead) {
    if (!params.companyId) return null;
    const pending = await prisma.whatsAppPendingMessage.create({
      data: {
        fromNumber: normalizedFrom,
        contactName: params.contactName,
        message: params.message,
        provider: params.provider || 'cloud_api',
        companyId: params.companyId,
      },
    });
    return { pending };
  }

  const activity = await prisma.activity.create({
    data: {
      type: 'WHATSAPP_RECEIVED',
      description: `Mensagem recebida de ${lead.name}`,
      leadId: lead.id,
      companyId: lead.companyId,
      metadata: {
        direction: 'inbound',
        provider: params.provider || 'cloud_api',
        message: params.message,
        preview: previewMessage(params.message),
        phone: normalizedFrom,
      },
    },
  });

  if (lead.assignedToId) {
    await prisma.notification.create({
      data: {
        userId: lead.assignedToId,
        companyId: lead.companyId,
        title: 'Nova mensagem no WhatsApp',
        message: `${lead.name}: ${previewMessage(params.message)}`,
        type: 'whatsapp',
        link: `/whatsapp?leadId=${lead.id}`,
      },
    });
  }

  return { lead, activity };
}

export async function promoteWhatsAppPendingToLead(
  prisma: PrismaClient,
  params: {
    fromNumber: string;
    companyId: string;
    leadName?: string;
    assignedToId?: string;
  },
) {
  const normalized = normalizePhoneNumber(params.fromNumber);
  if (!normalized) {
    throw new Error('Telefone inválido');
  }

  // Busca todas as mensagens pendentes desse número na empresa
  const pendingMessages = await prisma.whatsAppPendingMessage.findMany({
    where: { companyId: params.companyId, fromNumber: normalized },
    orderBy: { createdAt: 'asc' },
  });

  if (pendingMessages.length === 0) {
    throw new Error('Nenhuma mensagem pendente desse número');
  }

  // Cria o lead com nome do contato (ou nome inventado) e telefone normalizado
  const stages = await prisma.pipelineStage.findMany({
    where: { companyId: params.companyId },
    orderBy: { order: 'asc' },
  });
  const defaultStage = getDefaultStage(stages);
  const pipelinePosition = await getNextPipelinePosition(prisma, defaultStage?.id);

  const fallbackContact = pendingMessages.find((m) => m.contactName)?.contactName;
  const leadName = (params.leadName?.trim() || fallbackContact || `WhatsApp ${normalized.slice(-4)}`).trim();

  const lead = await prisma.lead.create({
    data: {
      name: leadName,
      phone: normalized,
      companyId: params.companyId,
      assignedToId: params.assignedToId,
      source: 'whatsapp-inbound',
      status: 'NEW',
      stageId: defaultStage?.id,
      pipelinePosition,
    },
  });

  // Move mensagens pendentes pra Activity vinculada ao lead novo
  await prisma.$transaction([
    prisma.activity.createMany({
      data: pendingMessages.map((m) => ({
        type: 'WHATSAPP_RECEIVED',
        description: `Mensagem recebida de ${lead.name}`,
        leadId: lead.id,
        companyId: params.companyId,
        createdAt: m.createdAt,
        metadata: {
          direction: 'inbound',
          provider: m.provider,
          message: m.message,
          preview: previewMessage(m.message),
          phone: normalized,
        },
      })),
    }),
    prisma.whatsAppPendingMessage.deleteMany({
      where: { companyId: params.companyId, fromNumber: normalized },
    }),
  ]);

  return { lead, movedCount: pendingMessages.length };
}
