import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, Target, TrendingUp, TrendingDown, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, Trophy, Activity,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { DashboardData, TrendData, User } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import { isUserOnline } from '../utils/presence';

const PIE_COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#f59e0b', '#f97316', '#22c55e', '#ef4444'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [consultants, setConsultants] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = selectedUserId ? { userId: selectedUserId } : undefined;
    Promise.all([api.getDashboard(params), api.getDashboardTrend(params)])
      .then(([d, t]) => { setData(d); setTrend(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  useEffect(() => {
    if (user?.role === 'SELLER') return;
    api.getUsers().then(setConsultants).catch(() => {});
  }, [user?.role]);

  if (loading || !data) return <PageLoading />;

  const { kpis, charts, topSellers, recentActivities, upcomingAppointments } = data;

  return (
    <div className="space-y-6">
      {user?.role !== 'SELLER' && (
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Visão por consultor</p>
            <p className="text-sm text-gray-500">Filtre o dashboard para analisar a operação de um consultor específico.</p>
          </div>
          <select className="input sm:w-[260px]" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
            <option value="">Todos os consultores</option>
            {consultants.filter((consultant) => consultant.active !== false).map((consultant) => (
              <option key={consultant.id} value={consultant.id}>{consultant.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Leads"
          value={kpis.totalLeads}
          icon={Target}
          color="bg-blue-500"
        />
        <KpiCard
          label="Novos este Mes"
          value={kpis.newLeadsThisMonth}
          growth={parseFloat(kpis.newLeadsGrowth)}
          icon={Users}
          color="bg-primary-500"
        />
        <KpiCard
          label="Ganhos no Mes"
          value={kpis.wonThisMonth}
          growth={parseFloat(kpis.wonGrowth)}
          icon={Trophy}
          color="bg-green-500"
        />
        <KpiCard
          label="Valor Pipeline"
          value={formatCurrency(kpis.pipelineValue)}
          subtitle={`Ganhos: ${formatCurrency(kpis.wonValue)}`}
          icon={DollarSign}
          color="bg-amber-500"
        />
      </div>

      {/* Conversion + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Taxa de Conversao</h3>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary-600">{kpis.conversionRate}%</p>
            <p className="text-sm text-gray-500 mt-1">Leads convertidos este mes</p>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <span className="text-green-600 font-medium">{kpis.wonThisMonth} ganhos</span>
              <span className="text-red-600 font-medium">{kpis.lostThisMonth} perdidos</span>
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Tendencia (12 meses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#6366f1" name="Criados" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="won" stroke="#22c55e" name="Ganhos" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Perdidos" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.leadsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`}>
                {charts.leadsByStatus.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Por Fonte</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.leadsBySource} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Por Prioridade</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.leadsByPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Sellers */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Top Vendedores</h3>
          <div className="space-y-3">
            {topSellers.slice(0, 5).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                <div className="relative">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-600">
                    {s.name.charAt(0)}
                  </div>
                  <span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white ${isUserOnline(s.lastSeenAt) ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {s.totalLeads} leads | {s.wonThisMonth} ganhos | {isUserOnline(s.lastSeenAt) ? 'online' : 'offline'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600">{formatCurrency(s.wonValue)}</span>
              </div>
            ))}
            {topSellers.length === 0 && <p className="text-sm text-gray-400">Sem dados</p>}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Atividades Recentes</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {recentActivities.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700">{a.description}</p>
                  <p className="text-xs text-gray-400">
                    {a.lead?.name && <Link to={`/leads/${a.leadId}`} className="text-primary-600 hover:underline">{a.lead.name}</Link>}
                    {' '}&middot; {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && <p className="text-sm text-gray-400">Sem atividades</p>}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Proximos Compromissos</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {upcomingAppointments.map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">
                    {a.lead?.name && <span>{a.lead.name} &middot; </span>}
                    {new Date(a.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {upcomingAppointments.length === 0 && <p className="text-sm text-gray-400">Nenhum compromisso</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, growth, subtitle, icon: Icon, color }: {
  label: string;
  value: string | number;
  growth?: number;
  subtitle?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs sm:text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      {growth !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs sm:text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {growth >= 0 ? <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />}
          <span>{Math.abs(growth)}% vs mes anterior</span>
        </div>
      )}
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
