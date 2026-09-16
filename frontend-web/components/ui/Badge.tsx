import React from 'react';
import clsx from 'clsx';

type BadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'accent';

const TONES: Record<BadgeTone, string> = {
  ok:      'bg-green-50 text-ok border border-green-200',
  warn:    'bg-amber-50 text-warn border border-amber-200',
  bad:     'bg-red-50 text-bad border border-red-200',
  info:    'bg-blue-50 text-info border border-blue-200',
  neutral: 'bg-gray-100 text-subink border border-gray-200',
  accent:  'bg-accent-50 text-accent-700 border border-accent-200',
};

export default function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}