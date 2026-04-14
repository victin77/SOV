import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { companyWhere } from '../utils/tenancy';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER'));

router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, action, entity, startDate, endDate, page = '1', limit = '50' } = req.query;
    const where: any = { ...companyWhere(req) };

    if (userId) where.userId = userId;
    if (action) where.action = { contains: action as string };
    if (entity) where.entity = entity;
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar auditoria' });
  }
});

export default router;
