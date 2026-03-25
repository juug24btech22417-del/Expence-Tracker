import React from 'react';
import { motion } from 'motion/react';
import { Expense, RegretStatus } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { ThumbsUp, Minus, ThumbsDown } from 'lucide-react';

interface RegretNudgeProps {
  expense: Expense;
  onRate: (id: string, rating: RegretStatus) => void;
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
          
          <div className="flex gap-2">
            <button
              onClick={() => onRate(expense.id, 'yes')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 text-white/70 hover:text-emerald-400 transition-all"
            >
              <ThumbsUp size={16} />
              <span className="text-xs font-medium">Yes</span>
            </button>
            <button
              onClick={() => onRate(expense.id, 'neutral')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/20 border border-white/10 hover:border-white/30 text-white/70 hover:text-white transition-all"
            >
              <Minus size={16} />
              <span className="text-xs font-medium">Neutral</span>
            </button>
            <button
              onClick={() => onRate(expense.id, 'no')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/50 text-white/70 hover:text-orange-400 transition-all"
            >
              <ThumbsDown size={16} />
              <span className="text-xs font-medium">No</span>
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};
