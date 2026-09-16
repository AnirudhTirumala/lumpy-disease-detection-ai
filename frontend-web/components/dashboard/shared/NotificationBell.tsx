'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

interface Notif {
  id: string; title: string; body: string; type: string;
  read: boolean; link?: string; createdAt: string;
}

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const user = getStoredUser();

  function load() {
    if (!user?.id) return;
    fetch(`/api/notifications?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { setNotifs(d.notifications || []); setUnread(d.unreadCount || 0); })
      .catch(console.error);
  }

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAll() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markOne(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifId: id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  const TYPE_EMOJI: Record<string, string> = {
    scan: '🔬', message: '💬', case: '📋', system: '🔔', outbreak: '⚠️',
  };

  return (
    <div ref={dropRef} className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl bg-canvas hover:bg-accent-50 flex items-center justify-center text-subink hover:text-ink transition-colors">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-paper border border-hairline rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <p className="text-sm font-bold text-ink">Notifications</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-accent-600 hover:underline">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-subink" /></button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-hairline">
            {notifs.length === 0 && (
              <p className="text-sm text-subink text-center py-8">No notifications yet</p>
            )}
            {notifs.map(n => (
              <div key={n.id}
                onClick={() => { markOne(n.id); if (n.link) window.location.href = n.link; }}
                className={`px-4 py-3 cursor-pointer hover:bg-canvas transition-colors ${!n.read ? 'bg-accent-50/50' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">{TYPE_EMOJI[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold text-ink ${!n.read ? 'font-bold' : ''}`}>{n.title}</p>
                    <p className="text-xs text-subink mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-accent-500 shrink-0 mt-1.5" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
