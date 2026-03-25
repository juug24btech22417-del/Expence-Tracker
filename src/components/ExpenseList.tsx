import React, { useState } from 'react';
import { Expense, CategoryDefinition } from '../types';
import { GlassCard } from './GlassCard';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../contexts/CurrencyContext';

interface ExpenseListProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
  onDelete: (id: string) => void;
  onRate: (id: string, score: number) => void;
}

interface ExpenseItemProps {
  expense: Expense;
  category: CategoryDefinition;
  onDelete: (id: string) => void;
  onRate: (id: string, score: number) => void;
  currencySymbol: string;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, category, onDelete, onRate, currencySymbol }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    // Wait for the disintegration animation to finish before actually removing from the list
    setTimeout(() => {
      onDelete(expense.id);
    }, 1500); // 1.5s matches the animation duration
  };

  const content = (
    <GlassCard className="group flex items-center justify-between p-4 h-full" hover={!isDeleting}>
      <div className="flex items-center gap-4">
        <div
          className="h-10 w-10 rounded-full"
          style={{ backgroundColor: `${category.color}40`, border: `1px solid ${category.color}` }}
        />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{expense.description}</p>
            {expense.worthItScore !== undefined && (
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                {expense.worthItScore}/5 Stars
              </span>
            )}
            {expense.carbonFootprint !== undefined && (
              <span className="rounded-full bg-sky-500/20 border border-sky-500/50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-400">
                {expense.carbonFootprint.toFixed(1)} kg CO2e
              </span>
            )}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            {category.name} • {format(new Date(expense.date), 'MMM d, h:mm a')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => onRate(expense.id, score)}
              className={`text-xs transition-colors ${expense.worthItScore && expense.worthItScore >= score ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/50'}`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="text-right">
          <p className="text-lg font-light text-white">-{currencySymbol}{expense.amount.toFixed(2)}</p>
          {expense.originalAmount && expense.originalCurrency && (
            <p className="text-[10px] text-white/40">
              ({expense.originalAmount.toFixed(2)} {expense.originalCurrency})
            </p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`transition-opacity text-white/40 hover:text-red-400 ${isDeleting ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </GlassCard>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative"
    >
      {/* Solid Card - Fades out quickly when deleting starts */}
      <motion.div
        animate={{ opacity: isDeleting ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {content}
      </motion.div>

      {/* Dotted Card Overlay - Wipes from right to left */}
      {isDeleting && (
        <motion.div
          initial={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, x: 0 }}
          animate={{ clipPath: 'inset(0% 100% 0% 0%)', opacity: 0, x: -10 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            maskImage: 'radial-gradient(circle, black 35%, transparent 45%)',
            maskSize: '5px 5px',
            WebkitMaskImage: 'radial-gradient(circle, black 35%, transparent 45%)',
            WebkitMaskSize: '5px 5px',
          }}
        >
          {content}
        </motion.div>
      )}
    </motion.div>
  );
};

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, categories, onDelete, onRate }) => {
  const { currencySymbol } = useCurrency();
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
            <ExpenseItem
              key={expense.id}
              expense={expense}
              category={category}
              onDelete={onDelete}
              onRate={onRate}
              currencySymbol={currencySymbol}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};
