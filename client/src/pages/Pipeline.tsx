import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, Building, DollarSign,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { PipelineStage, Lead, User as UserType } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { celebrateDealWon } from '../utils/celebration';

const INITIAL_VISIBLE_LEADS = 40;

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

type DropPlacement = 'before' | 'after';

type DropHint = {
  stageId: string;
  targetLeadId?: string | null;
  placement: DropPlacement;
};

function moveLeadInStages(
  currentStages: PipelineStage[],
  options: {
    leadId: string;
    toStageId: string;
    targetLeadId?: string | null;
    placement: DropPlacement;
    markAsWon: boolean;
  },
) {
  const nextStages = currentStages.map((stage) => ({
    ...stage,
    leads: [...(stage.leads || [])],
  }));

  let movedLead: Lead | undefined;
  for (const stage of nextStages) {
    const leadIndex = stage.leads.findIndex((lead) => lead.id === options.leadId);
    if (leadIndex >= 0) {
      movedLead = stage.leads.splice(leadIndex, 1)[0];
      break;
    }
  }

  if (!movedLead) return currentStages;

  const targetStage = nextStages.find((stage) => stage.id === options.toStageId);
  if (!targetStage) return currentStages;

  let insertIndex = targetStage.leads.length;
  if (options.targetLeadId) {
    const targetIndex = targetStage.leads.findIndex((lead) => lead.id === options.targetLeadId);
    if (targetIndex >= 0) {
      insertIndex = options.placement === 'after' ? targetIndex + 1 : targetIndex;
    }
  }

  targetStage.leads.splice(insertIndex, 0, {
    ...movedLead,
    stageId: options.toStageId,
    status: options.markAsWon ? 'WON' : movedLead.status,
  });

  for (const stage of nextStages) {
    stage.leads = stage.leads.map((lead, index) => ({
      ...lead,
      stageId: stage.id,
      pipelinePosition: index + 1,
    }));
  }

  return nextStages;
}

