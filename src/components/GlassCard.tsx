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
        'relative overflow-hidden rounded-3xl border border-white/40 bg-white/10 p-6 backdrop-blur-3xl transition-all duration-300 shadow-xl shadow-black/5',
        hover && 'hover:bg-white/20 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-0.5',
        className
      )}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/30 to-transparent opacity-50" />
      {children}
    </div>
  );
};
