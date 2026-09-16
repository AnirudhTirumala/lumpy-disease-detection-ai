'use client';

import ToastProvider from '@/components/ui/Toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ToastProvider>
      <div className="w-full min-h-screen">{children}</div>
    </ToastProvider>
  );
}