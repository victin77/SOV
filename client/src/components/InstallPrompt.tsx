import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sov_pwa_dismissed_at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissed && Date.now() - dismissed < DISMISS_TTL_MS) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!visible || !evt) return null;

  const install = async () => {
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      setVisible(false);
      setEvt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed left-3 right-3 sm:left-auto sm:right-6 bottom-3 sm:bottom-6 safe-bottom sm:max-w-sm z-[60] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 grid place-items-center text-white text-xl shrink-0">
          📊
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">Instalar SOV</div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Abre como app, sem barra do navegador e com acesso direto na tela inicial.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="btn-primary text-xs py-2 px-3 flex-1 justify-center inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Instalar
            </button>
            <button onClick={dismiss} className="btn-secondary text-xs py-2 px-3">
              Depois
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 p-1 shrink-0"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
