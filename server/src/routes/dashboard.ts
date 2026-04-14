import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { companyWhere } from '../utils/tenancy';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userFilter: any = { ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      userFilter.assignedToId = req.user!.userId;
    } else if (req.query.userId) {
      userFilter.assignedToId = req.query.userId;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalLeads,
      newLeadsThisMonth,
      newLeadsLastMonth,
      wonThisMonth,
      wonLastMonth,
      lostThisMonth,
      leadsByStatus,
      leadsBySource,
      leadsByPriority,
      topSellers,
      recentActivities,
      upcomingAppointments,
      pipelineValue,
      wonValue,
    ] = await Promise.all([
      prisma.lead.count({ where: userFilter }),
      prisma.lead.count({ where: { ...userFilter, createdAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { ...userFilter, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.lead.count({ where: { ...userFilter, status: 'WON', wonDate: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { ...userFilter, status: 'WON', wonDate: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.lead.count({ where: { ...userFilter, status: 'LOST', lostDate: { gte: startOfMonth } } }),
      prisma.lead.groupBy({ by: ['status'], where: userFilter, _count: true }),
      prisma.lead.groupBy({ by: ['source'], where: { ...userFilter, source: { not: null } }, _count: true }),
      prisma.lead.groupBy({ by: ['priority'], where: userFilter, _count: true }),
      prisma.user.findMany({
        where: { role: { in: ['SELLER', 'MANAGER'] }, active: true, ...companyWhere(req) },
        select: {
          id: true, name: true, avatar: true, lastSeenAt: true,
          _count: { select: { leads: true } },
          leads: { where: { status: 'WON', wonDate: { gte: startOfMonth } }, select: { value: true } },
        },
        take: 10,
      }),
      prisma.activity.findMany({
        where: companyWhere(req),
        include: { lead: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.appointment.findMany({
        where: {
          ...companyWhere(req),
          ...(req.user!.role === 'SELLER' ? { userId: req.user!.userId } : {}),
          startDate: { gte: now },
          completed: false,
        },
        include: { lead: { select: { id: true, name: true, company: true } }, user: { select: { name: true } } },
        orderBy: { startDate: 'asc' },
        take: 10,
      }),
      prisma.lead.aggregate({ where: { ...userFilter, status: { notIn: ['WON', 'LOST'] } }, _sum: { value: true } }),
      prisma.lead.aggregate({ where: { ...userFilter, status: 'WON', wonDate: { gte: startOfMonth } }, _sum: { value: true } }),
    ]);

    const conversionRate = totalLeads > 0
      ? ((wonThisMonth / Math.max(newLeadsThisMonth, 1)) * 100).toFixed(1)
      : '0';

    const topSellersFormatted = topSellers.map(s => ({
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      lastSeenAt: s.lastSeenAt,
      totalLeads: s._count.leads,
      wonThisMonth: s.leads.length,
      wonValue: s.leads.reduce((acc, l) => acc + (l.value || 0), 0),
    })).sort((a, b) => b.wonValue - a.wonValue);

    res.json({
      kpis: {
        totalLeads,
        newLeadsThisMonth,
        newLeadsGrowth: newLeadsLastMonth > 0 ? (((newLeadsThisMonth - newLeadsLastMonth) / newLeadsLastMonth) * 100).toFixed(1) : '100',
        wonThisMonth,
        wonGrowth: wonLastMonth > 0 ? (((wonThisMonth - wonLastMonth) / wonLastMonth) * 100).toFixed(1) : '100',
        lostThisMonth,
        conversionRate,
        pipelineValue: pipelineValue._sum.value || 0,
        wonValue: wonValue._sum.value || 0,
      },
      charts: {
        leadsByStatus: leadsByStatus.map(s => ({ status: s.status, count: s._count })),
        leadsBySource: leadsBySource.map(s => ({ source: s.source || 'Sem fonte', count: s._count })),
        leadsByPriority: leadsByPriority.map(p => ({ priority: p.priority, count: p._count })),
      },
      topSellers: topSellersFormatted,
      recentActivities,
      upcomingAppointments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// Monthly trend (last 12 months)
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const userFilter: any = { ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      userFilter.assignedToId = req.user!.userId;
    } else if (req.query.userId) {
      userFilter.assignedToId = req.query.userId;
    }

    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const [created, won, lost] = await Promise.all([
        prisma.lead.count({ where: { ...userFilter, createdAt: { gte: start, lte: end } } }),
        prisma.lead.count({ where: { ...userFilter, status: 'WON', wonDate: { gte: start, lte: end } } }),
        prisma.lead.count({ where: { ...userFilter, status: 'LOST', lostDate: { gte: start, lte: end } } }),
      ]);

      months.push({
        month: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        created,
        won,
        lost,
      });
    }
    res.json(months);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar tendência' });
  }
});

export default router;
