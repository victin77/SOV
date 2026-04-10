import type { Prisma, PrismaClient } from '@prisma/client';
import { logAudit } from './audit';
import { getNextPipelinePosition, getDefaultStage } from './pipeline';
import { buildWhatsAppLink, isWhatsAppCloudConfigured, normalizePhoneNumber, sendWhatsAppCloudMessage } from './whatsapp';
import { resolveCompanyWhatsAppConfig } from './companyWhatsApp';

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
  let provider: 'company_config' | 'env_fallback' | 'link_only' = resolvedConfig.provider;
  let providerResponse: unknown = null;

  if (isWhatsAppCloudConfigured(resolvedConfig)) {
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

  const phoneTail = normalizedFrom.slice(-8);
  const possibleLeads = await prisma.lead.findMany({
    where: {
      ...(params.companyId ? { companyId: params.companyId } : {}),
      phone: { not: null, contains: phoneTail },
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
    take: 50,
  });

  let lead = possibleLeads.find((item) => normalizePhoneNumber(item.phone) === normalizedFrom) || null;

  if (!lead) {
    const stages = await prisma.pipelineStage.findMany({
      where: params.companyId ? { companyId: params.companyId } : undefined,
      orderBy: { order: 'asc' },
    });
    const defaultStage = getDefaultStage(stages);
    const pipelinePosition = await getNextPipelinePosition(prisma, defaultStage?.id);

    lead = await prisma.lead.create({
      data: {
        name: params.contactName || `WhatsApp ${normalizedFrom.slice(-4)}`,
        phone: normalizedFrom,
        companyId: params.companyId || null,
        source: 'whatsapp-inbound',
        status: 'NEW',
        stageId: defaultStage?.id,
        pipelinePosition,
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
    });
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
