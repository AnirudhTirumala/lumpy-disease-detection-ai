'use client';
import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import AdminOverview from '@/components/dashboard/admin/AdminOverview';
import UserManagement from '@/components/dashboard/admin/UserManagement';
import AdminAnalytics from '@/components/dashboard/admin/AdminAnalytics';
import OutbreakMap from '@/components/dashboard/shared/OutbreakMap';
import Notifications from '@/components/dashboard/shared/Notifications';
import ProfileSettings from '@/components/dashboard/shared/ProfileSettings';
import ScanTool from '@/components/dashboard/shared/ScanTool';

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
