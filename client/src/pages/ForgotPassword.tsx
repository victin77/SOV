import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Target, ArrowLeft, Mail } from 'lucide-react';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinicao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/10 backdrop-blur rounded-2xl mb-3 sm:mb-4">
            <Target className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">CRM Leads</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>

          {submitted ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifique seu email</h2>
              <p className="text-sm text-gray-600">
                Se o email <strong>{email}</strong> estiver cadastrado no sistema, voce recebera um link de redefinicao em alguns instantes.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                O link expira em 1 hora. Se nao chegar, confira a caixa de spam.
              </p>
              <Link to="/login" className="btn-primary w-full py-3 mt-6 inline-block">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Esqueci minha senha</h2>
              <p className="text-sm text-gray-500 mb-6">
                Digite o email da sua conta e enviaremos um link pra voce criar uma nova senha.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar link de redefinicao'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
