import { useState, useEffect } from 'react';
import { Plus, Edit2, UserCheck, UserX, MessageCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { ROLE_LABELS } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { isUserOnline } from '../utils/presence';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SELLER', phone: '', whatsappNumber: '' });

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
      if (editing) {
        const data: any = { name: form.name, email: form.email, role: form.role, phone: form.phone || null, whatsappNumber: form.whatsappNumber || null };
        if (form.password) data.password = form.password;
        await api.updateUser(editing.id, data);
      } else {
        if (!form.password) { alert('Senha obrigatoria para novo usuario'); return; }
        await api.createUser(form);
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
    await api.updateUser(u.id, { active: !u.active });
    load();
  };

  const handleDelete = async (u: User) => {
    if (u.id === me?.id) { alert('Voce nao pode remover sua propria conta'); return; }
    if (!confirm('Desativar este usuario?')) return;
    await api.deleteUser(u.id);
    load();
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Usuarios ({users.length})</h2>
        {me?.role === 'ADMIN' && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Novo Usuario
          </button>
        )}
      </div>

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
                  {me?.role === 'ADMIN' && (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleActive(u)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-100">
                        {u.active !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                  {u.whatsappNumber && <p className="text-xs text-gray-400">{u.whatsappNumber}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-primary-100 text-primary-700 text-xs">{ROLE_LABELS[u.role]}</span>
                <span className={`w-2 h-2 rounded-full ${u.active !== false && isUserOnline(u.lastSeenAt) ? 'bg-green-400' : 'bg-gray-400'}`} />
              </div>
            </div>
            {me?.role === 'ADMIN' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button onClick={() => openEdit(u)} className="btn-secondary text-xs flex-1">Editar</button>
                <button onClick={() => handleToggleActive(u)} className="btn-secondary text-xs flex-1">
                  {u.active !== false ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

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
            <label className="label">{editing ? 'Nova Senha (opcional)' : 'Senha *'}</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editing ? 'Deixe vazio para manter' : ''} />
          </div>
          <div>
            <label className="label">Perfil</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
