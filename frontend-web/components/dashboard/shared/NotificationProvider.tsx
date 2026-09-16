'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getStoredUser } from '@/lib/auth';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
const POLL_INTERVAL_MS = 15_000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const userId = getStoredUser()?.id;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // The sidebar, bell, and notifications tab share this request. Do not
    // start another request while a slow serverless/database response is in flight.
    if (inFlight.current) return inFlight.current;

    const request = fetch('/api/notifications')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load notifications');
        return response.json();
      })
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {
        // Keep the last successful result visible during a transient outage.
      })
      .finally(() => {
        setLoading(false);
        inFlight.current = null;
      });

    inFlight.current = request;
    return request;
  }, [userId]);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error('Unable to mark notifications as read');
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifId: id }),
    });
    if (!response.ok) throw new Error('Unable to mark notification as read');
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const dismiss = useCallback(async (id: string) => {
    const response = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Unable to dismiss notification');
    const wasUnread = notifications.some((item) => item.id === id && !item.read);
    setNotifications((items) => items.filter((item) => item.id !== id));
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, refresh, markAllRead, markRead, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used within NotificationProvider');
  return value;
}
