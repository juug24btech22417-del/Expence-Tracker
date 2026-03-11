import React from 'react';
import { Expense, CategoryDefinition } from '../types';
import { GlassCard } from './GlassCard';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CURRENCY_SYMBOL } from '../constants';

interface ExpenseListProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
  onDelete: (id: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, categories, onDelete }) => {
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/40">
        <p className="text-sm italic">No expenses yet. Start by adding one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {sortedExpenses.map((expense) => {
          const category = categories.find(c => c.id === expense.categoryId) || categories[categories.length - 1];
          return (
            <motion.div
              key={expense.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="group flex items-center justify-between p-4" hover>
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-full"
                    style={{ backgroundColor: `${category.color}40`, border: `1px solid ${category.color}` }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{expense.description}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">
                      {category.name} • {format(new Date(expense.date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-light text-white">-{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</p>
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-white/40 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
