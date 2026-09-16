import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  accent?: boolean; // show a thin indigo top border to mark importance
  hoverable?: boolean;
}

export default function Card({
  children,
  className,
  padding = 'md',
  accent = false,
  hoverable = false,
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={clsx(
        'card-light rounded-2xl shadow-card relative overflow-hidden',
        paddings[padding],
        hoverable && 'transition-shadow duration-200 hover:shadow-card-lg',
        className,
      )}
    >
      {accent && (
        <span className="absolute top-0 left-0 right-0 h-[3px] bg-accent-500" />
      )}
      {children}
    </div>
  );
}