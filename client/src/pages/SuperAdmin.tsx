import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Target, Plus, LogIn, Power, PowerOff,
  X, Eye, BarChart3, LogOut, Shield, Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import type { SuperAdminDashboard, SuperAdminCompany } from '../types';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CreateCompanyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!name.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    if (adminPassword.length < 8) {
      setError('Senha deve ter no minimo 8 caracteres');
      return;
    }
    if (!/[a-zA-Z]/.test(adminPassword) || !/[0-9]/.test(adminPassword)) {
      setError('Senha deve conter pelo menos 1 letra e 1 numero');
      return;
    }

    setSaving(true);
    try {
      await api.createCompany({ name, adminName, adminEmail, adminPassword });
      onCreated();
      onClose();
      setName('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nova Empresa</h3>
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
            <label className="label">Nome da Empresa</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Empresa XYZ" />
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Administrador da empresa</p>

            <div className="space-y-3">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Nome do administrador" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@empresa.com" />
              </div>
              <div>
                <label className="label">Senha</label>
                <input className="input" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Minimo 8 caracteres, 1 letra e 1 numero" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Criando...' : 'Criar Empresa'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuperAdmin() {
  const { user, enterCompany, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadDashboard = () => {
    api.getSuperAdminDashboard()
      .then(setDashboard)
      .catch((err: Error) => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleEnterCompany = async (companyId: string) => {
    setEnteringId(companyId);
    try {
      await enterCompany(companyId);
      navigate('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnteringId(null);
    }
  };

  const handleToggleActive = async (company: SuperAdminCompany) => {
    setTogglingId(company.id);
    try {
      await api.updateCompany(company.id, { active: !company.active });
      loadDashboard();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteCompany = async (company: SuperAdminCompany) => {
    if (!confirm(`Excluir "${company.name}" permanentemente?\n\nTodos os dados serao apagados: usuarios, leads, pipeline, tags, agendamentos, atividades e configuracoes.\n\nEsta acao NAO pode ser desfeita.`)) return;
    if (!confirm(`TEM CERTEZA? Digite OK para confirmar a exclusao de "${company.name}".`)) return;
    try {
      await api.deleteCompany(company.id);
      loadDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">Super Admin</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 block leading-none">Painel de controle</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-slate-400 hidden sm:block">{user?.name}</span>
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
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Empresas" value={dashboard?.totalCompanies ?? 0} icon={Building2} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" />
          <StatCard label="Ativas" value={dashboard?.activeCompanies ?? 0} icon={BarChart3} color="bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300" />
          <StatCard label="Usuarios totais" value={dashboard?.totalUsers ?? 0} icon={Users} color="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" />
          <StatCard label="Leads totais" value={dashboard?.totalLeads ?? 0} icon={Target} color="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" />
        </div>

        {/* Companies header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Empresas</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Empresa
          </button>
        </div>

        {/* Companies list */}
        <div className="space-y-3">
          <AnimatePresence>
            {dashboard?.companies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`card p-5 ${!company.active ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Company info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{company.name}</h3>
                      {!company.active && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 rounded-full">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                      /{company.slug} &middot; Criada em {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5" title="Usuarios">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{company._count.users}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Leads">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{company._count.leads}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/company/${company.id}`}
                      className="text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Detalhes
                    </Link>
                    <button
                      onClick={() => handleEnterCompany(company.id)}
                      disabled={!company.active || enteringId === company.id}
                      className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                      title="Entrar no sistema desta empresa"
                    >
                      {enteringId === company.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      Entrar
                    </button>

                    <button
                      onClick={() => handleToggleActive(company)}
                      disabled={togglingId === company.id}
                      className={`text-sm px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                        company.active
                          ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10'
                          : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400 dark:hover:bg-green-500/10'
                      }`}
                      title={company.active ? 'Desativar empresa' : 'Reativar empresa'}
                    >
                      {company.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {company.active ? 'Desativar' : 'Ativar'}
                    </button>

                    <button
                      onClick={() => handleDeleteCompany(company)}
                      className="text-sm px-3 py-1.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/15 flex items-center gap-1.5 transition-colors"
                      title="Excluir empresa permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {dashboard?.companies.length === 0 && (
            <div className="card p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-slate-400">Nenhuma empresa cadastrada</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
                Criar primeira empresa
              </button>
            </div>
          )}
        </div>
      </main>

      <CreateCompanyModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadDashboard} />
    </div>
  );
}
