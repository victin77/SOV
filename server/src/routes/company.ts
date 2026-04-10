import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { encryptSecret } from '../utils/secrets';
import { logAudit } from '../utils/audit';
import { getCompanyIdFromRequest } from '../utils/tenancy';
import { resolveCompanyWhatsAppConfig } from '../utils/companyWhatsApp';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

router.get('/current', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    const [company, resolvedConfig, storedConfig] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
      }),
      resolveCompanyWhatsAppConfig(prisma, companyId),
      prisma.companyWhatsAppConfig.findUnique({
        where: { companyId },
        select: {
          enabled: true,
          phoneNumberId: true,
          apiVersion: true,
          apiTokenEncrypted: true,
          webhookVerifyTokenEncrypted: true,
          appSecretEncrypted: true,
          updatedAt: true,
        },
      }),
    ]);

    if (!company) {
      res.status(404).json({ error: 'Empresa nÃ£o encontrada' });
      return;
    }

    res.json({
      company,
      whatsappConfig: {
        provider: resolvedConfig.provider,
        configured: resolvedConfig.configured,
        enabled: storedConfig?.enabled ?? false,
        phoneNumberId: storedConfig?.phoneNumberId || '',
        apiVersion: storedConfig?.apiVersion || 'v22.0',
        tokenConfigured: Boolean(storedConfig?.apiTokenEncrypted),
        verifyTokenConfigured: Boolean(storedConfig?.webhookVerifyTokenEncrypted),
        appSecretConfigured: Boolean(storedConfig?.appSecretEncrypted),
        updatedAt: storedConfig?.updatedAt || null,
        webhookPath: '/api/whatsapp/webhook',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar configuraÃ§Ãµes da empresa' });
  }
});

router.put('/current', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    const { name } = req.body as { name?: string };
    const normalizedName = String(name || '').trim();

    if (!normalizedName) {
      res.status(400).json({ error: 'Nome da empresa Ã© obrigatÃ³rio' });
      return;
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: { name: normalizedName },
      select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
    });

    await logAudit({
      userId: req.user!.userId,
      companyId,
      action: 'UPDATE_COMPANY',
      entity: 'company',
      entityId: companyId,
      details: { name: normalizedName },
    });

    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

router.put('/current/whatsapp', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    const {
      enabled,
      phoneNumberId,
      apiVersion,
      apiToken,
      webhookVerifyToken,
      appSecret,
    } = req.body as {
      enabled?: boolean;
      phoneNumberId?: string;
      apiVersion?: string;
      apiToken?: string;
      webhookVerifyToken?: string;
      appSecret?: string;
    };

    const existing = await prisma.companyWhatsAppConfig.findUnique({
      where: { companyId },
    });

    const updated = await prisma.companyWhatsAppConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        enabled: toBoolean(enabled, false),
        phoneNumberId: String(phoneNumberId || '').trim() || null,
        apiVersion: String(apiVersion || 'v22.0').trim() || 'v22.0',
        apiTokenEncrypted: encryptSecret(apiToken?.trim()) || null,
        webhookVerifyTokenEncrypted: encryptSecret(webhookVerifyToken?.trim()) || null,
        appSecretEncrypted: encryptSecret(appSecret?.trim()) || null,
      },
      update: {
        enabled: toBoolean(enabled, existing?.enabled ?? false),
        phoneNumberId: phoneNumberId !== undefined ? String(phoneNumberId || '').trim() || null : undefined,
        apiVersion: apiVersion !== undefined ? String(apiVersion || 'v22.0').trim() || 'v22.0' : undefined,
        apiTokenEncrypted: apiToken !== undefined ? encryptSecret(apiToken.trim()) || null : undefined,
        webhookVerifyTokenEncrypted: webhookVerifyToken !== undefined ? encryptSecret(webhookVerifyToken.trim()) || null : undefined,
        appSecretEncrypted: appSecret !== undefined ? encryptSecret(appSecret.trim()) || null : undefined,
      },
      select: {
        enabled: true,
        phoneNumberId: true,
        apiVersion: true,
        apiTokenEncrypted: true,
        webhookVerifyTokenEncrypted: true,
        appSecretEncrypted: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: req.user!.userId,
      companyId,
      action: 'UPDATE_COMPANY_WHATSAPP',
      entity: 'company_whatsapp_config',
      entityId: companyId,
      details: {
        enabled: updated.enabled,
        phoneNumberId: updated.phoneNumberId,
        apiVersion: updated.apiVersion,
      },
    });

    res.json({
      provider: updated.enabled ? 'company_config' : 'link_only',
      configured: Boolean(updated.enabled && updated.phoneNumberId && updated.apiTokenEncrypted),
      enabled: updated.enabled,
      phoneNumberId: updated.phoneNumberId || '',
      apiVersion: updated.apiVersion,
      tokenConfigured: Boolean(updated.apiTokenEncrypted),
      verifyTokenConfigured: Boolean(updated.webhookVerifyTokenEncrypted),
      appSecretConfigured: Boolean(updated.appSecretEncrypted),
      updatedAt: updated.updatedAt,
      webhookPath: '/api/whatsapp/webhook',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar integraÃ§Ã£o do WhatsApp' });
  }
});

export default router;
