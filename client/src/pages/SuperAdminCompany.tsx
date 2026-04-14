import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, Target, BarChart3, Activity, Plus,
  Shield, LogIn, UserCheck, UserX, X, LogOut, Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import type { SuperAdminCompany, UserRole } from '../types';
import { ROLE_LABELS } from '../types';

interface CompanyMetrics {
  totalLeads: number;
  leadsThisMonth: number;
  wonThisMonth: number;
  totalUsers: number;
  activeUsers: number;
  totalActivities: number;
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({ open, onClose, companyId, onCreated }: { open: boolean; onClose: () => void; companyId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('SELLER');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 8) {
      setError('Senha deve ter no minimo 8 caracteres');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Senha deve conter pelo menos 1 letra e 1 numero');
      return;
    }

    setSaving(true);
    try {
      await api.createCompanyUser(companyId, { name, email, password, role });
      onCreated();
      onClose();
      setName('');
      setEmail('');
      setPassword('');
      setRole('SELLER');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Novo Usuario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" />
          </div>
          <div>
            <label className="label">Cargo</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="SELLER">Vendedor</option>
              <option value="MANAGER">Gerente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Criando...' : 'Criar Usuario'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuperAdminCompany() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enterCompany, logout } = useAuth();

  const [company, setCompany] = useState<SuperAdminCompany | null>(null);
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [enteringCompany, setEnteringCompany] = useState(false);

  const loadData = () => {
    if (!id) return;
    Promise.all([
      api.getSuperAdminCompany(id),
      api.getCompanyMetrics(id),
    ])
      .then(([companyData, metricsData]) => {
        setCompany(companyData);
        setMetrics(metricsData);
      })
      .catch((err: Error) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const handleToggleUser = async (userId: string, currentActive: boolean) => {
    if (!id) return;
    setTogglingUserId(userId);
    try {
      await api.updateCompanyUser(id, userId, { active: !currentActive });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!id) return;
    if (!confirm(`Excluir "${userName}" permanentemente? Esta acao nao pode ser desfeita.`)) return;
    try {
      await api.deleteCompanyUser(id, userId);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEnter = async () => {
    if (!id) return;
    setEnteringCompany(true);
    try {
      await enterCompany(id);
      navigate('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnteringCompany(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-gray-500 dark:text-slate-400">Empresa nao encontrada</p>
          <Link to="/admin" className="btn-primary mt-4 inline-block">Voltar</Link>
        </div>
      </div>
    );
  }

  function timeAgo(dateStr?: string | null) {
    if (!dateStr) return 'Nunca';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}min atras`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atras`;
    const days = Math.floor(hours / 24);
    return `${days}d atras`;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">{company.name}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 block leading-none">/{company.slug}</span>
            </div>
            {!company.active && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 rounded-full">
                Inativa
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEnter}
              disabled={!company.active || enteringCompany}
              className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {enteringCompany ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Entrar no CRM
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard label="Total de leads" value={metrics.totalLeads} icon={Target} color="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" />
            <MetricCard label="Leads este mes" value={metrics.leadsThisMonth} icon={BarChart3} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" />
            <MetricCard label="Ganhos este mes" value={metrics.wonThisMonth} icon={Target} color="bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300" />
            <MetricCard label="Usuarios" value={metrics.totalUsers} icon={Users} color="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300" />
            <MetricCard label="Usuarios ativos" value={metrics.activeUsers} icon={UserCheck} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" />
            <MetricCard label="Atividades" value={metrics.totalActivities} icon={Activity} color="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" />
          </div>
        )}

        {/* Users */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Usuarios ({company.users?.length ?? 0})</h2>
          <button onClick={() => setShowCreateUser(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Novo Usuario
          </button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Nome</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Cargo</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase hidden md:table-cell">Ultimo acesso</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {company.users?.map((u) => (
                <tr key={u.id} className={`border-b border-gray-100 dark:border-slate-800 ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 sm:hidden">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300 rounded-full">
                      {ROLE_LABELS[u.role as UserRole] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400 hidden md:table-cell">
                    {timeAgo(u.lastSeenAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleToggleUser(u.id, u.active)}
                        disabled={togglingUserId === u.id}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1 ${
                          u.active
                            ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10'
                            : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400 dark:hover:bg-green-500/10'
                        }`}
                      >
                        {u.active ? <><UserX className="w-3 h-3" /> Desativar</> : <><UserCheck className="w-3 h-3" /> Ativar</>}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!company.users || company.users.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                    Nenhum usuario nesta empresa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Informacoes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-slate-400">Slug:</span>
              <span className="ml-2 text-gray-900 dark:text-white">/{company.slug}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">Criada em:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{new Date(company.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">Etapas do funil:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{company._count.pipelineStages}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">Tags:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{company._count.tags ?? 0}</span>
            </div>
          </div>
        </div>
      </main>

      {id && <CreateUserModal open={showCreateUser} onClose={() => setShowCreateUser(false)} companyId={id} onCreated={loadData} />}
    </div>
  );
}