export default function Pipeline() {
  const { user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageModal, setStageModal] = useState<{ open: boolean; stage?: PipelineStage }>({ open: false });
  const [stageName, setStageName] = useState('');
  const [stageColor, setStageColor] = useState('#6366f1');
  const [consultants, setConsultants] = useState<UserType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const dragItem = useRef<{ leadId: string; fromStageId: string } | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const load = () => {
    const params: Record<string, string> = {};
    if (selectedUserId && user?.role !== 'SELLER') params.assignedToId = selectedUserId;
    if (dateFromFilter) params.dateFrom = dateFromFilter;
    if (dateToFilter) params.dateTo = dateToFilter;
    api.getPipeline(params)
      .then(setStages)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedUserId, dateFromFilter, dateToFilter]);
  useEffect(() => {
    if (user?.role === 'SELLER') return;
    api.getUsers().then(setConsultants).catch(() => {});
  }, [user?.role]);

  const handleCreateStage = async () => {
    if (!stageName.trim()) return;
    try {
      if (stageModal.stage) {
        await api.updateStage(stageModal.stage.id, { name: stageName, color: stageColor });
      } else {
        await api.createStage({ name: stageName, color: stageColor });
      }
      setStageModal({ open: false });
      setStageName('');
      setStageColor('#6366f1');
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (!confirm('Remover esta etapa? Os leads serao movidos.')) return;
    await api.deleteStage(id);
    load();
  };

  const handleDragStart = (leadId: string, fromStageId: string) => {
    dragItem.current = { leadId, fromStageId };
  };

  const handleStageDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dropHint?.stageId === stageId && !dropHint.targetLeadId) return;
    setDropHint({ stageId, placement: 'after', targetLeadId: null });
  };

  const handleCardDragOver = (e: React.DragEvent, stageId: string, targetLeadId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const placement: DropPlacement = e.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';

    if (dropHint?.stageId === stageId && dropHint.targetLeadId === targetLeadId && dropHint.placement === placement) return;
    setDropHint({ stageId, targetLeadId, placement });
  };

  const finishDrop = async (toStageId: string, targetLeadId?: string | null, placement: DropPlacement = 'after') => {
    if (!dragItem.current) return;
    if (targetLeadId && dragItem.current.leadId === targetLeadId && dragItem.current.fromStageId === toStageId) {
      dragItem.current = null;
      setDropHint(null);
      return;
    }

    const { leadId } = dragItem.current;
    dragItem.current = null;
    setDropHint(null);

    const targetStage = stages.find((stage) => stage.id === toStageId);
    const shouldCelebrate = Boolean(targetStage && /fech/i.test(targetStage.name));

    setStages((prev) => moveLeadInStages(prev, {
      leadId,
      toStageId,
      targetLeadId,
      placement,
      markAsWon: shouldCelebrate,
    }));

    try {
      await api.moveLead(leadId, toStageId, targetLeadId, placement);
      if (shouldCelebrate) {
        celebrateDealWon();
      }
      load();
    } catch {
      load();
    }
  };

  const handleStageDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    await finishDrop(toStageId, null, 'after');
  };

  const handleCardDrop = async (e: React.DragEvent, toStageId: string, targetLeadId: string, placement: DropPlacement) => {
    e.preventDefault();
    e.stopPropagation();
    await finishDrop(toStageId, targetLeadId, placement);
  };

  const toggleStageExpansion = (stageId: string) => {
    setExpandedStages((current) => ({
      ...current,
      [stageId]: !current[stageId],
    }));
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pipeline Kanban</h2>
          <p className="text-sm text-gray-500">Arraste leads entre etapas e acompanhe o fechamento com mais fluidez.</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== 'SELLER' && (
            <select className="input w-[220px]" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">Todos os consultores</option>
              {consultants.filter((consultant) => consultant.active !== false).map((consultant) => (
                <option key={consultant.id} value={consultant.id}>{consultant.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">De</span>
            <input
              type="date"
              className="input w-auto"
              value={dateFromFilter}
              onChange={e => setDateFromFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Até</span>
            <input
              type="date"
              className="input w-auto"
              value={dateToFilter}
              onChange={e => setDateToFilter(e.target.value)}
            />
          </div>
          {(dateFromFilter || dateToFilter) && (
            <button
              onClick={() => {
                setDateFromFilter('');
                setDateToFilter('');
              }}
              className="text-sm text-primary-600 hover:underline"
            >
              Limpar datas
            </button>
          )}
          {canManage && (
            <button
              onClick={() => { setStageName(''); setStageColor('#6366f1'); setStageModal({ open: true }); }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Nova Etapa
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[560px]" style={{ minWidth: stages.length * 300 }}>
          {stages.map(stage => {
            const allLeads = stage.leads || [];
            const isExpanded = Boolean(expandedStages[stage.id]);
            const visibleLeads = isExpanded ? allLeads : allLeads.slice(0, INITIAL_VISIBLE_LEADS);
            const hiddenCount = allLeads.length - visibleLeads.length;

            return (
            <motion.div
              key={stage.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className={`flex-shrink-0 w-[280px] sm:w-[300px] h-full bg-gray-100 rounded-xl flex flex-col transition-colors ${
                dropHint?.stageId === stage.id && !dropHint.targetLeadId ? 'ring-2 ring-primary-400 bg-primary-50' : ''
              }`}
              onDragOver={e => handleStageDragOver(e, stage.id)}
              onDrop={e => handleStageDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="font-semibold text-sm text-gray-900">{stage.name}</h3>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {stage.leads?.length || 0}
                  </span>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setStageName(stage.name); setStageColor(stage.color); setStageModal({ open: true, stage }); }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Stage total value */}
              {stage.leads && stage.leads.some(l => l.value) && (
                <div className="px-4 pb-2">
                  <span className="text-xs text-gray-500">
                    {formatCurrency(stage.leads.reduce((a, l) => a + (l.value || 0), 0))}
                  </span>
                </div>
              )}

              {/* Cards */}
              <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2">
                {visibleLeads.map(lead => (
                  <motion.div
                    key={lead.id}
                    layout
                    draggable
                    onDragStart={() => handleDragStart(lead.id, stage.id)}
                    onDragEnd={() => { dragItem.current = null; setDropHint(null); }}
                    onDragOver={(e) => handleCardDragOver(e, stage.id, lead.id)}
                    onDrop={(e) => handleCardDrop(e, stage.id, lead.id, dropHint?.targetLeadId === lead.id ? dropHint.placement : 'after')}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className={`bg-white rounded-xl p-3 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                      dropHint?.targetLeadId === lead.id && dropHint.placement === 'before'
                        ? 'border-t-4 border-t-primary-500 border-gray-200'
                        : dropHint?.targetLeadId === lead.id && dropHint.placement === 'after'
                          ? 'border-b-4 border-b-primary-500 border-gray-200'
                          : 'border-gray-200'
                    }`}
                  >
                    <Link to={`/leads/${lead.id}`} className="block">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 leading-tight">{lead.name}</h4>
                        <span className={`badge text-[10px] ml-2 ${PRIORITY_COLORS[lead.priority]}`}>
                          {PRIORITY_LABELS[lead.priority]}
                        </span>
                      </div>

                      {lead.company && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <Building className="w-3 h-3" /> {lead.company}
                        </div>
                      )}

                      {lead.value && (
                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium mb-2">
                          <DollarSign className="w-3 h-3" /> {formatCurrency(lead.value)}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex gap-1 flex-wrap">
                          {lead.tags?.slice(0, 2).map(t => (
                            <span
                              key={t.tagId}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                            >
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                        {lead.assignedTo && (
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600" title={lead.assignedTo.name}>
                            {lead.assignedTo.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}

                {(!stage.leads || stage.leads.length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Arraste leads aqui
                  </div>
                )}

                {allLeads.length > INITIAL_VISIBLE_LEADS && (
                  <button
                    type="button"
                    onClick={() => toggleStageExpansion(stage.id)}
                    className="w-full rounded-xl border border-dashed border-gray-300 bg-white/70 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-gray-900 transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    {isExpanded ? 'Mostrar menos' : `Mostrar tudo${hiddenCount > 0 ? ` (${hiddenCount} restantes)` : ''}`}
                  </button>
                )}
              </div>
            </motion.div>
            );
          })}

          {stages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">Nenhuma etapa criada</p>
                {canManage && <p className="text-sm">Crie a primeira etapa do pipeline</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage Modal */}
      <Modal
        open={stageModal.open}
        onClose={() => setStageModal({ open: false })}
        title={stageModal.stage ? 'Editar Etapa' : 'Nova Etapa'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nome da Etapa</label>
            <input className="input" value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Ex: Prospecção" autoFocus />
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex items-center gap-3">
              <input type="color" value={stageColor} onChange={e => setStageColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
              <span className="text-sm text-gray-500">{stageColor}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setStageModal({ open: false })}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreateStage}>
              {stageModal.stage ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
