import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { firstString } from '../utils/request';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';

const router = Router();
const prisma = new PrismaClient();

function parseDateRange(from?: string | null, to?: string | null) {
  const createdAt: { gte?: Date; lte?: Date } = {};

  if (from) {
    const start = new Date(`${from}T00:00:00.000`);
    if (!Number.isNaN(start.getTime())) {
      createdAt.gte = start;
    }
  }

  if (to) {
    const end = new Date(`${to}T23:59:59.999`);
    if (!Number.isNaN(end.getTime())) {
      createdAt.lte = end;
    }
  }

  return Object.keys(createdAt).length ? createdAt : undefined;
}

router.use(authenticate);

// Get all stages with leads
router.get('/', async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.user!.role === 'SELLER') {
      where.assignedToId = req.user!.userId;
    }
    const assignedToId = firstString(req.query.assignedToId);
    const dateFrom = firstString(req.query.dateFrom);
    const dateTo = firstString(req.query.dateTo);
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }
    const createdAtFilter = parseDateRange(dateFrom, dateTo);
    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    const stages = await prisma.pipelineStage.findMany({
      where: companyWhere(req),
      orderBy: { order: 'asc' },
      include: {
        leads: {
          where,
          include: {
            assignedTo: { select: { id: true, name: true, avatar: true } },
            tags: { include: { tag: true } },
            _count: { select: { appointments: true } },
          },
          orderBy: [{ pipelinePosition: 'asc' }, { updatedAt: 'desc' }],
        },
      },
    });

    res.json(stages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar pipeline' });
  }
});

// Create stage
router.post('/stages', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const companyId = getCompanyIdFromRequest(req);
    const maxOrder = await prisma.pipelineStage.findFirst({ where: { companyId }, orderBy: { order: 'desc' } });
    const stage = await prisma.pipelineStage.create({
      data: { name, color: color || '#6366f1', order: (maxOrder?.order || 0) + 1, companyId },
    });
    await logAudit({ userId: req.user!.userId, companyId, action: 'CREATE_STAGE', entity: 'pipeline_stage', entityId: stage.id });
    res.status(201).json(stage);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar etapa' });
  }
});

// Update stage
router.put('/stages/:id', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const stageId = firstString(req.params.id);
    if (!stageId) {
      res.status(400).json({ error: 'Etapa inválida' });
      return;
    }

    const { name, color, order } = req.body;
    const scopedStage = await prisma.pipelineStage.findFirst({ where: { id: stageId, ...companyWhere(req) }, select: { id: true } });
    if (!scopedStage) {
      res.status(404).json({ error: 'Etapa nÃ£o encontrada' });
      return;
    }

    const stage = await prisma.pipelineStage.update({
      where: { id: stageId },
      data: { name, color, order },
    });
    res.json(stage);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

// Reorder stages
router.put('/stages/reorder', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { stageOrders } = req.body; // [{ id, order }]
    await Promise.all(
      stageOrders.map((s: { id: string; order: number }) =>
        prisma.pipelineStage.updateMany({ where: { id: s.id, ...companyWhere(req) }, data: { order: s.order } })
      )
    );
    res.json({ message: 'Etapas reordenadas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reordenar etapas' });
  }
});

// Delete stage
router.delete('/stages/:id', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const stageId = firstString(req.params.id);
    if (!stageId) {
      res.status(400).json({ error: 'Etapa inválida' });
      return;
    }

    // Move leads to first stage or unassign
    const scopedStage = await prisma.pipelineStage.findFirst({ where: { id: stageId, ...companyWhere(req) }, select: { id: true } });
    if (!scopedStage) {
      res.status(404).json({ error: 'Etapa nÃ£o encontrada' });
      return;
    }

    const firstStage = await prisma.pipelineStage.findFirst({ where: { id: { not: stageId }, ...companyWhere(req) }, orderBy: { order: 'asc' } });
    if (firstStage) {
      await prisma.lead.updateMany({ where: { stageId, ...companyWhere(req) }, data: { stageId: firstStage.id } });
    } else {
      await prisma.lead.updateMany({ where: { stageId, ...companyWhere(req) }, data: { stageId: null } });
    }

    await prisma.pipelineStage.delete({ where: { id: stageId } });
    await logAudit({ userId: req.user!.userId, companyId: req.user!.companyId, action: 'DELETE_STAGE', entity: 'pipeline_stage', entityId: stageId });
    res.json({ message: 'Etapa removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover etapa' });
  }
});

// Move lead between stages
router.put('/move', async (req: Request, res: Response) => {
  try {
    const { leadId, stageId, targetLeadId, placement } = req.body as {
      leadId?: string;
      stageId?: string;
      targetLeadId?: string | null;
      placement?: 'before' | 'after';
    };

    if (!leadId || !stageId) {
      res.status(400).json({ error: 'Lead e etapa sao obrigatorios' });
      return;
    }

    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, stageId: true, status: true, companyId: true },
    });

    if (!currentLead || currentLead.companyId !== req.user!.companyId) {
      res.status(404).json({ error: 'Lead nao encontrado' });
      return;
    }

    const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, ...companyWhere(req) } });
    const shouldMarkWon = Boolean(stage?.name && /fech/i.test(stage.name));
    const destinationLeadIds = (await prisma.lead.findMany({
      where: { stageId, ...companyWhere(req) },
      orderBy: [{ pipelinePosition: 'asc' }, { updatedAt: 'desc' }],
      select: { id: true },
    }))
      .map((lead) => lead.id)
      .filter((id) => id !== leadId);

    let insertIndex = destinationLeadIds.length;
    if (targetLeadId) {
      const targetIndex = destinationLeadIds.indexOf(targetLeadId);
      if (targetIndex >= 0) {
        insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
      }
    }

    const nextDestinationOrder = [...destinationLeadIds];
    nextDestinationOrder.splice(insertIndex, 0, leadId);

    const sourceStageId = currentLead.stageId;
    const sourceLeadIds = sourceStageId && sourceStageId !== stageId
      ? (await prisma.lead.findMany({
        where: { stageId: sourceStageId, id: { not: leadId }, ...companyWhere(req) },
        orderBy: [{ pipelinePosition: 'asc' }, { updatedAt: 'desc' }],
        select: { id: true },
      })).map((lead) => lead.id)
      : [];

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          stageId,
          pipelinePosition: insertIndex + 1,
          ...(shouldMarkWon ? { status: 'WON', wonDate: new Date() } : {}),
        },
      });

      if (sourceStageId && sourceStageId !== stageId && sourceLeadIds.length) {
        await Promise.all(
          sourceLeadIds.map((id, index) => tx.lead.update({
            where: { id },
            data: { pipelinePosition: index + 1 },
          })),
        );
      }

      await Promise.all(
        nextDestinationOrder.map((id, index) => tx.lead.update({
          where: { id },
          data: { pipelinePosition: index + 1 },
        })),
      );
    });

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { stage: true },
    });

    await prisma.activity.create({
      data: {
        type: 'STAGE_CHANGE',
        description: shouldMarkWon
          ? `Lead movido para "${lead?.stage?.name}" e marcado como ganho`
          : `Lead movido para "${lead?.stage?.name}"`,
        leadId,
        companyId: req.user!.companyId,
        metadata: { stageId, status: shouldMarkWon ? 'WON' : lead?.status, placement: placement || 'after', targetLeadId: targetLeadId || null },
      },
    });

    await logAudit({ userId: req.user!.userId, companyId: req.user!.companyId, action: 'MOVE_LEAD', entity: 'lead', entityId: leadId, details: { stageId } });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao mover lead' });
  }
});

export default router;
