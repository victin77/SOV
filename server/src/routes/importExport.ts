import { Router, Request, Response } from 'express';
import { LeadStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import {
  buildInitialStagePositionMap,
  findStageByName,
  parseLeadStatus,
  parsePriority,
  reserveStagePosition,
  resolveStageForLead,
} from '../utils/pipeline';
import { companyWhere, getCompanyIdFromRequest } from '../utils/tenancy';
import { prisma } from '../utils/prisma';

const router = Router();

const DEFAULT_STAGE_COLOR = '#6366f1';
const DEFAULT_TAG_COLOR = '#6366f1';

router.use(authenticate);

function normalizeLookup(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200d\u2060\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getLookupTokens(value?: string | null) {
  return normalizeLookup(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function readText(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return null;
}

function parseOptionalNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const sanitized = String(value)
      .trim()
      .replace(/\s+/g, '')
      .replace(/R\$/gi, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');

    if (!sanitized) continue;
    const parsed = Number(sanitized);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
}

function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeExcelCellValue(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;

  if ('text' in value && typeof value.text === 'string') return value.text;
  if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink;
  if ('result' in value) return value.result ?? null;
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('');
  }

  return String(value);
}

async function readRowsFromXlsxBuffer(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    headers[columnNumber] = String(normalizeExcelCellValue(cell.value) || '').trim();
  });

  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const item: Record<string, unknown> = {};
    let hasValue = false;
    for (let columnNumber = 1; columnNumber < headers.length; columnNumber += 1) {
      const header = headers[columnNumber];
      if (!header) continue;

      const value = normalizeExcelCellValue(row.getCell(columnNumber).value);
      if (value !== null && value !== undefined && value !== '') hasValue = true;
      item[header] = value;
    }

    if (hasValue) rows.push(item);
  });

  return rows;
}

