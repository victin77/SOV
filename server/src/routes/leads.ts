import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { firstString } from '../utils/request';
import { getNextPipelinePosition, resolveStageForLead } from '../utils/pipeline';
import { sendLeadWhatsAppMessage } from '../utils/whatsappMessages';
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

// List leads with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, assignedToId, search, tag, priority, source, dateFrom, dateTo, page = '1', limit = '50', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where: any = { ...companyWhere(req) };

    const parsedStatus = firstString(status);
    const parsedAssignedToId = firstString(assignedToId);
    const parsedSearch = firstString(search);
    const parsedTag = firstString(tag);
    const parsedPriority = firstString(priority);
    const parsedSource = firstString(source);
    const parsedDateFrom = firstString(dateFrom);
    const parsedDateTo = firstString(dateTo);
    const parsedPage = firstString(page) || '1';
    const parsedLimit = firstString(limit) || '50';
    const parsedSortBy = firstString(sortBy) || 'createdAt';
    const parsedSortOrder = firstString(sortOrder) || 'desc';

    if (parsedStatus) where.status = parsedStatus;
    if (parsedAssignedToId) where.assignedToId = parsedAssignedToId;
    if (parsedPriority) where.priority = parsedPriority;
    if (parsedSource) where.source = parsedSource;
    const createdAtFilter = parseDateRange(parsedDateFrom, parsedDateTo);
    if (createdAtFilter) where.createdAt = createdAtFilter;

    if (parsedSearch) {
      where.OR = [
        { name: { contains: parsedSearch } },
        { email: { contains: parsedSearch } },
        { company: { contains: parsedSearch } },
        { phone: { contains: parsedSearch } },
      ];
    }

    if (parsedTag) {
      where.tags = { some: { tag: { name: parsedTag } } };
    }

    // Sellers only see their own leads
    if (req.user!.role === 'SELLER') {
      where.assignedToId = req.user!.userId;
    }

    const skip = (parseInt(parsedPage) - 1) * parseInt(parsedLimit);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          stage: true,
          tags: { include: { tag: true } },
          _count: { select: { appointments: true, activities: true } },
        },
        orderBy: { [parsedSortBy]: parsedSortOrder },
        skip,
        take: parseInt(parsedLimit),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: parseInt(parsedPage), totalPages: Math.ceil(total / parseInt(parsedLimit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
});

// Get single lead
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const leadId = firstString(req.params.id);
    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...companyWhere(req) },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, email: true } },
        stage: true,
        tags: { include: { tag: true } },
        appointments: { orderBy: { startDate: 'asc' }, include: { user: { select: { id: true, name: true } } } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        customFields: true,
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
});

// Create lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, position, status, priority, value, source, notes, assignedToId, stageId, tags } = req.body;

    const companyId = getCompanyIdFromRequest(req);
    const stages = await prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });
    const resolvedStage = resolveStageForLead(stages, { stageId, status: status || 'NEW' });
    const resolvedStageId = resolvedStage?.id;
    const pipelinePosition = await getNextPipelinePosition(prisma, resolvedStageId);

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        company,
        position,
        status: status || 'NEW',
        priority: priority || 'MEDIUM',
        value,
        source,
        notes,
        companyId,
        assignedToId: assignedToId || req.user!.userId,
        stageId: resolvedStageId,
        pipelinePosition,
        wonDate: status === 'WON' ? new Date() : null,
        lostDate: status === 'LOST' ? new Date() : null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        stage: true,
        tags: { include: { tag: true } },
      },
    });

    // Add tags
    if (tags?.length) {
      await prisma.leadTag.createMany({
        data: tags.map((tagId: string) => ({ leadId: lead.id, tagId })),
      });
    }

    // Activity log
    await prisma.activity.create({
      data: { type: 'CREATED', description: `Lead "${name}" criado`, leadId: lead.id, companyId },
    });

    await logAudit({ userId: req.user!.userId, companyId, action: 'CREATE_LEAD', entity: 'lead', entityId: lead.id, details: { name, email, company } });

    res.status(201).json(lead);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

