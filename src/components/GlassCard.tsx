import React from 'react';
import { cn } from '../utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hover = false }) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-3xl transition-all duration-300 shadow-2xl shadow-black/50',
        'dark:border-white/10 dark:bg-white/5 dark:shadow-black/50',
        'border-gray-200 bg-gray-100/50 shadow-gray-200/50',
        hover && 'hover:bg-white/10 hover:border-white/20 hover:shadow-black/70 hover:-translate-y-0.5',
        className
      )}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/10 to-transparent opacity-50 dark:from-white/10" />
      {children}
    </div>
  );
};