async function writeRowsToXlsxBuffer(rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads');
  const headers = rows.length ? Object.keys(rows[0]) : ['Nome'];

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(12, Math.min(30, header.length + 4)),
  }));

  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function extractTagNames(value: unknown) {
  if (value === null || value === undefined || value === '') return [];

  const rawValues = Array.isArray(value)
    ? value.flatMap((entry) => String(entry).split(/[,\n;|]/))
    : String(value).split(/[,\n;|]/);

  const seen = new Set<string>();
  const names: string[] = [];

  for (const raw of rawValues) {
    const name = raw.trim();
    if (!name) continue;

    const key = normalizeLookup(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

function buildNotes(row: Record<string, unknown>) {
  const notes = readText(row.notas, row.Notas, row.notes, row.Notes, row.obs, row.Obs, row.OBS);
  const nextStep = readText(row.nextStep, row.NextStep, row.proximoPasso, row.proximo_passo);
  const parts = [notes];

  if (nextStep) {
    parts.push(`Próximo passo: ${nextStep}`);
  }

  return parts.filter(Boolean).join('\n\n') || null;
}

function buildStatusDates(status: LeadStatus, createdAt?: Date | null, updatedAt?: Date | null) {
  const baseDate = updatedAt || createdAt || new Date();

  return {
    wonDate: status === 'WON' ? baseDate : null,
    lostDate: status === 'LOST' ? baseDate : null,
  };
}

function readOwner(row: Record<string, unknown>) {
  return readText(
    row.ownerEmail,
    row.OwnerEmail,
    row.owner_email,
    row.assignedToEmail,
    row.AssignedToEmail,
    row.responsavelEmail,
    row.ResponsavelEmail,
    row.emailResponsavel,
    row.EmailResponsavel,
    row['EmailResponsavel'],
    row['Email do responsavel'],
    row['Email do respons\u00e1vel'],
    row['E-mail do responsavel'],
    row['E-mail do respons\u00e1vel'],
    row.owner,
    row.Owner,
    row.responsavel,
    row.Responsavel,
    row['Responsavel'],
    row['Respons\u00e1vel'],
    row['respons\u00e1vel'],
    row['ResponsÃ¡vel'],
  );
}

function resolveOwnerId(
  users: Array<{ id: string; name: string; email: string }>,
  ownerValue: unknown,
  fallbackUserId: string,
  rowNumber: number,
) {
  const requestedOwner = readText(ownerValue);
  if (!requestedOwner) return fallbackUserId;

  const matchedUser = findOwnerUser(users, requestedOwner);
  if (matchedUser) return matchedUser.id;

  throw new Error(`Linha ${rowNumber}: Responsavel nao encontrado na empresa atual: ${requestedOwner}`);
}

function resolveOwnerMatch(
  users: Array<{ id: string; name: string; email: string }>,
  ownerValue: unknown,
) {
  const requestedOwner = readText(ownerValue);
  if (!requestedOwner) {
    return {
      requestedOwner: null,
      matchedUser: null,
    };
  }

  const matchedUser = findOwnerUser(users, requestedOwner);
  if (matchedUser) {
    return { requestedOwner, matchedUser };
  }

  return {
    requestedOwner,
    matchedUser: null,
  };
}

export function findOwnerUser(
  users: Array<{ id: string; name: string; email: string }>,
  requestedOwner: string,
) {
  const normalizedOwner = normalizeLookup(requestedOwner);
  if (!normalizedOwner) return null;

  const exactEmail = users.find((user) => normalizeLookup(user.email) === normalizedOwner);
  if (exactEmail) return exactEmail;

  const emailLocalPart = users.find((user) => normalizeLookup(user.email.split('@')[0]) === normalizedOwner);
  if (emailLocalPart) return emailLocalPart;

  const exactName = users.find((user) => normalizeLookup(user.name) === normalizedOwner);
  if (exactName) return exactName;

  const partialNameMatches = users.filter((user) => {
    const normalizedName = normalizeLookup(user.name);
    return normalizedName
      && (normalizedName.includes(normalizedOwner) || normalizedOwner.includes(normalizedName));
  });

  if (partialNameMatches.length === 1) return partialNameMatches[0];

  const ownerTokens = new Set(getLookupTokens(requestedOwner));
  if (ownerTokens.size) {
    const tokenNameMatches = users.filter((user) => (
      getLookupTokens(user.name).some((token) => ownerTokens.has(token))
    ));

    if (tokenNameMatches.length === 1) return tokenNameMatches[0];
  }

  return null;
}

async function ensureStage(
  tx: any,
  stages: Array<{ id: string; name: string; order: number; isDefault: boolean }>,
  stagePositions: Map<string, number>,
  requestedStageName: string | null,
  status: LeadStatus,
  companyId: string,
) {
  const explicitStage = findStageByName(stages, requestedStageName);
  if (explicitStage) return explicitStage;

  if (requestedStageName) {
    const nextOrder = stages.reduce((max, stage) => Math.max(max, stage.order), 0) + 1;
    const createdStage = await tx.pipelineStage.create({
      data: {
        name: requestedStageName,
        color: DEFAULT_STAGE_COLOR,
        order: nextOrder,
        companyId,
      },
    });

    const snapshot = {
      id: createdStage.id,
      name: createdStage.name,
      order: createdStage.order,
      isDefault: createdStage.isDefault,
    };

    stages.push(snapshot);
    stagePositions.set(createdStage.id, 1);
    return snapshot;
  }

  return resolveStageForLead(stages, { status });
}

async function ensureTags(
  tx: any,
  existingTags: Array<{ id: string; name: string }>,
  requestedTagNames: string[],
  companyId: string,
) {
  const tagIds: string[] = [];

  for (const tagName of requestedTagNames) {
    const key = normalizeLookup(tagName);
    const tag = existingTags.find((entry) => normalizeLookup(entry.name) === key);

    if (!tag) {
      const createdTag = await tx.tag.create({
        data: {
          name: tagName,
          color: DEFAULT_TAG_COLOR,
          companyId,
        },
        select: { id: true, name: true },
      });
      existingTags.push(createdTag);
      tagIds.push(createdTag.id);
      continue;
    }

    tagIds.push(tag.id);
  }

  return tagIds;
}

export function mapRowToLeadInput(row: Record<string, unknown>) {
  const status = parseLeadStatus(
    readText(row.status, row.Status, row.situacao, row.Situacao),
  ) || 'NEW';

  const priority = parsePriority(
    readText(row.prioridade, row.Prioridade, row.priority, row.Priority),
  ) || 'MEDIUM';

  const stageName = readText(row.etapa, row.Etapa, row.stage, row.Stage);
  const createdAt = parseOptionalDate(
    row.createdAt ?? row.CreatedAt ?? row.criadoEm ?? row['Criado em'],
  );
  const updatedAt = parseOptionalDate(
    row.updatedAt ?? row.UpdatedAt ?? row.atualizadoEm ?? row['Atualizado em'],
  );

  return {
    name: readText(row.nome, row.Nome, row.name, row.Name) || 'Sem nome',
    email: readText(row.email, row.Email),
    phone: readText(row.telefone, row.Telefone, row.phone, row.Phone),
    company: readText(row.empresa, row.Empresa, row.company, row.Company),
    position: readText(row.cargo, row.Cargo, row.position, row.Position),
    status,
    priority,
    source: readText(row.fonte, row.Fonte, row.source, row.Source, row.origin, row.Origin) || 'import',
    value: parseOptionalNumber(row.valor, row.Valor, row.value, row.Value),
    notes: buildNotes(row),
    lostReason: readText(row.lossReason, row.LossReason, row.lossreason, row.motivoPerda, row.motivo_perda),
    owner: readOwner(row),
    tags: extractTagNames(row.tags ?? row.Tags),
    stageName,
    createdAt,
    updatedAt,
  };
}

async function importLeadRows(rows: Record<string, unknown>[], importingUserId: string, format: 'json' | 'xlsx') {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: importingUserId },
      select: { companyId: true },
    });
    if (!user?.companyId) {
      throw new Error('Usuario sem empresa vinculada.');
    }

    const stages = await tx.pipelineStage.findMany({
      where: { companyId: user.companyId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, order: true, isDefault: true },
    });
    const stagePositions = await buildInitialStagePositionMap(tx as any, stages);
    const users = await tx.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true, email: true },
    });
    const tags = await tx.tag.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    let imported = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const leadInput = mapRowToLeadInput(row);
      const assignedToId = resolveOwnerId(users, leadInput.owner, importingUserId, rowNumber);
      const stage = await ensureStage(tx, stages, stagePositions, leadInput.stageName, leadInput.status, user.companyId);
      const tagIds = await ensureTags(tx, tags, leadInput.tags, user.companyId);
      const { wonDate, lostDate } = buildStatusDates(leadInput.status, leadInput.createdAt, leadInput.updatedAt);

      const lead = await tx.lead.create({
        data: {
          name: leadInput.name,
          email: leadInput.email,
          phone: leadInput.phone,
          company: leadInput.company,
          position: leadInput.position,
          status: leadInput.status,
          priority: leadInput.priority,
          value: leadInput.value,
          source: leadInput.source,
          notes: leadInput.notes,
          lostReason: leadInput.lostReason,
          companyId: user.companyId,
          assignedToId,
          stageId: stage?.id || null,
          pipelinePosition: reserveStagePosition(stagePositions, stage?.id),
          wonDate,
          lostDate,
          ...(leadInput.createdAt ? { createdAt: leadInput.createdAt } : {}),
        },
      });

      if (leadInput.updatedAt) {
        await tx.$executeRaw`UPDATE leads SET "updatedAt" = ${leadInput.updatedAt} WHERE id = ${lead.id}`;
      }

      if (tagIds.length) {
        await tx.leadTag.createMany({
          data: tagIds.map((tagId) => ({ leadId: lead.id, tagId })),
        });
      }

      imported += 1;
    }

    await logAudit({
      userId: importingUserId,
      companyId: user.companyId,
      action: 'IMPORT_LEADS',
      entity: 'lead',
      details: { count: imported, format },
    });

    return imported;
  }, { timeout: 60000 });
}

