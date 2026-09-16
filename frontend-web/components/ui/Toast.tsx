'use client';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; tone: ToastTone; }

const ToastContext = createContext<{ push: (message: string, tone?: ToastTone) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />,
  error: <XCircle className="w-4 h-4 text-bad shrink-0" />,
  info: <Info className="w-4 h-4 text-info shrink-0" />,
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 bg-paper border border-hairline shadow-card-lg rounded-xl px-4 py-3 animate-slide-up"
          >
            {ICONS[t.tone]}
            <p className="text-sm text-ink flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-subink hover:text-ink shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}