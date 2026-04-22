import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { firstString } from '../utils/request';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';
import { createUserSchema, updateUserSchema, validateBody } from '../utils/validation';
import { sendTemporaryPasswordEmail } from '../utils/email';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: companyWhere(req),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        whatsappNumber: true,
        active: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { leads: true, appointments: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

router.post('/', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const parsed = validateBody(createUserSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { email, password, name, role, phone, whatsappNumber } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email já cadastrado' });
      return;
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'SELLER',
        phone,
        whatsappNumber,
        companyId: getCompanyIdFromRequest(req),
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        whatsappNumber: true,
        active: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    await logAudit({
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      action: 'CREATE_USER',
      entity: 'user',
      entityId: user.id,
      details: { email, name, role },
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = firstString(req.params.id);
    if (!userId) {
      res.status(400).json({ error: 'Usuário inválido' });
      return;
    }

    const scopedUser = await prisma.user.findFirst({
      where: { id: userId, ...companyWhere(req) },
      select: { id: true, role: true, companyId: true },
    });
    if (!scopedUser) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }

    const parsed = validateBody(updateUserSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { name, email, role, phone, whatsappNumber, active, password } = parsed.data;

    if (
      scopedUser.role === 'ADMIN'
      && scopedUser.companyId
      && ((role !== undefined && role !== 'ADMIN') || active === false)
    ) {
      const adminCount = await prisma.user.count({
        where: { companyId: scopedUser.companyId, role: 'ADMIN', active: true },
      });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Nao e possivel remover o unico administrador ativo da empresa' });
        return;
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (phone !== undefined) data.phone = phone;
    if (whatsappNumber !== undefined) data.whatsappNumber = whatsappNumber;
    if (active !== undefined) data.active = active;
    if (password) data.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        whatsappNumber: true,
        active: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    await logAudit({
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      action: 'UPDATE_USER',
      entity: 'user',
      entityId: user.id,
      details: data as Record<string, unknown>,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.post('/:id/reset-password', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = firstString(req.params.id);
    if (!userId) {
      res.status(400).json({ error: 'Usuário inválido' });
      return;
    }

    if (userId === req.user!.userId) {
      res.status(400).json({ error: 'Use a tela de perfil para alterar sua propria senha.' });
      return;
    }

    const isSuperAdmin = req.user!.role === 'SUPER_ADMIN';
    const targetUser = isSuperAdmin
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, companyId: true, role: true, active: true },
        })
      : await prisma.user.findFirst({
          where: { id: userId, ...companyWhere(req) },
          select: { id: true, email: true, name: true, companyId: true, role: true, active: true },
        });

    if (!targetUser) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }

    // Admin comum nao pode resetar outro ADMIN nem SUPER_ADMIN
    if (!isSuperAdmin && (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN')) {
      res.status(403).json({ error: 'Voce nao pode redefinir a senha de outro administrador.' });
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUser.id },
        data: { password: hashedPassword, mustChangePassword: true },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: targetUser.id } }),
      prisma.passwordResetToken.updateMany({
        where: { userId: targetUser.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    const emailSent = await sendTemporaryPasswordEmail({
      to: targetUser.email,
      name: targetUser.name,
      temporaryPassword,
    });

    await logAudit({
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      action: 'ADMIN_RESET_PASSWORD',
      entity: 'user',
      entityId: targetUser.id,
      details: { emailSent, targetEmail: targetUser.email },
      ip: firstString(req.ip),
    });

    res.json({
      message: 'Senha temporaria gerada. O usuario sera forcado a troca-la no proximo login.',
      temporaryPassword,
      emailSent,
    });
  } catch (err) {
    console.error('POST /users/:id/reset-password failed', err);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = firstString(req.params.id);
    if (!userId) {
      res.status(400).json({ error: 'Usuário inválido' });
      return;
    }

    if (userId === req.user!.userId) {
      res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
      return;
    }

    const scopedUser = await prisma.user.findFirst({
      where: { id: userId, ...companyWhere(req) },
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });
    if (!scopedUser) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }

    // Proteger contra deletar ultimo ADMIN da empresa
    if (scopedUser.role === 'ADMIN' && scopedUser.companyId) {
      const adminCount = await prisma.user.count({
        where: { companyId: scopedUser.companyId, role: 'ADMIN', active: true },
      });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Nao e possivel excluir o unico administrador da empresa' });
        return;
      }
    }

    // Limpar relacoes antes de excluir
    await prisma.lead.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } });
    await prisma.appointment.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });

    // Audit log ANTES de deletar os logs do usuario
    await logAudit({
      userId: req.user!.userId,
      companyId: req.user!.companyId,
      action: 'DELETE_USER',
      entity: 'user',
      entityId: userId,
      details: { name: scopedUser.name, email: scopedUser.email, role: scopedUser.role },
    });

    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'Usuario excluido permanentemente' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

function generateTemporaryPassword(): string {
  // 10 chars aleatorios + garantia de 1 letra e 1 numero
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars[crypto.randomInt(chars.length)];
  }
  return pass + 'a1';
}

export default router;