async function buildImportPreview(rows: Record<string, unknown>[], importingUserId: string, format: 'json' | 'xlsx') {
  const user = await prisma.user.findUnique({
    where: { id: importingUserId },
    select: { companyId: true },
  });
  if (!user?.companyId) {
    throw new Error('Usuario sem empresa vinculada.');
  }

  const stages = await prisma.pipelineStage.findMany({
    where: { companyId: user.companyId },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, order: true, isDefault: true },
  });
  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: { id: true, name: true, email: true },
  });
  const tags = await prisma.tag.findMany({
    where: { companyId: user.companyId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const knownStageKeys = new Set(stages.map((stage) => normalizeLookup(stage.name)));
  const knownTagKeys = new Set(tags.map((tag) => normalizeLookup(tag.name)));
  const newStages: string[] = [];
  const newTags: string[] = [];
  const unknownOwners: Array<{ rowNumber: number; owner: string }> = [];

  const rowPreviews = rows.map((row, index) => {
    const rowNumber = index + 2;
    const leadInput = mapRowToLeadInput(row);
    const ownerMatch = resolveOwnerMatch(users, leadInput.owner);
    const issues: string[] = [];

    let willCreateStage = false;
    if (leadInput.stageName) {
      const stageKey = normalizeLookup(leadInput.stageName);
      if (stageKey && !knownStageKeys.has(stageKey)) {
        knownStageKeys.add(stageKey);
        newStages.push(leadInput.stageName);
        willCreateStage = true;
      }
    }

    const tagsToCreate: string[] = [];
    for (const tagName of leadInput.tags) {
      const tagKey = normalizeLookup(tagName);
      if (!tagKey || knownTagKeys.has(tagKey)) continue;
      knownTagKeys.add(tagKey);
      newTags.push(tagName);
      tagsToCreate.push(tagName);
    }

    if (ownerMatch.requestedOwner && !ownerMatch.matchedUser) {
      issues.push(`Owner nao encontrado: ${ownerMatch.requestedOwner}`);
      unknownOwners.push({ rowNumber, owner: ownerMatch.requestedOwner });
    }

    return {
      rowNumber,
      name: leadInput.name,
      phone: leadInput.phone,
      source: leadInput.source,
      status: leadInput.status,
      stageName: leadInput.stageName,
      owner: ownerMatch.matchedUser?.name || ownerMatch.requestedOwner,
      tags: leadInput.tags,
      createdAt: leadInput.createdAt?.toISOString() || null,
      updatedAt: leadInput.updatedAt?.toISOString() || null,
      willCreateStage,
      tagsToCreate,
      issues,
    };
  });

  return {
    format,
    totalRows: rows.length,
    validRows: rowPreviews.filter((row) => row.issues.length === 0).length,
    canImport: unknownOwners.length === 0 && rows.length > 0,
    newStages,
    newTags,
    unknownOwners,
    rows: rowPreviews,
  };
}

// Export leads as JSON
router.get('/json', async (req: Request, res: Response) => {
  try {
    const where: any = { ...companyWhere(req) };
    if (req.user!.role === 'SELLER') where.assignedToId = req.user!.userId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { name: true, email: true } },
        stage: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
    });

    const exportData = leads.map((lead) => ({
      nome: lead.name,
      email: lead.email,
      telefone: lead.phone,
      empresa: lead.company,
      cargo: lead.position,
      status: lead.status,
      prioridade: lead.priority,
      valor: lead.value,
      fonte: lead.source,
      notas: lead.notes,
      responsavel: lead.assignedTo?.name,
      responsavelEmail: lead.assignedTo?.email,
      etapa: lead.stage?.name,
      tags: lead.tags.map((tag) => tag.tag.name).join(', '),
      score: lead.score,
      criadoEm: lead.createdAt,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.json');
    res.json(exportData);
  } catch (_err) {
    res.status(500).json({ error: 'Erro ao exportar' });
  }
});

// Export leads as XLSX
router.get('/xlsx', async (req: Request, res: Response) => {
  try {
    const where: any = { ...companyWhere(req) };
    if (req.user!.role === 'SELLER') where.assignedToId = req.user!.userId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { name: true, email: true } },
        stage: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
    });

    const data = leads.map((lead) => ({
      Nome: lead.name,
      Email: lead.email || '',
      Telefone: lead.phone || '',
      Empresa: lead.company || '',
      Cargo: lead.position || '',
      Status: lead.status,
      Prioridade: lead.priority,
      Valor: lead.value ?? 0,
      Fonte: lead.source || '',
      Responsavel: lead.assignedTo?.name || '',
      EmailResponsavel: lead.assignedTo?.email || '',
      Etapa: lead.stage?.name || '',
      Tags: lead.tags.map((tag) => tag.tag.name).join(', '),
      Score: lead.score,
      'Criado em': lead.createdAt.toISOString().split('T')[0],
    }));

    const buffer = await writeRowsToXlsxBuffer(data);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');
    res.send(buffer);
  } catch (_err) {
    res.status(500).json({ error: 'Erro ao exportar XLSX' });
  }
});

