import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api/client';
import {
  ensureNotificationPermission,
  getReminderStorageKey,
  playReminderTone,
  playWhatsAppTone,
  showNativeNotification,
} from '../utils/notifications';
import {
  LayoutDashboard, Users, Target, Kanban, Calendar, Tags,
  Upload, Shield, Bell, BellRing, LogOut, Menu, Moon, Sun,
  X, ChevronDown, User, Settings, MessageCircle, ArrowLeft,
} from 'lucide-react';
import type { Appointment } from '../types';

interface WhatsAppToast {
  id: string;
  title: string;
  message: string;
  link?: string;
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pipeline', label: 'Pipeline', icon: Kanban },
  { path: '/leads', label: 'Leads', icon: Target },
  { path: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { path: '/appointments', label: 'Agenda', icon: Calendar },
  { path: '/tags', label: 'Etiquetas', icon: Tags },
  { path: '/users', label: 'Usuários', icon: Users, roles: ['ADMIN', 'MANAGER', 'SUPER_ADMIN'] },
  { path: '/import-export', label: 'Importar/Exportar', icon: Upload },
  { path: '/audit', label: 'Auditoria', icon: Shield, roles: ['ADMIN', 'MANAGER', 'SUPER_ADMIN'] },
];

function appointmentReminderMessage(appointment: Appointment) {
  const when = new Date(appointment.startDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Seu compromisso "${appointment.title}" começa às ${when}${appointment.lead?.name ? ` com ${appointment.lead.name}` : ''}.`;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, impersonation, exitCompany, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminderToasts, setReminderToasts] = useState<Appointment[]>([]);
  const [whatsappToasts, setWhatsappToasts] = useState<WhatsAppToast[]>([]);
  const lastNotificationIdRef = useRef<string | null>(null);

  const filteredNav = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role || '')),
    [user?.role]
  );

  useEffect(() => {
    if (!user) return;
    ensureNotificationPermission();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const syncNotifications = () => {
      api.getNotifications()
        .then((response) => {
          setUnreadCount(response.unreadCount);

          const notifications = response.notifications || [];
          if (notifications.length === 0) return;

          const latestId = notifications[0]?.id;
          const prevId = lastNotificationIdRef.current;
          lastNotificationIdRef.current = latestId;

          // Skip on first load (just store the latest ID)
          if (!prevId) return;
          if (latestId === prevId) return;

          // Find new WhatsApp notifications since last check
          const newWhatsApp: WhatsAppToast[] = [];
          for (const n of notifications) {
            if (n.id === prevId) break;
            if (n.type === 'whatsapp' && !n.read) {
              newWhatsApp.push({
                id: n.id,
                title: n.title,
                message: n.message,
                link: n.link,
              });
            }
          }

          if (newWhatsApp.length > 0) {
            playWhatsAppTone();
            setWhatsappToasts((current) => [...newWhatsApp, ...current].slice(0, 3));
            for (const toast of newWhatsApp) {
              showNativeNotification(toast.title, {
                body: toast.message,
                tag: `whatsapp-${toast.id}`,
                link: toast.link,
              });
            }
          }
        })
        .catch(() => {});
    };

    syncNotifications();
    const interval = window.setInterval(syncNotifications, 15_000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const checkAppointmentReminders = () => {
      const now = new Date();
      const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);

      api.getAppointments({
        startDate: now.toISOString(),
        endDate: oneHourAhead.toISOString(),
        completed: 'false',
        userId: user.id,
      })
        .then(async (appointments) => {
          const dueAppointments = appointments.filter((appointment) => {
            const startTime = new Date(appointment.startDate).getTime();
            const diffMs = startTime - Date.now();
            return diffMs > 0 && diffMs <= 60 * 60 * 1000;
          });

          for (const appointment of dueAppointments) {
            const storageKey = getReminderStorageKey(appointment.id);
            if (localStorage.getItem(storageKey)) continue;

            localStorage.setItem(storageKey, new Date().toISOString());
            playReminderTone();
            setReminderToasts((current) => [appointment, ...current].slice(0, 3));
            showNativeNotification('Compromisso em 1 hora', {
              body: appointmentReminderMessage(appointment),
              tag: `appointment-${appointment.id}`,
              requireInteraction: true,
              link: '/appointments',
            });

            try {
              await api.createNotification({
                title: 'Compromisso em 1 hora',
                message: appointmentReminderMessage(appointment),
                type: 'appointment',
                link: '/appointments',
              });
              setUnreadCount((current) => current + 1);
            } catch {
              // O lembrete sonoro/local continua funcionando mesmo se o backend falhar.
            }
          }
        })
        .catch(() => {});
    };

    checkAppointmentReminders();
    const interval = window.setInterval(checkAppointmentReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  const activePageLabel = filteredNav.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )?.label || 'CRM Leads';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleExitCompany = async () => {
    await exitCompany();
    navigate('/admin');
  };

  const dismissReminderToast = (appointmentId: string) => {
    setReminderToasts((current) => current.filter((appointment) => appointment.id !== appointmentId));
  };

  const dismissWhatsAppToast = (toastId: string) => {
    setWhatsappToasts((current) => current.filter((t) => t.id !== toastId));
  };

  // Auto-dismiss WhatsApp toasts after 8 seconds
  useEffect(() => {
    if (whatsappToasts.length === 0) return;
    const timeout = window.setTimeout(() => {
      setWhatsappToasts((current) => current.slice(0, -1));
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [whatsappToasts]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Impersonation banner */}
      {impersonation.active && (
        <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between z-[60] relative">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4" />
            <span>Voce esta dentro de: <strong>{impersonation.companyName}</strong></span>
          </div>
          <button
            onClick={handleExitCompany}
            className="flex items-center gap-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel
          </button>
        </div>
      )}

      <div className="flex-1 flex">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reminderToasts.length > 0 && (
          <div className="fixed top-20 right-4 z-[70] space-y-3 w-[min(92vw,360px)]">
            {reminderToasts.map((appointment) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                className="card p-4 border-primary-200 bg-white/95 backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Compromisso em 1 hora</p>
                    <p className="text-sm text-gray-600 mt-1">{appointmentReminderMessage(appointment)}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        className="btn-primary text-xs px-3 py-1.5"
                        onClick={() => {
                          dismissReminderToast(appointment.id);
                          navigate('/appointments');
                        }}
                      >
                        Abrir agenda
                      </button>
                      <button
                        className="btn-secondary text-xs px-3 py-1.5"
                        onClick={() => dismissReminderToast(appointment.id)}
                      >
                        Dispensar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whatsappToasts.length > 0 && (
          <div className="fixed top-20 right-4 z-[70] space-y-3 w-[min(92vw,360px)]" style={{ top: reminderToasts.length > 0 ? `${80 + reminderToasts.length * 120}px` : undefined }}>
            {whatsappToasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                className="card p-4 border-green-200 bg-white/95 backdrop-blur shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{toast.message}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        onClick={() => {
                          dismissWhatsAppToast(toast.id);
                          navigate(toast.link || '/whatsapp');
                        }}
                      >
                        Abrir conversa
                      </button>
                      <button
                        className="btn-secondary text-xs px-3 py-1.5"
                        onClick={() => dismissWhatsAppToast(toast.id)}
                      >
                        Dispensar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
        initial={false}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20"
              whileHover={{ rotate: -8, scale: 1.05 }}
            >
              <Target className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <span className="font-bold text-lg text-gray-900 block leading-none">CRM Leads</span>
              <span className="text-xs text-gray-500 truncate max-w-[120px] block">
                {impersonation.active ? impersonation.companyName : user?.company?.name || 'Sem empresa'}
              </span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {filteredNav.map((item, index) => {
            const Icon = item.icon;
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all ${
                    active
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-xl">
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">{activePageLabel}</h1>
              <p className="hidden lg:block text-xs text-gray-500">Acompanhe leads, agenda e consultores em tempo real.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <Link
              to="/notifications"
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((current) => !current)}
                className="flex items-center gap-2 p-2 text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
                <ChevronDown className="w-4 h-4 hidden sm:block" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 py-1 z-50"
                  >
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" /> Configurações
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" /> Sair
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      </div>
    </div>
  );
}
