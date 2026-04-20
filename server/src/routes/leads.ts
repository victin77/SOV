import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { firstString } from '../utils/request';
import { getNextPipelinePosition, resolveStageForLead } from '../utils/pipeline';
import { sendLeadWhatsAppMessage } from '../utils/whatsappMessages';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';

const router = Router();
const DELETE_ALL_LEADS_CONFIRMATION = 'APAGAR TODOS OS LEADS';

function parseStringArray(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  return value.every((item) => typeof item === 'string') ? value : null;
}

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

async function deleteAllLeadsForCurrentCompany(req: Request, res: Response) {
  const confirmation = firstString(req.body?.confirmation);
  if (confirmation !== DELETE_ALL_LEADS_CONFIRMATION) {
    res.status(400).json({ error: 'Confirmacao invalida para apagar todos os leads' });
    return;
  }

  let companyId: string;
  try {
    companyId = getCompanyIdFromRequest(req);
  } catch {
    res.status(400).json({ error: 'Selecione uma empresa antes de apagar os leads' });
    return;
  }

  const deletedCount = await prisma.$transaction(async (tx) => {
    const count = await tx.lead.count({ where: { companyId } });
    await tx.lead.deleteMany({ where: { companyId } });
    return count;
  });

  await logAudit({
    userId: req.user!.userId,
    companyId,
    action: 'DELETE_ALL_LEADS',
    entity: 'lead',
    details: { deletedCount },
  });

  res.json({
    message: `${deletedCount} leads apagados com sucesso`,
    deletedCount,
  });
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

    const singleLeadWhere: any = { id: leadId, ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      singleLeadWhere.assignedToId = req.user!.userId;
    }

    const lead = await prisma.lead.findFirst({
      where: singleLeadWhere,
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

    // SELLER can only assign leads to themselves
    let resolvedAssignedToId = assignedToId || req.user!.userId;
    if (req.user!.role === 'SELLER') {
      resolvedAssignedToId = req.user!.userId;
    }

    // Validate assignedToId belongs to same company
    if (resolvedAssignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: resolvedAssignedToId, companyId },
        select: { id: true },
      });
      if (!assignee) {
        res.status(400).json({ error: 'Usuario atribuido nao pertence a esta empresa' });
        return;
      }
    }

    const stages = await prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });
    const resolvedStage = resolveStageForLead(stages, { stageId, status: status || 'NEW' });
    const resolvedStageId = resolvedStage?.id;
    const pipelinePosition = await getNextPipelinePosition(prisma, resolvedStageId);

    const tagIds = parseStringArray(tags);
    if (!tagIds) {
      res.status(400).json({ error: 'Tags invalidas' });
      return;
    }

    if (tagIds.length) {
      const validTags = await prisma.tag.count({
        where: { id: { in: tagIds }, companyId },
      });
      if (validTags !== tagIds.length) {
        res.status(400).json({ error: 'Tags invalidas para esta empresa' });
        return;
      }
    }

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
        assignedToId: resolvedAssignedToId,
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

    if (tagIds.length) {
      await prisma.leadTag.createMany({
        data: tagIds.map((tagId) => ({ leadId: lead.id, tagId })),
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

    const updateWhere: any = { id: leadId, ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      updateWhere.assignedToId = req.user!.userId;
    }
    const oldLead = await prisma.lead.findFirst({ where: updateWhere });
    if (!oldLead) {
      res.status(404).json({ error: 'Lead nao encontrado' });
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

    if (req.user!.role === 'SELLER' && assignedToId !== undefined && assignedToId !== req.user!.userId) {
      res.status(403).json({ error: 'Vendedor so pode atribuir leads a si mesmo' });
      return;
    }

    if (assignedToId !== undefined && assignedToId !== null) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, companyId: oldLead.companyId },
        select: { id: true },
      });
      if (!assignee) {
        res.status(400).json({ error: 'Usuario atribuido nao pertence a esta empresa' });
        return;
      }
    }

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

