import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { firstString } from '../utils/request';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, message, type, link } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || 'info',
        link,
        userId: req.user!.userId,
        companyId: getCompanyIdFromRequest(req),
      },
    });

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar notificação' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId, ...companyWhere(req) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.userId, read: false, ...companyWhere(req) } });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar notificações' });
  }
});

router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const notificationId = firstString(req.params.id);
    if (!notificationId) {
      res.status(400).json({ error: 'Notificação inválida' });
      return;
    }

    const notification = await prisma.notification.findFirst({ where: { id: notificationId, userId: req.user!.userId, ...companyWhere(req) }, select: { id: true } });
    if (!notification) {
      res.status(404).json({ error: 'NotificaÃ§Ã£o nÃ£o encontrada' });
      return;
    }

    await prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
    res.json({ message: 'Notificação marcada como lida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar notificação' });
  }
});

router.put('/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.userId, read: false, ...companyWhere(req) }, data: { read: true } });
    res.json({ message: 'Todas notificações marcadas como lidas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar notificações' });
  }
});

export default router;
