import type { LeadStatus, PipelineStage, Priority, PrismaClient } from '@prisma/client';

type StageSnapshot = Pick<PipelineStage, 'id' | 'name' | 'order' | 'isDefault'>;

function normalizeLookup(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function getDefaultStage(stages: StageSnapshot[]) {
  return (
    stages.find((stage) => stage.isDefault)
    || stages.find((stage) => /^(novo|new)$/.test(normalizeLookup(stage.name)))
    || stages.find((stage) => /(novo|new)/.test(normalizeLookup(stage.name)))
    || stages[0]
    || null
  );
}

export function getWonStage(stages: StageSnapshot[]) {
  return stages.find((stage) => /(ganh|fech|clos|won)/.test(normalizeLookup(stage.name))) || stages.at(-1) || null;
}

export function findStageByName(stages: StageSnapshot[], stageName?: string | null) {
  const normalizedTarget = normalizeLookup(stageName);
  if (!normalizedTarget) return null;

  return (
    stages.find((stage) => normalizeLookup(stage.name) === normalizedTarget)
    || stages.find((stage) => normalizeLookup(stage.name).includes(normalizedTarget))
    || stages.find((stage) => normalizedTarget.includes(normalizeLookup(stage.name)))
    || null
  );
}

export function parseLeadStatus(value?: string | null): LeadStatus | undefined {
  const normalized = normalizeLookup(value);
  const mapping: Record<string, LeadStatus> = {
    new: 'NEW',
    novo: 'NEW',
    contacted: 'CONTACTED',
    contactado: 'CONTACTED',
    contatado: 'CONTACTED',
    qualificado: 'QUALIFIED',
    qualified: 'QUALIFIED',
    proposal: 'PROPOSAL',
    proposta: 'PROPOSAL',
    negotiation: 'NEGOTIATION',
    negociacao: 'NEGOTIATION',
    negociacaoo: 'NEGOTIATION',
    ganho: 'WON',
    won: 'WON',
    fechado: 'WON',
    fechamento: 'WON',
    lost: 'LOST',
    perdido: 'LOST',
  };

  return mapping[normalized];
}

export function parsePriority(value?: string | null): Priority | undefined {
  const normalized = normalizeLookup(value);
  const mapping: Record<string, Priority> = {
    low: 'LOW',
    baixa: 'LOW',
    medium: 'MEDIUM',
    media: 'MEDIUM',
    high: 'HIGH',
    alta: 'HIGH',
    urgent: 'URGENT',
    urgente: 'URGENT',
  };

  return mapping[normalized];
}

export async function getNextPipelinePosition(prisma: PrismaClient, stageId?: string | null) {
  if (!stageId) return 0;

  const lastLead = await prisma.lead.findFirst({
    where: { stageId },
    orderBy: [{ pipelinePosition: 'desc' }, { updatedAt: 'desc' }],
    select: { pipelinePosition: true },
  });

  return (lastLead?.pipelinePosition || 0) + 1;
}

export async function buildInitialStagePositionMap(prisma: PrismaClient, stages: StageSnapshot[]) {
  const entries = await Promise.all(
    stages.map(async (stage) => {
      const nextPosition = await getNextPipelinePosition(prisma, stage.id);
      return [stage.id, nextPosition] as const;
    }),
  );

  return new Map<string, number>(entries);
}

export function reserveStagePosition(positionMap: Map<string, number>, stageId?: string | null) {
  if (!stageId) return 0;
  const nextPosition = positionMap.get(stageId) || 1;
  positionMap.set(stageId, nextPosition + 1);
  return nextPosition;
}

export function resolveStageForLead(
  stages: StageSnapshot[],
  options: {
    stageId?: string | null;
    stageName?: string | null;
    status?: LeadStatus | null;
    fallbackToDefault?: boolean;
  },
) {
  if (options.stageId) {
    return stages.find((stage) => stage.id === options.stageId) || null;
  }

  const explicitStage = findStageByName(stages, options.stageName);
  if (explicitStage) return explicitStage;

  if (options.status === 'WON') {
    return getWonStage(stages);
  }

  if (options.status === 'LOST') {
    return null;
  }

  return options.fallbackToDefault === false ? null : getDefaultStage(stages);
}
