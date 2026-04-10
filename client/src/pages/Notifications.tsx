import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { api } from '../api/client';
import type { Notification } from '../types';
import { PageLoading } from '../components/LoadingSpinner';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.getNotifications()
      .then(d => { setNotifications(d.notifications); setUnreadCount(d.unreadCount); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    load();
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    load();
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Notificacoes {unreadCount > 0 && <span className="text-primary-600">({unreadCount})</span>}
        </h2>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`card p-4 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}>
            <Bell className={`w-5 h-5 mt-0.5 flex-shrink-0 ${n.read ? 'text-gray-300' : 'text-primary-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${n.read ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
              <p className="text-sm text-gray-500">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {!n.read && (
              <button onClick={() => markRead(n.id)} className="p-1.5 text-gray-400 hover:text-green-600 rounded flex-shrink-0" title="Marcar como lida">
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma notificacao</p>
          </div>
        )}
      </div>
    </div>
  );
}
