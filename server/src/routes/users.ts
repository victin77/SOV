import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { firstString } from '../utils/request';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';
import { createUserSchema, updateUserSchema, validateBody } from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

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

    const hashedPassword = await bcrypt.hash(password, 12);
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
      select: { id: true },
    });
    if (!scopedUser) {
      res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
      return;
    }

    const parsed = validateBody(updateUserSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { name, email, role, phone, whatsappNumber, active, password } = parsed.data;

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
      select: { id: true, name: true, email: true },
    });
    if (!scopedUser) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Limpar relações antes de excluir
    await prisma.lead.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } });
    await prisma.appointment.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });

    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'Usuário excluído permanentemente' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

export default router;
