import { useState, FormEvent } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function ForcePasswordChange() {
  const { user, updateUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || !user.mustChangePassword) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas novas nao conferem.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('A nova senha precisa ser diferente da temporaria.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      updateUser({ ...user, mustChangePassword: false });
    } catch (err: any) {
      setError(err.message || 'Erro ao trocar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur flex items-center justify-center p-4 safe-top safe-bottom overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md my-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Defina uma nova senha</h2>
            <p className="text-xs text-gray-500">Sua senha atual e temporaria e precisa ser trocada agora.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Senha temporaria (atual)</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Nova senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres, com pelo menos 1 letra e 1 número.</p>
          </div>
          <div>
            <label className="label">Confirmar nova senha</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={logout} className="btn-secondary flex-1">
              Sair
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
