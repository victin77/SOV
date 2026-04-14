import type { PrismaClient } from '@prisma/client';

const DEFAULT_COMPANY_NAME = process.env.DEFAULT_COMPANY_NAME || 'Empresa principal';
const DEFAULT_COMPANY_SLUG = process.env.DEFAULT_COMPANY_SLUG || 'empresa-principal';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'empresa';
}

export function getCompanyIdFromRequest(req: Express.Request) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    throw new Error('Usuario sem empresa vinculada.');
  }

  return companyId;
}

export function companyWhere(req: Express.Request) {
  return { companyId: getCompanyIdFromRequest(req) };
}

export async function ensureDefaultCompanyAndBackfill(prisma: PrismaClient) {
  const slug = slugify(DEFAULT_COMPANY_SLUG);
  const company = await prisma.company.upsert({
    where: { slug },
    update: {},
    create: {
      name: DEFAULT_COMPANY_NAME,
      slug,
    },
  });

  await Promise.all([
    prisma.user.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
    prisma.lead.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
    prisma.pipelineStage.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
    prisma.tag.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
    prisma.appointment.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
    prisma.activity.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
    prisma.notification.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
    prisma.auditLog.updateMany({ where: { companyId: null }, data: { companyId: company.id } }),
  ]);

  return company;
}

export async function resolveCaptureCompany(prisma: PrismaClient, companySlug?: string | null) {
  const normalizedSlug = companySlug ? slugify(companySlug) : null;

  if (!normalizedSlug) {
    return null;
  }

  if (normalizedSlug) {
    const company = await prisma.company.findFirst({ where: { slug: normalizedSlug, active: true } });
    if (company) return company;
  }

  return null;
}
