import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { firstString } from '../utils/request';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      where: companyWhere(req),
      include: { _count: { select: { leads: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar tags' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#6366f1',
        companyId: getCompanyIdFromRequest(req),
      },
    });
    res.status(201).json(tag);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Tag já existe' });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar tag' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tagId = firstString(req.params.id);
    if (!tagId) {
      res.status(400).json({ error: 'Tag inválida' });
      return;
    }

    const { name, color } = req.body;
    const tagExists = await prisma.tag.findFirst({ where: { id: tagId, ...companyWhere(req) }, select: { id: true } });
    if (!tagExists) {
      res.status(404).json({ error: 'Tag nÃ£o encontrada' });
      return;
    }

    const tag = await prisma.tag.update({ where: { id: tagId }, data: { name, color } });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tag' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tagId = firstString(req.params.id);
    if (!tagId) {
      res.status(400).json({ error: 'Tag inválida' });
      return;
    }

    const tagExists = await prisma.tag.findFirst({ where: { id: tagId, ...companyWhere(req) }, select: { id: true } });
    if (!tagExists) {
      res.status(404).json({ error: 'Tag nÃ£o encontrada' });
      return;
    }

    await prisma.tag.delete({ where: { id: tagId } });
    res.json({ message: 'Tag removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover tag' });
  }
});

export default router;
