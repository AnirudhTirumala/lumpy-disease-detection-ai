'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar, { type SidebarRole } from './Sidebar';
import Topbar from './Topbar';
import { getStoredUser, type AuthUser } from '@/lib/auth';

interface DashboardShellProps {
  expectedRole: SidebarRole;
  currentTab: string;
  onTabChange: (tab: string) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  expectedRole, currentTab, onTabChange, title, subtitle, children,
}: DashboardShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.push('/login'); return; }
    if (stored.role !== expectedRole) { router.push(`/dashboard/${stored.role}`); return; }
    setUser(stored);
    setChecked(true);
  }, [expectedRole, router]);

  if (!checked || !user) {
    return (
      <div className="theme-light flex h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-subink font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-light flex h-screen overflow-hidden bg-canvas antialiased">
      <Sidebar role={user.role} userName={user.name} currentTab={currentTab} onTabChange={onTabChange} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={title} subtitle={subtitle} onTabChange={onTabChange} role={user.role} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
