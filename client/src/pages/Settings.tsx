import { useEffect, useState } from 'react';
import { User, Lock, Check, Moon, Sun, MessageCircle, BookOpen, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api/client';
import type { CompanySettingsResponse } from '../types';
import { downloadUserGuide } from '../utils/userGuide';
import { ROLE_LABELS } from '../types';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsappNumber || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwResult, setPwResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const canManageCompany = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';
  const [companySettings, setCompanySettings] = useState<CompanySettingsResponse | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [apiVersion, setApiVersion] = useState('v22.0');
  const [apiToken, setApiToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [whatsSaving, setWhatsSaving] = useState(false);
  const [companyResult, setCompanyResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!canManageCompany) return;

    api.getCurrentCompanySettings()
      .then((data) => {
        setCompanySettings(data);
        setCompanyName(data.company.name);
        setWhatsappEnabled(data.whatsappConfig.enabled);
        setPhoneNumberId(data.whatsappConfig.phoneNumberId || '');
        setApiVersion(data.whatsappConfig.apiVersion || 'v22.0');
      })
      .catch((err: Error) => {
        setCompanyResult({ ok: false, msg: err.message });
      });
  }, [canManageCompany]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name, phone, whatsappNumber });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPwResult({ ok: false, msg: 'Senhas nao coincidem' });
      return;
    }
    if (newPassword.length < 6) {
      setPwResult({ ok: false, msg: 'Senha deve ter pelo menos 6 caracteres' });
      return;
    }

    setPwSaving(true);
    setPwResult(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPwResult({ ok: true, msg: 'Senha alterada com sucesso' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwResult({ ok: false, msg: err.message });
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    setCompanySaving(true);
    setCompanyResult(null);
    try {
      const updatedCompany = await api.updateCurrentCompany({ name: companyName });
      setCompanySettings((current) => current ? { ...current, company: updatedCompany } : current);
      setCompanyResult({ ok: true, msg: 'Empresa atualizada com sucesso' });
    } catch (err: any) {
      setCompanyResult({ ok: false, msg: err.message });
    } finally {
      setCompanySaving(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    setWhatsSaving(true);
    setCompanyResult(null);
    try {
      const updatedConfig = await api.updateCurrentCompanyWhatsApp({
        enabled: whatsappEnabled,
        phoneNumberId,
        apiVersion,
        apiToken: apiToken || undefined,
        webhookVerifyToken: verifyToken || undefined,
        appSecret: appSecret || undefined,
      });

      setCompanySettings((current) => current ? {
        ...current,
        whatsappConfig: {
          ...current.whatsappConfig,
          ...updatedConfig,
          phoneNumberId,
          apiVersion,
          enabled: whatsappEnabled,
        },
      } : current);
      setApiToken('');
      setVerifyToken('');
      setAppSecret('');
      setCompanyResult({ ok: true, msg: 'Integracao do WhatsApp salva com sucesso' });
    } catch (err: any) {
      setCompanyResult({ ok: false, msg: err.message });
    } finally {
      setWhatsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meu Perfil</h2>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center dark:bg-primary-500/20">
            <User className="w-6 h-6 text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-slate-300">
              {user?.email} &middot; {ROLE_LABELS[user?.role || 'SELLER']}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="label">Seu WhatsApp</label>
            <input
              className="input"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="5511999999999"
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-300">
              Use o numero com DDD. O CRM usa isso para identificacao do consultor e atalhos de contato.
            </p>
          </div>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
            {saved ? <><Check className="w-4 h-4" /> Salvo!</> : saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          {theme === 'dark'
            ? <Moon className="w-5 h-5 text-gray-400 dark:text-slate-300" />
            : <Sun className="w-5 h-5 text-gray-400 dark:text-slate-300" />}
          <h3 className="font-semibold text-gray-900 dark:text-white">Aparencia</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'light'
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-slate-800'
                : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
            onClick={() => setTheme('light')}
          >
            <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              <Sun className="w-4 h-4" /> Modo claro
            </span>
            <p className="text-sm text-gray-500 mt-2 dark:text-slate-300">
              Interface leve para uso durante o dia.
            </p>
          </button>

          <button
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'dark'
                ? 'border-primary-400 bg-slate-800'
                : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
            onClick={() => setTheme('dark')}
          >
            <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              <Moon className="w-4 h-4" /> Modo escuro
            </span>
            <p className="text-sm text-gray-500 mt-2 dark:text-slate-300">
              Visual mais confortavel para uso prolongado.
            </p>
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-3">
          <MessageCircle className="w-5 h-5 text-gray-400 dark:text-slate-300" />
          <h3 className="font-semibold text-gray-900 dark:text-white">WhatsApp no CRM</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          O envio e feito dentro do CRM pela ficha do lead. Se a Cloud API do WhatsApp estiver configurada no backend,
          a mensagem sai direto pelo sistema. Se nao estiver, o CRM ainda gera o link de conversa como fallback.
        </p>
      </div>

      {canManageCompany && (
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Empresa e Integracoes</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
              Essas configuracoes pertencem a empresa logada. Cada empresa pode usar suas proprias credenciais.
            </p>
          </div>

          {companyResult && (
            <div className={`p-3 rounded-lg text-sm ${companyResult.ok ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>
              {companyResult.msg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">Nome da empresa</label>
              <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <button onClick={handleSaveCompany} disabled={companySaving || !companyName.trim()} className="btn-primary">
              {companySaving ? 'Salvando empresa...' : 'Salvar empresa'}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-slate-700 space-y-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">WhatsApp Business Cloud API</p>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                Se estiver desativado ou incompleto, o CRM cai no fallback por link.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-slate-200">
              <input type="checkbox" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} />
              Ativar integracao oficial desta empresa
            </label>

            <div>
              <label className="label">Phone Number ID</label>
              <input className="input" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="123456789012345" />
            </div>

            <div>
              <label className="label">API Version</label>
              <input className="input" value={apiVersion} onChange={(e) => setApiVersion(e.target.value)} placeholder="v22.0" />
            </div>

            <div>
              <label className="label">API Token</label>
              <input className="input" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder={companySettings?.whatsappConfig.tokenConfigured ? 'Ja configurado. Preencha apenas para trocar.' : 'EAAG...'} />
            </div>

            <div>
              <label className="label">Webhook Verify Token</label>
              <input className="input" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder={companySettings?.whatsappConfig.verifyTokenConfigured ? 'Ja configurado. Preencha apenas para trocar.' : 'token-de-verificacao'} />
            </div>

            <div>
              <label className="label">App Secret</label>
              <input className="input" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={companySettings?.whatsappConfig.appSecretConfigured ? 'Ja configurado. Preencha apenas para trocar.' : 'opcional, mas recomendado'} />
            </div>

            <div className="text-xs text-gray-500 dark:text-slate-300 space-y-1">
              <p>Webhook: {companySettings?.whatsappConfig.webhookPath || '/api/whatsapp/webhook'}</p>
              <p>Provider atual: {companySettings?.whatsappConfig.provider || 'link_only'}</p>
              <p>Configurado: {companySettings?.whatsappConfig.configured ? 'sim' : 'nao'}</p>
            </div>

            <button onClick={handleSaveWhatsApp} disabled={whatsSaving} className="btn-primary">
              {whatsSaving ? 'Salvando integracao...' : 'Salvar integracao do WhatsApp'}
            </button>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-5 h-5 text-gray-400 dark:text-slate-300" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Guia do Usuario</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
          Baixe o guia completo do CRM com passo a passo de todas as funcionalidades, dicas de uso e como configurar o WhatsApp.
        </p>
        <button onClick={downloadUserGuide} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" /> Baixar guia completo
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-gray-400 dark:text-slate-300" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Alterar Senha</h3>
        </div>

        {pwResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${pwResult.ok ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>
            {pwResult.msg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Senha Atual</label>
            <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Nova Senha</label>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirmar Nova Senha</label>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button onClick={handleChangePassword} disabled={pwSaving || !currentPassword || !newPassword} className="btn-primary">
            {pwSaving ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>
    </div>
  );
}
