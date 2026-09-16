'use client';
import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export default function DashInput({
  label,
  error,
  leftIcon,
  rightElement,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-subink"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subink">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          {...props}
          className={clsx(
            'w-full bg-paper border rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-gray-400',
            'transition-all duration-200',
            'focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100',
            error ? 'border-red-400' : 'border-hairline hover:border-gray-300',
            leftIcon && 'pl-10',
            rightElement && 'pr-11',
            className,
          )}
        />
        {rightElement && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subink">
            {rightElement}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}