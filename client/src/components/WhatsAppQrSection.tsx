import { useEffect, useRef, useState } from 'react';
import {
  QrCode, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Building2, User as UserIcon, Loader2, X,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type QrSession = {
  id: string;
  label: string;
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_PENDING' | 'CONNECTED' | 'ERROR';
  phoneNumber: string | null;
  userId: string | null;
  lastError: string | null;
  connectedAt: string | null;
  user?: { id: string; name: string };
};

export default function WhatsAppQrSection() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [sessions, setSessions] = useState<QrSession[]>([]);
  const [preference, setPreference] = useState<'COMPANY' | 'PERSONAL'>('COMPANY');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        api.getWhatsAppQrSessions(),
        api.getWhatsAppPreference(),
      ]);
      setSessions(s.sessions);
      setPreference(p.preference);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const handlePreference = async (pref: 'COMPANY' | 'PERSONAL') => {
    setPreference(pref);
    try {
      await api.setWhatsAppPreference(pref);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Desconectar e remover essa sessão?')) return;
    try {
      await api.deleteWhatsAppQrSession(id);
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReconnect = async (id: string) => {
    try {
      await api.reconnectWhatsAppQrSession(id);
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const companySessions = sessions.filter((s) => !s.userId);
  const mySessions = sessions.filter((s) => s.userId === user?.id);
  const otherSessions = sessions.filter((s) => s.userId && s.userId !== user?.id);

  return (
    <div className="card p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <QrCode className="w-5 h-5 text-gray-400 dark:text-slate-300" />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">WhatsApp via QR Code</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Alternativa à Cloud API: escaneie o QR no celular pra conectar.
          </p>
        </div>
      </div>

      {/* Preferência */}
      <div className="border-t border-gray-200 pt-4 dark:border-slate-700">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
          Qual número usar pra enviar mensagens?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handlePreference('COMPANY')}
            className={`flex items-start gap-3 p-3 border-2 rounded-lg text-left transition-colors ${
              preference === 'COMPANY'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/15'
                : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600'
            }`}
          >
            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-300 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Número da empresa</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Compartilhado entre todos</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handlePreference('PERSONAL')}
            className={`flex items-start gap-3 p-3 border-2 rounded-lg text-left transition-colors ${
              preference === 'PERSONAL'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/15'
                : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600'
            }`}
          >
            <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-300 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Meu número</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">A sessão que você cadastrou</div>
            </div>
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
          Se a opção escolhida não estiver conectada, o CRM cai automaticamente na Cloud API (se configurada) ou no link de conversa.
        </p>
      </div>

      {/* Sessions */}
      {loading ? (
        <div className="text-sm text-gray-500 dark:text-slate-400">Carregando…</div>
      ) : (
        <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-slate-700">
          {(isAdminOrManager || companySessions.length > 0) && (
            <Group title="Conexões da empresa" subtitle="Compartilhadas">
              {companySessions.map((s) => (
                <SessionCard key={s.id} session={s} onDelete={handleDelete} onReconnect={handleReconnect} />
              ))}
              {companySessions.length === 0 && (
                <EmptyHint>Nenhum número da empresa cadastrado.</EmptyHint>
              )}
            </Group>
          )}

          <Group title="Meu número" subtitle="Apenas você usa">
            {mySessions.map((s) => (
              <SessionCard key={s.id} session={s} onDelete={handleDelete} onReconnect={handleReconnect} />
            ))}
            {mySessions.length === 0 && <EmptyHint>Você ainda não cadastrou um número pessoal.</EmptyHint>}
          </Group>

          {isAdminOrManager && otherSessions.length > 0 && (
            <Group title="Outros usuários" subtitle="Visível para admin/gerente">
              {otherSessions.map((s) => (
                <SessionCard key={s.id} session={s} onDelete={handleDelete} onReconnect={handleReconnect} showOwner />
              ))}
            </Group>
          )}
        </div>
      )}

      <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
        <Plus className="w-4 h-4" /> Conectar novo número via QR
      </button>

      {showCreate && (
        <CreateModal
          isAdminOrManager={isAdminOrManager}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function Group({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
        {title}
        {subtitle && <span className="ml-2 text-xs text-gray-500 dark:text-slate-400 font-normal">— {subtitle}</span>}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2">
      {children}
    </div>
  );
}

function SessionCard({
  session,
  onDelete,
  onReconnect,
  showOwner,
}: {
  session: QrSession;
  onDelete: (id: string) => void;
  onReconnect: (id: string) => void;
  showOwner?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const needsQr = showQr || session.status === 'QR_PENDING' || session.status === 'CONNECTING';
    if (!needsQr) return;

    const fetchQr = async () => {
      try {
        const res = await api.getWhatsAppQrSession(session.id);
        setQr(res.session.lastQr || null);
        if (res.session.status === 'CONNECTED') {
          setShowQr(false);
        }
      } catch {}
    };
    fetchQr();
    intervalRef.current = setInterval(fetchQr, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [showQr, session.status, session.id]);

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <QrCode className="w-5 h-5 text-primary-600 dark:text-primary-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-white">{session.label}</span>
              <StatusBadge status={session.status} />
              {showOwner && session.user && (
                <span className="text-xs text-gray-500 dark:text-slate-400">({session.user.name})</span>
              )}
            </div>
            {session.phoneNumber && (
              <div className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">+{session.phoneNumber}</div>
            )}
            {session.lastError && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {session.lastError}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {session.status !== 'CONNECTED' && (
            <button
              onClick={() => setShowQr(true)}
              className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
              title="Ver QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onReconnect(session.id)}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
            title="Reconectar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
            title="Remover"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showQr && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-col items-center">
          {qr ? (
            <>
              <img src={qr} alt="QR Code" className="w-56 h-56" />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 text-center max-w-xs">
                WhatsApp do celular → Aparelhos conectados → Conectar um aparelho
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Gerando QR Code…
            </div>
          )}
          <button onClick={() => setShowQr(false)} className="mt-3 text-sm text-gray-500 hover:text-gray-700">
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: QrSession['status'] }) {
  const config: Record<QrSession['status'], { color: string; label: string; Icon: typeof CheckCircle2 }> = {
    CONNECTED: { color: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300', label: 'Conectado', Icon: CheckCircle2 },
    CONNECTING: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300', label: 'Conectando…', Icon: Loader2 },
    QR_PENDING: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', label: 'Aguardando QR', Icon: QrCode },
    DISCONNECTED: { color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200', label: 'Desconectado', Icon: XCircle },
    ERROR: { color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300', label: 'Erro', Icon: AlertCircle },
  };
  const { color, label, Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      <Icon className={`w-3 h-3 ${status === 'CONNECTING' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

function CreateModal({
  isAdminOrManager,
  onClose,
  onCreated,
}: {
  isAdminOrManager: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!label.trim()) return alert('Dê um nome pra essa conexão');
    setSubmitting(true);
    try {
      await api.createWhatsAppQrSession({ label: label.trim(), isCompany });
      onCreated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Conectar WhatsApp via QR Code</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="label">Nome da conexão</label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: WhatsApp Vendas"
            />
          </div>
          {isAdminOrManager && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isCompany}
                onChange={(e) => setIsCompany(e.target.checked)}
                className="w-4 h-4"
              />
              Compartilhar com toda a empresa
            </label>
          )}
          <p className="text-xs text-gray-500 dark:text-slate-400 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded p-2">
            Após criar, vai aparecer um QR Code. Escaneie com o WhatsApp do celular em
            <em> Aparelhos conectados → Conectar um aparelho</em>.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={submitting} className="btn-primary inline-flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar e gerar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
