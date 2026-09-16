'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import DashboardShell from '@/components/layout/DashboardShell';
import FarmerOverview from '@/components/dashboard/user/FarmerOverview';
import PanelLoader from '@/components/dashboard/shared/PanelLoader';

// Each tab is a complete client screen. Loading it only when selected keeps
// chat, maps, forms, and their dependencies out of the initial dashboard JS.
const MyCattle = dynamic(() => import('@/components/dashboard/user/MyCattle'), { loading: PanelLoader });
const ScanHistory = dynamic(() => import('@/components/dashboard/user/ScanHistory'), { loading: PanelLoader });
const DoctorChat = dynamic(() => import('@/components/dashboard/user/DoctorChat'), { loading: PanelLoader });
const Reports = dynamic(() => import('@/components/dashboard/user/Reports'), { loading: PanelLoader });
const OutbreakMap = dynamic(() => import('@/components/dashboard/shared/OutbreakMap'), { loading: PanelLoader });
const Notifications = dynamic(() => import('@/components/dashboard/shared/Notifications'), { loading: PanelLoader });
const ProfileSettings = dynamic(() => import('@/components/dashboard/shared/ProfileSettings'), { loading: PanelLoader });

const TAB_META: Record<string, { title: string; subtitle: string }> = {
  dashboard:       { title: 'My Dashboard',     subtitle: 'Monitor your herd health in real time' },
  'new-scan':      { title: 'New AI Scan',      subtitle: 'Detect lumpy skin disease with AI' },
  'my-cattle':     { title: 'My Cattle',        subtitle: 'Manage animals registered to your farm' },
  'my-scans':      { title: 'Scan History',     subtitle: 'Every AI scan you have run' },
  reports:         { title: 'Reports',          subtitle: 'Your scan reports and doctor reviews' },
  'doctor-chat':   { title: 'Doctor Chat',      subtitle: 'Message your assigned veterinarian' },
  'outbreak-map':  { title: 'Outbreak Map',     subtitle: 'Real-time lumpy skin disease activity' },
  notifications:   { title: 'Notifications',   subtitle: 'Scan results, messages and alerts' },
  settings:        { title: 'Profile Settings', subtitle: 'Manage your account' },
};

export default function UserDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const meta = TAB_META[activeTab] ?? TAB_META.dashboard;

  function renderContent() {
    switch (activeTab) {
      case 'dashboard':
      case 'new-scan':      return <FarmerOverview />;
      case 'my-cattle':     return <MyCattle />;
      case 'my-scans':      return <ScanHistory />;
      case 'reports':       return <Reports />;
      case 'doctor-chat':   return <DoctorChat />;
      case 'outbreak-map':  return <OutbreakMap />;
      case 'notifications': return <Notifications role="user" />;
      case 'settings':      return <ProfileSettings />;
      default:              return null;
    }
  }

  return (
    <DashboardShell expectedRole="user" currentTab={activeTab} onTabChange={setActiveTab}
      title={meta.title} subtitle={meta.subtitle}>
      {renderContent()}
    </DashboardShell>
  );
}
