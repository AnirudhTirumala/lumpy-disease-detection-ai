'use client';
// components/shared/LumpyAILogo.tsx
// Futuristic gradient wordmark — use everywhere instead of plain text or thunder icon
import Image from 'next/image';

export default function LumpyAILogo({ size = 'md', showIcon = true }: { size?: 'sm' | 'md' | 'lg'; showIcon?: boolean }) {
  const sizes = {
    sm: { icon: 24, text: 'text-base' },
    md: { icon: 32, text: 'text-lg' },
    lg: { icon: 48, text: 'text-2xl' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      {showIcon && (
        <div className="relative">
          <Image src="/logo.png" alt="" width={s.icon} height={s.icon} className="rounded-lg object-contain relative z-10" />
          <div className="absolute inset-0 bg-accent-500 blur-md opacity-40 rounded-lg" />
        </div>
      )}
      <span
        className={`font-extrabold tracking-tight ${s.text} bg-gradient-to-r from-accent-400 via-accent-500 to-purple-500 bg-clip-text text-transparent`}
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '-0.02em',
          textShadow: '0 0 30px rgba(105, 83, 244, 0.3)',
        }}>
        Lumpy<span className="font-black">AI</span>
      </span>
    </div>
  );
}