// Update lead
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, position, status, priority, value, source, notes, assignedToId, stageId, lostReason, score } = req.body;

    const leadId = firstString(req.params.id);
    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }

    const oldLead = await prisma.lead.findFirst({ where: { id: leadId, ...companyWhere(req) } });
    if (!oldLead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    const stages = await prisma.pipelineStage.findMany({
      where: companyWhere(req),
      orderBy: { order: 'asc' },
    });
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (company !== undefined) data.company = company;
    if (position !== undefined) data.position = position;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (value !== undefined) data.value = value;
    if (source !== undefined) data.source = source;
    if (notes !== undefined) data.notes = notes;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;
    if (lostReason !== undefined) data.lostReason = lostReason;
    if (score !== undefined) data.score = score;

    const targetStatus = status !== undefined ? status : oldLead.status;
    const resolvedStage = resolveStageForLead(stages, {
      stageId: stageId !== undefined ? stageId : oldLead.stageId,
      status: targetStatus,
      fallbackToDefault: !oldLead.stageId,
    });
    const resolvedStageId = resolvedStage?.id;
    const stageChanged = resolvedStageId !== oldLead.stageId;

    if (stageId !== undefined || (status === 'WON' && oldLead.status !== 'WON') || (!oldLead.stageId && status !== 'LOST')) {
      data.stageId = resolvedStageId;
    }

    if (stageChanged) {
      data.pipelinePosition = await getNextPipelinePosition(prisma, resolvedStageId);
    }

    if (status === 'WON' && oldLead.status !== 'WON') data.wonDate = new Date();
    if (status === 'LOST' && oldLead.status !== 'LOST') data.lostDate = new Date();

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        stage: true,
        tags: { include: { tag: true } },
      },
    });

    // Log status change
    if (status && status !== oldLead.status) {
      await prisma.activity.create({
        data: {
          type: 'STATUS_CHANGE',
          description: `Status alterado de ${oldLead.status} para ${status}`,
          leadId: lead.id,
          companyId: oldLead.companyId,
          metadata: { from: oldLead.status, to: status },
        },
      });
    }

    if (stageChanged) {
      await prisma.activity.create({
        data: {
          type: 'STAGE_CHANGE',
          description: 'Lead movido de etapa no pipeline',
          leadId: lead.id,
          companyId: oldLead.companyId,
          metadata: { from: oldLead.stageId, to: resolvedStageId },
        },
      });
    }

    await logAudit({ userId: req.user!.userId, companyId: oldLead.companyId, action: 'UPDATE_LEAD', entity: 'lead', entityId: lead.id, details: data });

    res.json(lead);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

// Delete lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const leadId = firstString(req.params.id);
    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }

    const lead = await prisma.lead.findFirst({ where: { id: leadId, ...companyWhere(req) }, select: { id: true, companyId: true } });
    if (!lead) {
      res.status(404).json({ error: 'Lead nÃ£o encontrado' });
      return;
    }

    await prisma.lead.delete({ where: { id: leadId } });
    await logAudit({ userId: req.user!.userId, companyId: lead.companyId, action: 'DELETE_LEAD', entity: 'lead', entityId: leadId });
    res.json({ message: 'Lead removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover lead' });
  }
});

// Update lead tags
router.put('/:id/tags', async (req: Request, res: Response) => {
  try {
    const leadId = firstString(req.params.id);
    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }

    const { tagIds } = req.body;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, ...companyWhere(req) }, select: { id: true } });
    if (!lead) {
      res.status(404).json({ error: 'Lead nÃ£o encontrado' });
      return;
    }

    // Remove existing tags
    await prisma.leadTag.deleteMany({ where: { leadId } });

    // Add new tags
    if (tagIds?.length) {
      await prisma.leadTag.createMany({
        data: tagIds.map((tagId: string) => ({ leadId, tagId })),
      });
    }

    const updatedLead = await prisma.lead.findFirst({
      where: { id: leadId, ...companyWhere(req) },
      include: { tags: { include: { tag: true } } },
    });

    res.json(updatedLead);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tags' });
  }
});

// Add activity to lead
router.post('/:id/activities', async (req: Request, res: Response) => {
  try {
    const leadId = firstString(req.params.id);
    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...companyWhere(req) },
      select: { companyId: true },
    });
    if (!lead) {
      res.status(404).json({ error: 'Lead nÃ£o encontrado' });
      return;
    }

    const { type, description, metadata } = req.body;
    const activity = await prisma.activity.create({
      data: { type, description, metadata, leadId, companyId: lead.companyId },
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar atividade' });
  }
});

router.post('/:id/whatsapp', async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: 'Mensagem do WhatsApp é obrigatória' });
      return;
    }

    const leadId = firstString(req.params.id);
    if (!leadId) {
      res.status(400).json({ error: 'Lead inválido' });
      return;
    }
    const lead = await prisma.lead.findFirst({
      where: {
        ...companyWhere(req),
        id: leadId,
        ...(req.user!.role === 'SELLER' ? { assignedToId: req.user!.userId } : {}),
      },
      select: { id: true },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    const result = await sendLeadWhatsAppMessage(prisma, {
      leadId,
      userId: req.user!.userId,
      message: message.trim(),
    });

    res.json({
      ok: true,
      provider: result.provider,
      link: result.link,
      providerResponse: result.providerResponse,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao enviar WhatsApp' });
  }
});

// Bulk update
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { ids, data } = req.body;
    await prisma.lead.updateMany({ where: { id: { in: ids }, ...companyWhere(req) }, data });
    await logAudit({ userId: req.user!.userId, companyId: req.user!.companyId, action: 'BULK_UPDATE_LEADS', entity: 'lead', details: { ids, data } });
    res.json({ message: `${ids.length} leads atualizados` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar leads' });
  }
});

export default router;
