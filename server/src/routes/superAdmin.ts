import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorizeSuperAdmin, generateImpersonationToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorizeSuperAdmin());

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'empresa';
}

// Dashboard overview
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [companies, totalUsers, totalLeads] = await Promise.all([
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          createdAt: true,
          _count: {
            select: { users: true, leads: true, pipelineStages: true, activities: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.count(),
      prisma.lead.count(),
    ]);

    res.json({
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.active).length,
      totalUsers,
      totalLeads,
      companies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// List companies with details
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true, leads: true, pipelineStages: true, tags: true, appointments: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(companies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

// Get single company details
router.get('/companies/:id', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id as string },
      include: {
        _count: {
          select: { users: true, leads: true, pipelineStages: true, tags: true, appointments: true, activities: true },
        },
        users: {
          select: { id: true, name: true, email: true, role: true, active: true, lastSeenAt: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada' });
      return;
    }

    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar empresa' });
  }
});

// Create company + first admin user
router.post('/companies', async (req: Request, res: Response) => {
  try {
    const { name, adminName, adminEmail, adminPassword } = req.body as {
      name?: string;
      adminName?: string;
      adminEmail?: string;
      adminPassword?: string;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: 'Nome da empresa é obrigatório' });
      return;
    }
    if (!adminEmail?.trim() || !adminPassword?.trim() || !adminName?.trim()) {
      res.status(400).json({ error: 'Dados do administrador são obrigatórios (nome, email, senha)' });
      return;
    }

    const slug = slugify(name);
    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    if (existingSlug) {
      res.status(400).json({ error: 'Já existe uma empresa com esse nome/slug' });
      return;
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingEmail) {
      res.status(400).json({ error: 'Email do administrador já está em uso' });
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        slug,
        users: {
          create: {
            name: adminName.trim(),
            email: adminEmail.trim().toLowerCase(),
            password: hashedPassword,
            role: 'ADMIN',
          },
        },
        pipelineStages: {
          createMany: {
            data: [
              { name: 'Novo', color: '#3b82f6', order: 1, isDefault: true },
              { name: 'Contato', color: '#06b6d4', order: 2 },
              { name: 'Qualificação', color: '#8b5cf6', order: 3 },
              { name: 'Proposta', color: '#f59e0b', order: 4 },
              { name: 'Negociação', color: '#f97316', order: 5 },
              { name: 'Fechamento', color: '#22c55e', order: 6 },
            ],
          },
        },
      },
      include: {
        _count: { select: { users: true, leads: true } },
        users: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'CREATE_COMPANY',
      entity: 'company',
      entityId: company.id,
      details: { name: company.name, slug: company.slug, adminEmail },
    });

    res.status(201).json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

// Update company
router.put('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { name, active } = req.body as { name?: string; active?: boolean };

    const company = await prisma.company.findUnique({ where: { id: req.params.id as string } });
    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (active !== undefined) data.active = active;

    const updated = await prisma.company.update({
      where: { id: req.params.id as string },
      data,
      include: {
        _count: { select: { users: true, leads: true } },
      },
    });

    await logAudit({
      userId: req.user!.userId,
      action: active === false ? 'DEACTIVATE_COMPANY' : 'UPDATE_COMPANY',
      entity: 'company',
      entityId: updated.id,
      details: data,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

// Delete company permanently
router.delete('/companies/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id as string;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada' });
      return;
    }

    // Limpar todas as relações antes de excluir a empresa
    // 1. Dados ligados a leads (cascateiam do lead, mas appointments tem userId obrigatório)
    await prisma.appointment.deleteMany({ where: { companyId } });
    await prisma.activity.deleteMany({ where: { companyId } });
    await prisma.notification.deleteMany({ where: { companyId } });
    await prisma.auditLog.deleteMany({ where: { companyId } });

    // 2. Leads (LeadTag, LeadCustomField, Activity cascateiam automaticamente)
    await prisma.lead.deleteMany({ where: { companyId } });

    // 3. Tags e pipeline stages
    await prisma.tag.deleteMany({ where: { companyId } });
    await prisma.pipelineStage.deleteMany({ where: { companyId } });

    // 4. Refresh tokens dos usuarios da empresa
    const userIds = (await prisma.user.findMany({ where: { companyId }, select: { id: true } })).map(u => u.id);
    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    }

    // 5. Usuarios da empresa
    await prisma.user.deleteMany({ where: { companyId } });

    // 6. WhatsApp config (cascade, mas por segurança)
    await prisma.companyWhatsAppConfig.deleteMany({ where: { companyId } });

    // 7. Finalmente, a empresa
    await prisma.company.delete({ where: { id: companyId } });

    await logAudit({
      userId: req.user!.userId,
      action: 'DELETE_COMPANY',
      entity: 'company',
      entityId: companyId,
      details: { companyName: company.name, companySlug: company.slug },
    });

    res.json({ message: 'Empresa excluída permanentemente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir empresa' });
  }
});

