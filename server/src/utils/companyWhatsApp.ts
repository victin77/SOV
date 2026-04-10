import type { PrismaClient } from '@prisma/client';
import { decryptSecret } from './secrets';

export type ResolvedWhatsAppConfig = {
  provider: 'company_config' | 'env_fallback' | 'link_only';
  configured: boolean;
  apiToken: string | null;
  phoneNumberId: string | null;
  webhookVerifyToken: string | null;
  appSecret: string | null;
  apiVersion: string;
};

const ENV_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

function resolveEnvFallbackConfig(): ResolvedWhatsAppConfig {
  const apiToken = process.env.WHATSAPP_API_TOKEN || null;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.VERIFY_TOKEN || null;
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.APP_SECRET || null;
  const configured = Boolean(apiToken && phoneNumberId);

  return {
    provider: configured ? 'env_fallback' : 'link_only',
    configured,
    apiToken,
    phoneNumberId,
    webhookVerifyToken,
    appSecret,
    apiVersion: ENV_API_VERSION,
  };
}

export async function resolveCompanyWhatsAppConfig(prisma: PrismaClient, companyId?: string | null): Promise<ResolvedWhatsAppConfig> {
  if (companyId) {
    const config = await prisma.companyWhatsAppConfig.findUnique({
      where: { companyId },
    });

    if (config?.enabled) {
      const apiToken = decryptSecret(config.apiTokenEncrypted);
      const webhookVerifyToken = decryptSecret(config.webhookVerifyTokenEncrypted);
      const appSecret = decryptSecret(config.appSecretEncrypted);
      const phoneNumberId = config.phoneNumberId || null;
      const configured = Boolean(apiToken && phoneNumberId);

      if (configured) {
        return {
          provider: 'company_config',
          configured,
          apiToken,
          phoneNumberId,
          webhookVerifyToken,
          appSecret,
          apiVersion: config.apiVersion || ENV_API_VERSION,
        };
      }
    }
  }

  return resolveEnvFallbackConfig();
}

export async function resolveCompanyIdByWebhookToken(prisma: PrismaClient, token?: string | null) {
  if (!token) return null;

  const configs = await prisma.companyWhatsAppConfig.findMany({
    where: {
      enabled: true,
      webhookVerifyTokenEncrypted: { not: null },
    },
    select: {
      companyId: true,
      webhookVerifyTokenEncrypted: true,
    },
  });

  const companyMatch = configs.find((config) => decryptSecret(config.webhookVerifyTokenEncrypted) === token);
  if (companyMatch) return companyMatch.companyId;

  return null;
}

export async function resolveCompanyIdByPhoneNumberId(prisma: PrismaClient, phoneNumberId?: string | null) {
  if (!phoneNumberId) return null;

  const config = await prisma.companyWhatsAppConfig.findFirst({
    where: {
      enabled: true,
      phoneNumberId,
    },
    select: { companyId: true },
  });

  return config?.companyId || null;
}
