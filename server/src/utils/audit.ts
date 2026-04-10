import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAudit(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  companyId?: string | null;
  details?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    let companyId = params.companyId;
    if (companyId === undefined) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { companyId: true },
      });
      companyId = user?.companyId || null;
    }

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as any,
        ip: params.ip,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