// Company metrics
router.get('/companies/:id/metrics', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id as string;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada' });
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLeads, leadsThisMonth, wonThisMonth, totalUsers, activeUsers, totalActivities] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({ where: { companyId, createdAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { companyId, status: 'WON', wonDate: { gte: startOfMonth } } }),
      prisma.user.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId, active: true } }),
      prisma.activity.count({ where: { companyId } }),
    ]);

    res.json({
      totalLeads,
      leadsThisMonth,
      wonThisMonth,
      totalUsers,
      activeUsers,
      totalActivities,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar métricas' });
  }
});

// Create user for a company
router.post('/companies/:id/users', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id as string;
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres, com pelo menos 1 letra e 1 número' });
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      res.status(400).json({ error: 'Senha deve conter pelo menos 1 letra e 1 número' });
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      res.status(400).json({ error: 'Email já está em uso' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: (['ADMIN', 'MANAGER', 'SELLER'].includes(role || '') ? role : 'SELLER') as any,
        companyId,
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'CREATE_USER_FOR_COMPANY',
      entity: 'user',
      entityId: user.id,
      details: { companyId, companyName: company.name, userName: user.name, userEmail: user.email },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Toggle user active status
router.put('/companies/:id/users/:userId', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id as string;
    const userId = req.params.userId as string;
    const { active, role } = req.body as { active?: boolean; role?: string };

    const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado nesta empresa' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (active !== undefined) data.active = active;
    if (role && ['ADMIN', 'MANAGER', 'SELLER'].includes(role)) data.role = role;

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, lastSeenAt: true, createdAt: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Delete user from company
router.delete('/companies/:id/users/:userId', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id as string;
    const userId = req.params.userId as string;

    if (userId === req.user!.userId) {
      res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado nesta empresa' });
      return;
    }

    // Limpar relações antes de excluir
    await prisma.lead.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } });
    await prisma.appointment.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });

    await prisma.user.delete({ where: { id: userId } });

    await logAudit({
      userId: req.user!.userId,
      action: 'DELETE_USER',
      entity: 'user',
      entityId: userId,
      details: { companyId, userName: user.name, userEmail: user.email },
    });

    res.json({ message: 'Usuário excluído permanentemente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Impersonate: enter a company's system
router.post('/impersonate/:companyId', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.companyId as string } });
    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada' });
      return;
    }

    // Generate a token that gives the super admin access to this company
    const token = generateImpersonationToken({
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'SUPER_ADMIN',
      companyId: company.id,
      impersonating: true,
      originalUserId: req.user!.originalUserId || req.user!.userId,
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'IMPERSONATE_COMPANY',
      entity: 'company',
      entityId: company.id,
      details: { companyName: company.name },
    });

    res.json({
      token,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao entrar na empresa' });
  }
});

export default router;
