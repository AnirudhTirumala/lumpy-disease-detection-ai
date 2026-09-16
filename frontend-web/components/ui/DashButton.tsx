'use client';
import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 select-none whitespace-nowrap';

  const variants = {
    primary:
      'bg-accent-500 text-white hover:bg-accent-600 active:scale-[0.98] shadow-sm hover:shadow-accent-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm',
    secondary:
      'bg-paper border border-hairline text-ink hover:border-accent-300 hover:bg-accent-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    outline:
      'bg-transparent border border-hairline text-subink hover:text-ink hover:border-accent-300 active:scale-[0.98] disabled:opacity-50',
    ghost:
      'bg-transparent text-subink hover:text-ink hover:bg-accent-50 active:scale-[0.98]',
    danger:
      'bg-red-50 border border-red-200 text-bad hover:bg-red-100 active:scale-[0.98] disabled:opacity-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], className)}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
    </button>
  );
}