// Import leads from JSON
router.post('/preview/json', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const leads = req.body.leads || req.body;
    if (!Array.isArray(leads)) {
      res.status(400).json({ error: 'Formato invalido. Esperado array de leads.' });
      return;
    }

    const preview = await buildImportPreview(leads, req.user!.userId, 'json');
    res.json(preview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao gerar preview' });
  }
});

router.post('/json', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const leads = req.body.leads || req.body;
    if (!Array.isArray(leads)) {
      res.status(400).json({ error: 'Formato invalido. Esperado array de leads.' });
      return;
    }

    const imported = await importLeadRows(leads, req.user!.userId, 'json');
    res.json({ message: `${imported} leads importados com sucesso` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao importar' });
  }
});

// Import leads from XLSX
router.post('/preview/xlsx', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' });
      return;
    }

    const buffer = Buffer.from(data, 'base64');
    const rows = await readRowsFromXlsxBuffer(buffer);

    const preview = await buildImportPreview(rows, req.user!.userId, 'xlsx');
    res.json(preview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao gerar preview do XLSX' });
  }
});

router.post('/xlsx', authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' });
      return;
    }

    const buffer = Buffer.from(data, 'base64');
    const rows = await readRowsFromXlsxBuffer(buffer);

    const imported = await importLeadRows(rows, req.user!.userId, 'xlsx');
    res.json({ message: `${imported} leads importados com sucesso` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao importar XLSX' });
  }
});

export default router;