// Delete all leads for the current company - only ADMIN/SUPER_ADMIN
router.post('/delete-all', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await deleteAllLeadsForCurrentCompany(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar todos os leads' });
  }
});

// Delete all leads for the current company - only ADMIN/SUPER_ADMIN
router.delete('/all', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await deleteAllLeadsForCurrentCompany(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar todos os leads' });
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
    if (leadId === 'all') {
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }
      await deleteAllLeadsForCurrentCompany(req, res);
      return;
    }

    const leadWhere: any = { id: leadId, ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      leadWhere.assignedToId = req.user!.userId;
    }
    const lead = await prisma.lead.findFirst({ where: leadWhere, select: { id: true, companyId: true } });
    if (!lead) {
      res.status(404).json({ error: 'Lead nao encontrado' });
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

    const tagIds = parseStringArray(req.body?.tagIds);
    if (!tagIds) {
      res.status(400).json({ error: 'Tags invalidas' });
      return;
    }

    const tagLeadWhere: any = { id: leadId, ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      tagLeadWhere.assignedToId = req.user!.userId;
    }
    const lead = await prisma.lead.findFirst({ where: tagLeadWhere, select: { id: true, companyId: true } });
    if (!lead) {
      res.status(404).json({ error: 'Lead nao encontrado' });
      return;
    }

    if (tagIds.length) {
      const validTags = await prisma.tag.count({
        where: { id: { in: tagIds }, companyId: lead.companyId },
      });
      if (validTags !== tagIds.length) {
        res.status(400).json({ error: 'Tags invalidas para esta empresa' });
        return;
      }
    }

    // Remove existing tags
    await prisma.leadTag.deleteMany({ where: { leadId } });

    // Add new tags
    if (tagIds.length) {
      await prisma.leadTag.createMany({
        data: tagIds.map((tagId) => ({ leadId, tagId })),
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

    const activityLeadWhere: any = { id: leadId, ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      activityLeadWhere.assignedToId = req.user!.userId;
    }
    const lead = await prisma.lead.findFirst({
      where: activityLeadWhere,
      select: { companyId: true },
    });
    if (!lead) {
      res.status(404).json({ error: 'Lead nao encontrado' });
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

// Bulk update - only ADMIN/MANAGER can bulk update
router.post('/bulk', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { ids, data } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'IDs sao obrigatorios' });
      return;
    }
    if (!ids.every((id) => typeof id === 'string')) {
      res.status(400).json({ error: 'IDs invalidos' });
      return;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      res.status(400).json({ error: 'Dados de atualizacao invalidos' });
      return;
    }

    // Whitelist allowed fields for bulk update
    const allowedFields = ['status', 'priority', 'assignedToId', 'stageId', 'source'];
    const safeData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) safeData[key] = data[key];
    }

    if (Object.keys(safeData).length === 0) {
      res.status(400).json({ error: 'Nenhum campo valido para atualizar' });
      return;
    }

    const companyId = getCompanyIdFromRequest(req);

    if (typeof safeData.assignedToId === 'string') {
      const assignee = await prisma.user.findFirst({
        where: { id: safeData.assignedToId, companyId },
        select: { id: true },
      });
      if (!assignee) {
        res.status(400).json({ error: 'Usuario atribuido nao pertence a esta empresa' });
        return;
      }
    }

    if (typeof safeData.stageId === 'string') {
      const stage = await prisma.pipelineStage.findFirst({
        where: { id: safeData.stageId, companyId },
        select: { id: true },
      });
      if (!stage) {
        res.status(400).json({ error: 'Etapa nao pertence a esta empresa' });
        return;
      }
    }

    await prisma.lead.updateMany({ where: { id: { in: ids }, ...companyWhere(req) }, data: safeData });
    await logAudit({ userId: req.user!.userId, companyId: req.user!.companyId, action: 'BULK_UPDATE_LEADS', entity: 'lead', details: { ids, data: safeData } });
    res.json({ message: `${ids.length} leads atualizados` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar leads' });
  }
});

export default router;
