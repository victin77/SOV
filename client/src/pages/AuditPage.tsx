import { useState, useEffect } from 'react';
import { Shield, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react';
import { api } from '../api/client';
import type { AuditLog } from '../types';
import { PageLoading } from '../components/LoadingSpinner';

const todayStr = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const shiftDay = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const formatDayLabel = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = todayStr();
  const yesterday = shiftDay(today, -1);
  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  REGISTER: 'bg-green-100 text-green-700',
  CREATE_LEAD: 'bg-emerald-100 text-emerald-700',
  UPDATE_LEAD: 'bg-amber-100 text-amber-700',
  DELETE_LEAD: 'bg-red-100 text-red-700',
  MOVE_LEAD: 'bg-purple-100 text-purple-700',
  CREATE_APPOINTMENT: 'bg-cyan-100 text-cyan-700',
  IMPORT_LEADS: 'bg-indigo-100 text-indigo-700',
  CREATE_USER: 'bg-teal-100 text-teal-700',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: page.toString(), limit: '30' };
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entity = entityFilter;
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      params.startDate = start.toISOString();
      params.endDate = end.toISOString();
    }

    api.getAuditLogs(params)
      .then(d => { setLogs(d.logs); setTotal(d.total); setTotalPages(d.totalPages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, actionFilter, entityFilter, selectedDate]);

  const changeDay = (days: number) => { setSelectedDate(d => shiftDay(d, days)); setPage(1); };
  const goToday = () => { setSelectedDate(todayStr()); setPage(1); };
  const clearDate = () => { setSelectedDate(''); setPage(1); };
  const isToday = selectedDate === todayStr();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Auditoria ({total})</h2>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => changeDay(-1)} className="btn-secondary text-sm p-2" title="Dia anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setPage(1); }}
              max={todayStr()}
              className="bg-transparent text-sm outline-none"
            />
            {selectedDate && (
              <span className="text-sm font-medium text-gray-700 capitalize">
                &middot; {formatDayLabel(selectedDate)}
              </span>
            )}
          </div>
          <button
            onClick={() => changeDay(1)}
            disabled={isToday || !selectedDate}
            className="btn-secondary text-sm p-2 disabled:opacity-50"
            title="Proximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button onClick={goToday} className="btn-secondary text-sm px-3 py-2">Hoje</button>
          )}
          {selectedDate ? (
            <button onClick={clearDate} className="text-sm text-gray-500 hover:text-gray-700 px-2">Ver todos</button>
          ) : (
            <button onClick={goToday} className="text-sm text-blue-600 hover:text-blue-700 px-2">Filtrar por dia</button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">Todas as Acoes</option>
          <option value="LOGIN">Login</option>
          <option value="CREATE_LEAD">Criar Lead</option>
          <option value="UPDATE_LEAD">Atualizar Lead</option>
          <option value="DELETE_LEAD">Remover Lead</option>
          <option value="MOVE_LEAD">Mover Lead</option>
          <option value="CREATE_APPOINTMENT">Criar Compromisso</option>
          <option value="IMPORT_LEADS">Importar Leads</option>
          <option value="CREATE_USER">Criar Usuario</option>
        </select>
        <select className="input w-auto text-sm" value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}>
          <option value="">Todas Entidades</option>
          <option value="lead">Lead</option>
          <option value="user">Usuario</option>
          <option value="appointment">Compromisso</option>
          <option value="pipeline_stage">Pipeline</option>
        </select>
        </div>
      </div>

      {loading ? <PageLoading /> : (
        <>
          {/* Desktop */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Acao</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Entidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{log.user?.name}</p>
                      <p className="text-xs text-gray-500">{log.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.entity}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={JSON.stringify(log.details)}>
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhum registro</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {logs.map(log => (
              <div key={log.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge text-xs ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>{log.action}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{log.user?.name} <span className="text-gray-400">&middot; {log.entity}</span></p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Pagina {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm p-2 disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm p-2 disabled:opacity-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
