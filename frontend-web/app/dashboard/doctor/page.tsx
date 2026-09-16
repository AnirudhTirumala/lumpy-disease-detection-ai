'use client';
import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import DoctorOverview from '@/components/dashboard/doctor/DoctorOverview';
import CaseQueue from '@/components/dashboard/doctor/CaseQueue';
import PatientRecords from '@/components/dashboard/doctor/PatientRecords';
import FarmerChat from '@/components/dashboard/doctor/FarmerChat';
import DoctorAnalytics from '@/components/dashboard/doctor/DoctorAnalytics';
import OutbreakMap from '@/components/dashboard/shared/OutbreakMap';
import Notifications from '@/components/dashboard/shared/Notifications';
import ProfileSettings from '@/components/dashboard/shared/ProfileSettings';
import ScanTool from '@/components/dashboard/shared/ScanTool';

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
