import React from 'react';
import { motion } from 'motion/react';
import { Expense } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { Star } from 'lucide-react';

interface RegretNudgeProps {
  expense: Expense;
  onRate: (id: string, rating: number) => void;
}

export const RegretNudge: React.FC<RegretNudgeProps> = ({ expense, onRate }) => {
  const { currencySymbol } = useCurrency();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="mb-6"
    >
      <GlassCard className="p-5 border-orange-500/30 bg-orange-500/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50" />
        
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-white/90">
            Was that {currencySymbol}{expense.amount.toFixed(2)} {expense.description} order worth it?
          </p>
          
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(expense.id, star)}
                className="text-white/40 hover:text-yellow-400 transition-colors"
              >
                <Star size={24} fill={star <= (expense.worthItScore || 0) ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};
