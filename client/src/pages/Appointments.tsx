import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Calendar, Clock, MapPin, Check, Trash2, ChevronLeft, ChevronRight,
  Pencil, Search,
} from 'lucide-react';
import { api } from '../api/client';
import type { Appointment, Lead } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import Modal from '../components/Modal';

type AppointmentFormState = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  leadId: string;
};

function buildDefaultForm(): AppointmentFormState {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    title: '',
    description: '',
    location: '',
    leadId: '',
    startDate: now.toISOString().slice(0, 16),
    endDate: later.toISOString().slice(0, 16),
  };
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [viewMonth, setViewMonth] = useState(() => {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const [form, setForm] = useState<AppointmentFormState>(buildDefaultForm());

  const load = () => {
    setLoading(true);
    const start = new Date(viewMonth.year, viewMonth.month, 1);
    const end = new Date(viewMonth.year, viewMonth.month + 1, 0, 23, 59, 59);
    api.getAppointments({ startDate: start.toISOString(), endDate: end.toISOString() })
      .then(setAppointments)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [viewMonth]);
  useEffect(() => {
    api.getLeads({ limit: '300', sortBy: 'updatedAt', sortOrder: 'desc' }).then((response) => setLeads(response.leads)).catch(() => {});
  }, []);

  const filteredLeads = useMemo(() => {
    const search = leadSearch.trim().toLowerCase();
    if (!search) return leads.slice(0, 8);

    return leads.filter((lead) => {
      const fields = [lead.name, lead.company, lead.email, lead.phone].filter(Boolean).join(' ').toLowerCase();
      return fields.includes(search);
    }).slice(0, 8);
  }, [leadSearch, leads]);

  const selectedLead = leads.find((lead) => lead.id === form.leadId);

  const navigateMonth = (direction: number) => {
    setViewMonth((currentMonth) => {
      let month = currentMonth.month + direction;
      let year = currentMonth.year;
      if (month < 0) { month = 11; year -= 1; }
      if (month > 11) { month = 0; year += 1; }
      return { year, month };
    });
  };

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const openCreate = () => {
    setEditingAppointment(null);
    setForm(buildDefaultForm());
    setLeadSearch('');
    setModal(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setForm({
      title: appointment.title,
      description: appointment.description || '',
      startDate: new Date(appointment.startDate).toISOString().slice(0, 16),
      endDate: new Date(appointment.endDate).toISOString().slice(0, 16),
      location: appointment.location || '',
      leadId: appointment.leadId,
    });
    setLeadSearch(appointment.lead?.name || appointment.lead?.company || '');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.leadId) return;

    try {
      if (editingAppointment) {
        await api.updateAppointment(editingAppointment.id, form);
      } else {
        await api.createAppointment(form);
      }

      setModal(false);
      setEditingAppointment(null);
      setLeadSearch('');
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleComplete = async (id: string) => {
    await api.updateAppointment(id, { completed: true });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este compromisso?')) return;
    await api.deleteAppointment(id);
    load();
  };

  const groupedAppointments = appointments.reduce<Record<string, Appointment[]>>((accumulator, appointment) => {
    const date = new Date(appointment.startDate).toLocaleDateString('pt-BR');
    (accumulator[date] = accumulator[date] || []).push(appointment);
    return accumulator;
  }, {});

  const sortedDates = Object.keys(groupedAppointments).sort((left, right) => {
    const [leftDay, leftMonth, leftYear] = left.split('/').map(Number);
    const [rightDay, rightMonth, rightYear] = right.split('/').map(Number);
    return new Date(leftYear, leftMonth - 1, leftDay).getTime() - new Date(rightYear, rightMonth - 1, rightDay).getTime();
  });

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{monthLabel}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Edite compromissos e receba lembretes automáticos com 1 hora de antecedência.</p>
          </div>
          <button onClick={() => navigateMonth(1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Novo Compromisso
        </button>
      </div>

      {sortedDates.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 dark:text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
          <p>Nenhum compromisso neste mês</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const [day, month, year] = date.split('/').map(Number);
            const dayName = new Date(year, month - 1, day).toLocaleDateString('pt-BR', { weekday: 'long' });

            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-700">{day}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{date}</p>
                    <p className="text-xs text-gray-500 capitalize">{dayName}</p>
                  </div>
                </div>

                <div className="space-y-2 ml-[52px]">
                  {groupedAppointments[date].map((appointment) => (
                    <div key={appointment.id} className={`card p-4 flex items-start gap-3 ${appointment.completed ? 'opacity-60' : ''}`}>
                      <div className={`w-1 h-full min-h-[40px] rounded-full ${appointment.completed ? 'bg-green-400' : 'bg-primary-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`text-sm font-medium ${appointment.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{appointment.title}</h4>
                            {appointment.description && <p className="text-xs text-gray-500 mt-0.5">{appointment.description}</p>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {!appointment.completed && (
                              <>
                                <button onClick={() => openEdit(appointment)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Editar">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleComplete(appointment.id)} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Concluir">
                                  <Check className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDelete(appointment.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Remover">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(appointment.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(appointment.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {appointment.location && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{appointment.location}</span>
                          )}
                          {appointment.lead && (
                            <Link to={`/leads/${appointment.lead.id}`} className="flex items-center gap-1 text-primary-600 hover:underline">
                              {appointment.lead.name}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Título *</label>
            <input className="input" value={form.title} onChange={e => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Título do compromisso" autoFocus />
          </div>

          <div>
            <label className="label">Lead *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                value={leadSearch}
                onChange={e => {
                  setLeadSearch(e.target.value);
                  if (!e.target.value.trim()) {
                    setForm((current) => ({ ...current, leadId: '' }));
                  }
                }}
                placeholder="Pesquise pelo nome, empresa, email ou telefone"
              />
            </div>

            {selectedLead && (
              <div className="mt-2 p-3 rounded-xl bg-primary-50 border border-primary-100 dark:bg-primary-900/30 dark:border-primary-800">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedLead.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{selectedLead.company || selectedLead.email || selectedLead.phone || 'Lead selecionado'}</p>
              </div>
            )}

            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-600 divide-y divide-gray-100 dark:divide-slate-700">
              {filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 transition-colors ${form.leadId === lead.id ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                  onClick={() => {
                    setForm((current) => ({ ...current, leadId: lead.id }));
                    setLeadSearch(lead.name);
                  }}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{lead.company || lead.email || lead.phone || 'Sem dados extras'}</p>
                </button>
              ))}
              {filteredLeads.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-400 dark:text-slate-500 text-center">Nenhum lead encontrado para essa busca.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Início</label>
              <input type="datetime-local" className="input" value={form.startDate} onChange={e => setForm((current) => ({ ...current, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fim</label>
              <input type="datetime-local" className="input" value={form.endDate} onChange={e => setForm((current) => ({ ...current, endDate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Local</label>
            <input className="input" value={form.location} onChange={e => setForm((current) => ({ ...current, location: e.target.value }))} placeholder="Local do compromisso" />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm((current) => ({ ...current, description: e.target.value }))} />
          </div>

          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={!form.title || !form.leadId}>
              {editingAppointment ? 'Salvar alterações' : 'Criar compromisso'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
