import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight,
  Building, Mail, Phone, Trash2, Edit2, Eye,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Lead, Tag, User as UserType, PipelineStage } from '../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { celebrateDealWon } from '../utils/celebration';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function normalizeLabel(value?: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default function Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Create/Edit modal
  const [modal, setModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', position: '', source: '', value: '', notes: '', priority: 'MEDIUM', status: 'NEW', assignedToId: '', stageId: '' });

  const defaultStageId = stages.find((stage) => /^(novo|new)$/.test(normalizeLabel(stage.name)))?.id
    || stages.find((stage) => /(novo|new)/.test(normalizeLabel(stage.name)))?.id
    || stages[0]?.id
    || '';

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: page.toString(), limit: '20' };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (assignedFilter && user?.role !== 'SELLER') params.assignedToId = assignedFilter;
    if (dateFromFilter) params.dateFrom = dateFromFilter;
    if (dateToFilter) params.dateTo = dateToFilter;

    api.getLeads(params)
      .then(d => { setLeads(d.leads); setTotal(d.total); setTotalPages(d.totalPages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, statusFilter, priorityFilter, assignedFilter, dateFromFilter, dateToFilter]);
  useEffect(() => {
    api.getTags().then(setTags).catch(() => {});
    api.getUsers().then(setUsers).catch(() => {});
    api.getPipeline().then((pipeline) => setStages(pipeline.map(({ id, name, color, order, isDefault }) => ({ id, name, color, order, isDefault })))).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openCreate = () => {
    setEditingLead(null);
    setForm({ name: '', email: '', phone: '', company: '', position: '', source: '', value: '', notes: '', priority: 'MEDIUM', status: 'NEW', assignedToId: '', stageId: defaultStageId });
    setModal(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name, email: lead.email || '', phone: lead.phone || '',
      company: lead.company || '', position: lead.position || '',
      source: lead.source || '', value: lead.value?.toString() || '',
      notes: lead.notes || '', priority: lead.priority, status: lead.status,
      assignedToId: lead.assignedToId || '', stageId: lead.stageId || '',
    });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        value: form.value ? parseFloat(form.value) : null,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        position: form.position || null,
        source: form.source || null,
        notes: form.notes || null,
        assignedToId: form.assignedToId || undefined,
        stageId: form.stageId || undefined,
      };
      if (editingLead) {
        await api.updateLead(editingLead.id, data);
      } else {
        await api.createLead(data);
      }
      if (form.status === 'WON' && (!editingLead || editingLead.status !== 'WON')) {
        celebrateDealWon();
      }
      setModal(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este lead?')) return;
    await api.deleteLead(id);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">
          Leads <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      {/* Search + Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Buscar por nome, email, empresa, telefone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary text-sm">Buscar</button>
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-200">
            <select className="input w-auto" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Todos os Status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="input w-auto" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}>
              <option value="">Todas Prioridades</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {user?.role !== 'SELLER' && (
              <select className="input w-auto" value={assignedFilter} onChange={e => { setAssignedFilter(e.target.value); setPage(1); }}>
                <option value="">Todos os consultores</option>
                {users.filter(u => u.active !== false).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">De</span>
              <input
                type="date"
                className="input w-auto"
                value={dateFromFilter}
                onChange={e => { setDateFromFilter(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Até</span>
              <input
                type="date"
                className="input w-auto"
                value={dateToFilter}
                onChange={e => { setDateToFilter(e.target.value); setPage(1); }}
              />
            </div>
            {(statusFilter || priorityFilter || assignedFilter || dateFromFilter || dateToFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                  setAssignedFilter('');
                  setDateFromFilter('');
                  setDateToFilter('');
                  setPage(1);
                }}
                className="text-sm text-primary-600 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? <PageLoading /> : (
        <>
          {/* Desktop Table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Lead</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Prioridade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Valor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Responsavel</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/leads/${lead.id}`} className="hover:text-primary-600">
                          <p className="font-medium text-gray-900">{lead.name}</p>
                          <p className="text-xs text-gray-500">{lead.email || lead.phone || '—'}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.company || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${PRIORITY_COLORS[lead.priority]}`}>{PRIORITY_LABELS[lead.priority]}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.value ? formatCurrency(lead.value) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.assignedTo?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/leads/${lead.id}`} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button onClick={() => openEdit(lead)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhum lead encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {leads.map(lead => (
              <div key={lead.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link to={`/leads/${lead.id}`}>
                    <h3 className="font-medium text-gray-900">{lead.name}</h3>
                    {lead.company && <p className="text-xs text-gray-500 flex items-center gap-1"><Building className="w-3 h-3" />{lead.company}</p>}
                  </Link>
                  <span className={`badge text-xs ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                  {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                  {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${PRIORITY_COLORS[lead.priority]}`}>{PRIORITY_LABELS[lead.priority]}</span>
                    {lead.value && <span className="text-sm font-medium text-green-600">{formatCurrency(lead.value)}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(lead)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {leads.length === 0 && <p className="text-center py-12 text-gray-400">Nenhum lead encontrado</p>}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} de {total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm p-2 disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-sm text-gray-600">{page}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm p-2 disabled:opacity-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editingLead ? 'Editar Lead' : 'Novo Lead'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nome *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do lead" autoFocus />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input className="input" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Nome da empresa" />
          </div>
          <div>
            <label className="label">Cargo</label>
            <input className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Cargo" />
          </div>
          <div>
            <label className="label">Fonte</label>
            <input className="input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Ex: Site, Indicação, LinkedIn" />
          </div>
          <div>
            <label className="label">Valor Estimado (R$)</label>
            <input className="input" type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Etapa no Kanban</label>
            <select className="input" value={form.stageId} onChange={e => setForm(f => ({ ...f, stageId: e.target.value }))}>
              <option value="">Automático</option>
              {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Prioridade</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {users.length > 0 && (
            <div className="sm:col-span-2">
              <label className="label">Responsavel</label>
              <select className="input" value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Selecionar...</option>
                {users.filter(u => u.active !== false).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label">Notas</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observacoes sobre o lead..." />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
            {editingLead ? 'Salvar' : 'Criar Lead'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
