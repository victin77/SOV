import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { firstString } from '../utils/request';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';

const router = Router();

router.use(authenticate);

// List appointments (with date range filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, leadId, completed } = req.query;
    const where: any = { ...companyWhere(req) };

    if (req.user!.role === 'SELLER') {
      where.userId = req.user!.userId;
    } else {
      const userId = firstString(req.query.userId);
      if (userId) where.userId = userId;
    }

    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }

    const parsedLeadId = firstString(leadId);
    const parsedCompleted = firstString(completed);
    if (parsedLeadId) where.leadId = parsedLeadId;
    if (parsedCompleted !== undefined) where.completed = parsedCompleted === 'true';

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, company: true, email: true, phone: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar compromissos' });
  }
});

// Create appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, location, leadId } = req.body;
    const companyId = getCompanyIdFromRequest(req);

    const leadWhere: any = { id: leadId, companyId };
    if (req.user!.role === 'SELLER') {
      leadWhere.assignedToId = req.user!.userId;
    }
    const lead = await prisma.lead.findFirst({ where: leadWhere, select: { id: true } });
    if (!lead) {
      res.status(404).json({ error: 'Lead nao encontrado para esta empresa' });
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        leadId,
        userId: req.user!.userId,
        companyId,
      },
      include: {
        lead: { select: { id: true, name: true, company: true } },
        user: { select: { id: true, name: true } },
      },
    });

    await prisma.activity.create({
      data: {
        type: 'APPOINTMENT_CREATED',
        description: `Compromisso "${title}" agendado`,
        leadId,
        companyId,
      },
    });

    await logAudit({
      userId: req.user!.userId,
      companyId,
      action: 'CREATE_APPOINTMENT',
      entity: 'appointment',
      entityId: appointment.id,
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar compromisso' });
  }
});

// Update appointment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, location, completed } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (location !== undefined) data.location = location;
    if (completed !== undefined) data.completed = completed;

    const appointmentId = firstString(req.params.id);
    if (!appointmentId) {
      res.status(400).json({ error: 'Compromisso invalido' });
      return;
    }

    const appointmentWhere: any = { id: appointmentId, ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      appointmentWhere.userId = req.user!.userId;
    }
    const existingAppointment = await prisma.appointment.findFirst({
      where: appointmentWhere,
      select: { id: true, companyId: true },
    });
    if (!existingAppointment) {
      res.status(404).json({ error: 'Compromisso nao encontrado' });
      return;
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data,
      include: {
        lead: { select: { id: true, name: true, company: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (completed) {
      await prisma.activity.create({
        data: {
          type: 'APPOINTMENT_COMPLETED',
          description: `Compromisso "${appointment.title}" concluido`,
          leadId: appointment.leadId,
          companyId: existingAppointment.companyId,
        },
      });
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar compromisso' });
  }
});

// Delete appointment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const appointmentId = firstString(req.params.id);
    if (!appointmentId) {
      res.status(400).json({ error: 'Compromisso invalido' });
      return;
    }

    const deleteWhere: any = { id: appointmentId, ...companyWhere(req) };
    if (req.user!.role === 'SELLER') {
      deleteWhere.userId = req.user!.userId;
    }
    const appointment = await prisma.appointment.findFirst({
      where: deleteWhere,
      select: { id: true, companyId: true },
    });
    if (!appointment) {
      res.status(404).json({ error: 'Compromisso nao encontrado' });
      return;
    }

    await prisma.appointment.delete({ where: { id: appointmentId } });
    await logAudit({
      userId: req.user!.userId,
      companyId: appointment.companyId,
      action: 'DELETE_APPOINTMENT',
      entity: 'appointment',
      entityId: appointmentId,
    });
    res.json({ message: 'Compromisso removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover compromisso' });
  }
});

export default router;
