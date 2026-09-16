'use client';

import ToastProvider from '@/components/ui/Toast';
import { NotificationProvider } from '@/components/dashboard/shared/NotificationProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ToastProvider>
      <NotificationProvider>
        <div className="w-full min-h-screen">{children}</div>
      </NotificationProvider>
    </ToastProvider>
  );
}
