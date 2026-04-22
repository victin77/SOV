import type { PrismaClient } from '@prisma/client';

export function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return getSuperAdminEmails().includes(normalized);
}

export async function ensureSuperAdmin(prisma: PrismaClient) {
  const emails = getSuperAdminEmails();

  if (emails.length === 0) {
    console.warn('SUPER_ADMIN_EMAILS nao definido. Nenhum super admin autorizado ainda.');
    return;
  }

  const existing = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (existing) {
    console.log(`Super admin ja existe: ${existing.email}`);
    return;
  }

  console.log(`Super admin whitelist: ${emails.join(', ')}`);
  console.log('Nenhum super admin criado ainda - sera criado automaticamente no primeiro login via Google desses emails.');
}
