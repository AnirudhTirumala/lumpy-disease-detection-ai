'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import DashboardShell from '@/components/layout/DashboardShell';
import DoctorOverview from '@/components/dashboard/doctor/DoctorOverview';
import PanelLoader from '@/components/dashboard/shared/PanelLoader';

const CaseQueue = dynamic(() => import('@/components/dashboard/doctor/CaseQueue'), { loading: PanelLoader });
const PatientRecords = dynamic(() => import('@/components/dashboard/doctor/PatientRecords'), { loading: PanelLoader });
const FarmerChat = dynamic(() => import('@/components/dashboard/doctor/FarmerChat'), { loading: PanelLoader });
const DoctorAnalytics = dynamic(() => import('@/components/dashboard/doctor/DoctorAnalytics'), { loading: PanelLoader });
const OutbreakMap = dynamic(() => import('@/components/dashboard/shared/OutbreakMap'), { loading: PanelLoader });
const Notifications = dynamic(() => import('@/components/dashboard/shared/Notifications'), { loading: PanelLoader });
const ProfileSettings = dynamic(() => import('@/components/dashboard/shared/ProfileSettings'), { loading: PanelLoader });
const ScanTool = dynamic(() => import('@/components/dashboard/shared/ScanTool'), { loading: PanelLoader });

const TAB_META: Record<string, { title: string; subtitle: string }> = {
  dashboard:      { title: 'Veterinarian Dashboard', subtitle: 'Your practice at a glance' },
  'case-queue':   { title: 'Case Queue', subtitle: 'Review AI-flagged cases from farmers' },
  scan:           { title: 'AI Scan', subtitle: 'Run AI detection on a cattle image' },
  patients:       { title: 'Patient Records', subtitle: 'All farmer scan history' },
  'farmer-chat':  { title: 'Farmer Chat', subtitle: 'Communicate with farmers' },
  'outbreak-map': { title: 'Outbreak Map', subtitle: 'Real-time disease activity' },
  analytics:      { title: 'Analytics', subtitle: 'Your case performance' },
  notifications:  { title: 'Notifications', subtitle: 'Cases, messages and alerts' },
  settings:       { title: 'Profile Settings', subtitle: 'Manage your account' },
};

export default function DoctorDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const meta = TAB_META[activeTab] ?? TAB_META.dashboard;

  function renderContent() {
    switch (activeTab) {
      case 'dashboard':     return <DoctorOverview onTabChange={setActiveTab} />;
      case 'case-queue':    return <CaseQueue />;
      case 'scan':          return <ScanTool />;
      case 'patients':      return <PatientRecords />;
      case 'farmer-chat':   return <FarmerChat />;
      case 'outbreak-map':  return <OutbreakMap />;
      case 'analytics':     return <DoctorAnalytics />;
      case 'notifications': return <Notifications role="doctor" />;
      case 'settings':      return <ProfileSettings />;
      default:              return null;
    }
  }

  return (
    <DashboardShell expectedRole="doctor" currentTab={activeTab} onTabChange={setActiveTab}
      title={meta.title} subtitle={meta.subtitle}>
      {renderContent()}
    </DashboardShell>
  );
}
