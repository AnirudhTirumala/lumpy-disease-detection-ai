'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import DashboardShell from '@/components/layout/DashboardShell';
import AdminOverview from '@/components/dashboard/admin/AdminOverview';
import PanelLoader from '@/components/dashboard/shared/PanelLoader';

const UserManagement = dynamic(() => import('@/components/dashboard/admin/UserManagement'), { loading: PanelLoader });
const AdminAnalytics = dynamic(() => import('@/components/dashboard/admin/AdminAnalytics'), { loading: PanelLoader });
const OutbreakMap = dynamic(() => import('@/components/dashboard/shared/OutbreakMap'), { loading: PanelLoader });
const Notifications = dynamic(() => import('@/components/dashboard/shared/Notifications'), { loading: PanelLoader });
const ProfileSettings = dynamic(() => import('@/components/dashboard/shared/ProfileSettings'), { loading: PanelLoader });
const ScanTool = dynamic(() => import('@/components/dashboard/shared/ScanTool'), { loading: PanelLoader });

const TAB_META: Record<string, { title: string; subtitle: string }> = {
  dashboard:       { title: 'Admin Dashboard',  subtitle: 'Real-time platform overview' },
  users:           { title: 'User Management',  subtitle: 'Farmers, vets and approvals' },
  scan:            { title: 'AI Scan',          subtitle: 'Test the AI detection model' },
  analytics:       { title: 'Analytics',        subtitle: 'Platform-wide real-time data' },
  'outbreak-map':  { title: 'Outbreak Map',     subtitle: 'Live disease activity' },
  notifications:   { title: 'Notifications',   subtitle: 'System alerts' },
  settings:        { title: 'Profile Settings', subtitle: 'Manage your account' },
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const meta = TAB_META[activeTab] ?? TAB_META.dashboard;

  function renderContent() {
    switch (activeTab) {
      case 'dashboard':     return <AdminOverview />;
      case 'users':         return <UserManagement />;
      case 'scan':          return <ScanTool />;
      case 'analytics':     return <AdminAnalytics />;
      case 'outbreak-map':  return <OutbreakMap />;
      case 'notifications': return <Notifications role="admin" />;
      case 'settings':      return <ProfileSettings />;
      default:              return null;
    }
  }

  return (
    <DashboardShell expectedRole="admin" currentTab={activeTab} onTabChange={setActiveTab}
      title={meta.title} subtitle={meta.subtitle}>
      {renderContent()}
    </DashboardShell>
  );
}
