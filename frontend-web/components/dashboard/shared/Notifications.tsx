'use client';
import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, MessageSquare, ScanLine, Trash2, RefreshCw } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import type { SidebarRole } from '@/components/layout/Sidebar';

interface Notif {
  id: string; title: string; body: string; type: string;
  read: boolean; link?: string; createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  scan: <ScanLine className="w-4 h-4 text-accent-600" />,
  message: <MessageSquare className="w-4 h-4 text-blue-500" />,
  case: <AlertTriangle className="w-4 h-4 text-red-500" />,
  system: <Bell className="w-4 h-4 text-yellow-500" />,
  outbreak: <AlertTriangle className="w-4 h-4 text-orange-500" />,
};

export default function Notifications({ role }: { role: SidebarRole }) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  function load() {
    if (!user?.id) return;
    fetch(`/api/notifications?userId=${user.id}`)
      .then(r => r.json())
      .then(d => setNotifs(d.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [user?.id]);

  async function markAll() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  async function markOne(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifId: id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink">{unread} unread notification{unread !== 1 ? 's' : ''}</h2>
          <p className="text-xs text-subink mt-0.5">Only real-time notifications from your activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-subink hover:text-ink px-3 py-1.5 border border-hairline rounded-xl">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-accent-600 hover:underline px-3 py-1.5 border border-hairline rounded-xl">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-subink text-center py-10">Loading notifications...</p>}

        {!loading && notifs.length === 0 && (
          <div className="bg-paper border border-hairline rounded-2xl p-10 text-center">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink">All caught up!</p>
            <p className="text-xs text-subink mt-1">Notifications will appear here after real events — scans, messages, case updates.</p>
          </div>
        )}

        {notifs.map(n => (
          <div key={n.id} onClick={() => markOne(n.id)}
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
              !n.read ? 'bg-accent-50 border-accent-200' : 'bg-paper border-hairline hover:bg-canvas'
            }`}>
            <div className="w-9 h-9 rounded-xl bg-canvas border border-hairline flex items-center justify-center shrink-0 mt-0.5">
              {TYPE_ICON[n.type] || <Bell className="w-4 h-4 text-subink" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm text-ink ${!n.read ? 'font-bold' : 'font-semibold'}`}>{n.title}</p>
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shrink-0" />}
              </div>
              <p className="text-xs text-subink mt-0.5 line-clamp-2">{n.body}</p>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            <button onClick={e => { e.stopPropagation(); dismiss(n.id); }}
              className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
