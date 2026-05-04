import { useState, useEffect } from 'react';
import { Plus, Edit2, UserCheck, UserX, MessageCircle, Trash2, KeyRound, Copy, Check } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { ROLE_LABELS } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { isUserOnline } from '../utils/presence';

function isStrongPassword(password: string) {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SELLER', phone: '', whatsappNumber: '' });
  const [resetResult, setResetResult] = useState<{ userName: string; userEmail: string; temporaryPassword: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN';

  const load = () => {
    api.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'SELLER', phone: '', whatsappNumber: '' });
    setModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', whatsappNumber: u.whatsappNumber || '' });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      if (form.password && !isStrongPassword(form.password)) {
        alert('Senha deve ter no minimo 8 caracteres, com pelo menos 1 letra e 1 numero');
        return;
      }
      if (editing) {
        const data: any = { name: form.name, email: form.email, role: form.role, phone: form.phone || null, whatsappNumber: form.whatsappNumber || null };
        if (form.password) data.password = form.password;
        await api.updateUser(editing.id, data);
      } else {
        const payload: any = { name: form.name, email: form.email, role: form.role, phone: form.phone || null, whatsappNumber: form.whatsappNumber || null };
        if (form.password) payload.password = form.password;
        await api.createUser(payload);
      }
      setModal(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === me?.id) { alert('Voce nao pode desativar sua propria conta'); return; }
    if (!confirm(u.active ? 'Desativar este usuario?' : 'Reativar este usuario?')) return;
    try {
      await api.updateUser(u.id, { active: !u.active });
      load();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do usuario');
    }
  };

  const handleResetPassword = async (u: User) => {
    if (u.id === me?.id) { alert('Use a tela de perfil para alterar sua propria senha.'); return; }
    if (!confirm(`Gerar nova senha temporaria para "${u.name}"? A senha atual sera invalidada e o usuario sera forcado a trocar no proximo login.`)) return;
    try {
      const result = await api.adminResetUserPassword(u.id);
      setResetResult({
        userName: u.name,
        userEmail: u.email,
        temporaryPassword: result.temporaryPassword,
        emailSent: result.emailSent,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao redefinir senha');
    }
  };

  const handleCopyPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const handleDelete = async (u: User) => {
    if (u.id === me?.id) { alert('Voce nao pode excluir sua propria conta'); return; }
    if (!confirm(`Excluir "${u.name}" permanentemente? Esta acao nao pode ser desfeita. Os leads atribuidos a este usuario serao desvinculados.`)) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuario');
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 truncate">Usuarios ({users.length})</h2>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Usuario</span><span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Voce tem acesso somente para consultar usuarios. Alteracoes exigem perfil ADMIN.
        </div>
      )}

      {/* Desktop Table */}
      <div className="card overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Perfil</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Leads</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center font-bold text-sm text-primary-600">
                        {u.name.charAt(0)}
                      </div>
                      <span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white ${isUserOnline(u.lastSeenAt) ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {u.whatsappNumber && <p className="text-xs text-gray-400">{u.whatsappNumber}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="badge bg-primary-100 text-primary-700">{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{u._count?.leads || 0}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.active !== false ? (isUserOnline(u.lastSeenAt) ? 'Online' : 'Ativo') : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleResetPassword(u)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100" title="Redefinir senha">
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleToggleActive(u)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-100" title={u.active !== false ? 'Desativar' : 'Reativar'}>
                        {u.active !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100" title="Excluir permanentemente">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {users.map(u => (
          <div key={u.id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600 flex-shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  {u.whatsappNumber && <p className="text-xs text-gray-400 truncate">{u.whatsappNumber}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="badge bg-primary-100 text-primary-700 text-xs">{ROLE_LABELS[u.role]}</span>
                <span className={`w-2 h-2 rounded-full ${u.active !== false && isUserOnline(u.lastSeenAt) ? 'bg-green-400' : 'bg-gray-400'}`} />
              </div>
            </div>
            {isAdmin && (
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                <button onClick={() => openEdit(u)} className="btn-secondary text-xs">Editar</button>
                {u.id !== me?.id && (
                  <button onClick={() => handleResetPassword(u)} className="btn-secondary text-xs">Nova senha</button>
                )}
                <button onClick={() => handleToggleActive(u)} className="btn-secondary text-xs">
                  {u.active !== false ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => handleDelete(u)} className="btn-secondary text-xs text-red-600 hover:bg-red-50">Excluir</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reset Password Result Modal */}
      <Modal
        open={!!resetResult}
        onClose={() => { setResetResult(null); setCopied(false); }}
        title="Senha temporaria gerada"
        size="md"
      >
        {resetResult && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Copie e envie essa senha para <strong>{resetResult.userName}</strong> ({resetResult.userEmail}) de forma segura.
              Ela so aparece agora — nao sera possivel ver de novo depois. O usuario sera forcado a trocar no proximo login.
            </div>

            <div>
              <label className="label">Senha temporaria</label>
              <div className="flex gap-2">
                <input
                  className="input font-mono"
                  value={resetResult.temporaryPassword}
                  readOnly
                  onFocus={e => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="btn-secondary flex items-center gap-1 whitespace-nowrap"
                  title="Copiar"
                >
                  {copied ? <><Check className="w-4 h-4 text-green-600" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
                </button>
              </div>
            </div>

            <div className={`rounded-lg border px-4 py-3 text-sm ${resetResult.emailSent ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              {resetResult.emailSent
                ? 'Um email com a senha temporaria foi enviado para o usuario.'
                : 'Nao foi possivel enviar email automaticamente. Repasse a senha por outro canal seguro.'}
            </div>

            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => { setResetResult(null); setCopied(false); }}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Usuario' : 'Novo Usuario'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">{editing ? 'Nova Senha (opcional)' : 'Senha (opcional)'}</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editing ? 'Deixe vazio para manter' : 'Deixe vazio se o usuario for logar so com Google'} />
            <p className="text-xs text-gray-500 mt-1">
              {editing ? 'Se preenchida, deve ter mínimo 8 caracteres, 1 letra e 1 número.' : 'Sem senha, o usuário só poderá entrar via Google. Pode usar "Esqueci a senha" para definir uma depois.'}
            </p>
          </div>
          <div>
            <label className="label">Perfil</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'SUPER_ADMIN').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <div className="relative">
              <MessageCircle className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className="input pl-9" value={form.whatsappNumber} onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={!form.name || !form.email}>
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
