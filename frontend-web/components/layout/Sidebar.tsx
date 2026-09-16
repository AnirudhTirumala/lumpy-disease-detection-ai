'use client';
import {
  LayoutDashboard, PlusCircle, MessageSquare, FileText,
  Stethoscope, Users, MapPin, Bell, Settings, LogOut,
  BarChart3, HeartPulse, HelpCircle, ScanLine,
} from 'lucide-react';
import { signOut, type Role } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import LumpyAILogo from '@/components/shared/LumpyAILogo';
import { useNotifications } from '@/components/dashboard/shared/NotificationProvider';

export type SidebarRole = Role;
interface MenuItem { id: string; name: string; icon: React.ReactNode; badge?: number; }

const MENUS: Record<SidebarRole, MenuItem[]> = {
  user: [
    { id: 'dashboard',     name: 'Dashboard',      icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'new-scan',      name: 'New Scan',        icon: <PlusCircle className="w-[18px] h-[18px]" /> },
    { id: 'my-cattle',     name: 'My Cattle',       icon: <HeartPulse className="w-[18px] h-[18px]" /> },
    { id: 'my-scans',      name: 'Scan History',    icon: <FileText className="w-[18px] h-[18px]" /> },
    { id: 'reports',       name: 'Reports',         icon: <FileText className="w-[18px] h-[18px]" /> },
    { id: 'doctor-chat',   name: 'Doctor Chat',     icon: <MessageSquare className="w-[18px] h-[18px]" /> },
    { id: 'outbreak-map',  name: 'Outbreak Map',    icon: <MapPin className="w-[18px] h-[18px]" /> },
    { id: 'notifications', name: 'Notifications',   icon: <Bell className="w-[18px] h-[18px]" /> },
    { id: 'settings',      name: 'Settings',        icon: <Settings className="w-[18px] h-[18px]" /> },
  ],
  doctor: [
    { id: 'dashboard',     name: 'Dashboard',       icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'case-queue',    name: 'Case Queue',      icon: <Stethoscope className="w-[18px] h-[18px]" /> },
    { id: 'scan',          name: 'AI Scan',         icon: <ScanLine className="w-[18px] h-[18px]" /> },
    { id: 'patients',      name: 'Patient Records', icon: <FileText className="w-[18px] h-[18px]" /> },
    { id: 'farmer-chat',   name: 'Farmer Chat',     icon: <MessageSquare className="w-[18px] h-[18px]" /> },
    { id: 'outbreak-map',  name: 'Outbreak Map',    icon: <MapPin className="w-[18px] h-[18px]" /> },
    { id: 'analytics',     name: 'Analytics',       icon: <BarChart3 className="w-[18px] h-[18px]" /> },
    { id: 'notifications', name: 'Notifications',   icon: <Bell className="w-[18px] h-[18px]" /> },
    { id: 'settings',      name: 'Settings',        icon: <Settings className="w-[18px] h-[18px]" /> },
  ],
  admin: [
    { id: 'dashboard',     name: 'Dashboard',       icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'users',         name: 'Users',           icon: <Users className="w-[18px] h-[18px]" /> },
    { id: 'scan',          name: 'AI Scan',         icon: <ScanLine className="w-[18px] h-[18px]" /> },
    { id: 'analytics',     name: 'Analytics',       icon: <BarChart3 className="w-[18px] h-[18px]" /> },
    { id: 'outbreak-map',  name: 'Outbreak Map',    icon: <MapPin className="w-[18px] h-[18px]" /> },
    { id: 'notifications', name: 'Notifications',   icon: <Bell className="w-[18px] h-[18px]" /> },
    { id: 'settings',      name: 'Settings',        icon: <Settings className="w-[18px] h-[18px]" /> },
  ],
};

const ROLE_LABEL: Record<SidebarRole, string> = { user: 'Farmer', doctor: 'Veterinarian', admin: 'Administrator' };
function initials(name: string) { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }

interface SidebarProps { role: SidebarRole; userName: string; currentTab: string; onTabChange: (tab: string) => void; }

export default function Sidebar({ role, userName, currentTab, onTabChange }: SidebarProps) {
  const router = useRouter();
  const [unreadChat, setUnreadChat] = useState(0);
  const [pendingCases, setPendingCases] = useState(0);
  const user = getStoredUser();
  const { unreadCount: unreadNotifs } = useNotifications();

  useEffect(() => {
    if (!user?.id) return;
    let loading = false;
    const onChatTab = currentTab === 'doctor-chat' || currentTab === 'farmer-chat';
    const pageAlreadyLoadsCases = ['dashboard', 'case-queue', 'analytics'].includes(currentTab);

    async function loadCounts() {
      if (loading) return;
      loading = true;
      try {
        const requests: Promise<Response>[] = [];
        if (!onChatTab) requests.push(fetch('/api/chat'));
        if (role === 'doctor' && !pageAlreadyLoadsCases) requests.push(fetch('/api/dashboard/doctor'));
        const responses = await Promise.all(requests);
        let responseIndex = 0;

        if (!onChatTab) {
          const data = await responses[responseIndex++].json();
          setUnreadChat((data.threads || []).reduce((sum: number, thread: any) => sum + (thread.unreadCount || 0), 0));
        }
        if (role === 'doctor' && !pageAlreadyLoadsCases) {
          const data = await responses[responseIndex].json();
          setPendingCases(data.stats?.open || 0);
        }
      } catch {
        // Keep the last successful badges visible during a transient outage.
      } finally {
        loading = false;
      }
    }
    loadCounts();
    const iv = setInterval(loadCounts, 15000);
    return () => clearInterval(iv);
  }, [user?.id, role, currentTab]);

  // signOut() is now async — it clears the real server-side session cookie
  // (via /api/auth/logout) before clearing the local UI copy. We await it so
  // the redirect doesn't happen before the session is actually cleared.
  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const menuItems = MENUS[role].map(item => {
    if (item.id === 'notifications') return { ...item, badge: unreadNotifs || undefined };
    if (item.id === 'doctor-chat' || item.id === 'farmer-chat') return { ...item, badge: unreadChat || undefined };
    if (item.id === 'case-queue') return { ...item, badge: pendingCases || undefined };
    return item;
  });

  return (
    <div className="w-64 h-screen bg-navy text-gray-400 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Futuristic logo */}
        <div className="px-2">
          <LumpyAILogo size="md" />
        </div>

        <nav className="space-y-0.5">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group ${
                currentTab === item.id ? 'bg-accent-500/20 text-accent-300' : 'hover:bg-white/5 hover:text-white'
              }`}>
              <span className={`shrink-0 ${currentTab === item.id ? 'text-accent-400' : 'text-gray-500 group-hover:text-gray-300'}`}>{item.icon}</span>
              <span className="flex-1 text-left">{item.name}</span>
              {item.badge && item.badge > 0 ? (
                <span className="text-[10px] bg-accent-500 text-white rounded-full px-1.5 py-0.5 font-bold shrink-0">{item.badge > 99 ? '99+' : item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-2">
        <a href="mailto:cow@lumpy.ai"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-white/5 hover:text-white transition-colors">
          <HelpCircle className="w-[18px] h-[18px] shrink-0" /> Help (cow@lumpy.ai)
        </a>
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-xl bg-accent-500/30 flex items-center justify-center text-xs font-bold text-accent-300 shrink-0">{initials(userName)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-500">{ROLE_LABEL[role]}</p>
          </div>
          <button onClick={handleSignOut} title="Sign out" className="text-gray-600 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
