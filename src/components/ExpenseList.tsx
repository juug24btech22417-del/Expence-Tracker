import React, { useState } from 'react';
import { Expense, CategoryDefinition, RegretStatus } from '../types';
import { GlassCard } from './GlassCard';
import { format } from 'date-fns';
import { Trash2, Edit2, ArrowUpDown, Calendar, DollarSign, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../contexts/CurrencyContext';
import { EditExpenseModal } from './EditExpenseModal';
import { cn } from '../utils';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category';

interface ExpenseListProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
  onDelete: (id: string) => void;
  onRate: (id: string, status: RegretStatus) => void;
  onUpdate: (id: string, updates: Partial<Expense>) => void;
}

interface ExpenseItemProps {
  expense: Expense;
  category: CategoryDefinition;
  onDelete: (id: string) => void;
  onRate: (id: string, status: RegretStatus) => void;
  onEdit: (expense: Expense) => void;
  currencySymbol: string;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, category, onDelete, onRate, onEdit, currencySymbol }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(expense.id);
    }, 1500);
  };

  const content = (
    <GlassCard className="group flex items-center justify-between p-4 h-full" hover={!isDeleting}>
      <div className="flex items-center gap-4">
        <div
          className="h-10 w-10 rounded-full"
          style={{ backgroundColor: `${category.color}40`, border: `1px solid ${category.color}` }}
        />
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <p className="text-sm font-medium text-white">{expense.description}</p>
            {expense.regretStatus && (
              <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                expense.regretStatus === 'yes' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                expense.regretStatus === 'no' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' :
                'bg-white/10 border-white/20 text-white/60'
              }`}>
                {expense.regretStatus === 'yes' ? 'Worth it' : expense.regretStatus === 'no' ? 'Regret' : 'Neutral'}
              </span>
            )}
            {expense.carbonFootprint !== undefined && category.id === 'transport' && (
              <div className="flex flex-col gap-1 mt-1 sm:mt-0 sm:flex-row sm:items-center">
                <span className="rounded-full bg-sky-500/20 border border-sky-500/50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-400 whitespace-nowrap">
                  {expense.carbonFootprint.toFixed(1)} kg CO2e
                </span>
                {expense.amount > 0 && (
                  <span className="text-[7px] text-sky-400/60 font-medium uppercase tracking-tighter sm:ml-1">
                    ({(expense.carbonFootprint / expense.amount).toFixed(2)} kg/{currencySymbol})
                  </span>
                )}
              </div>
            )}
            {expense.carbonFootprint !== undefined && category.id !== 'transport' && (
              <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-400/60">
                {expense.carbonFootprint.toFixed(1)} kg CO2e
              </span>
            )}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            {category.name} • {format(new Date(expense.date), 'MMM d')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-light text-white">-{currencySymbol}{expense.amount.toFixed(2)}</p>
          {expense.originalAmount && expense.originalCurrency && (
            <p className="text-[10px] text-white/40">
              ({expense.originalAmount.toFixed(2)} {expense.originalCurrency})
            </p>
          )}
        </div>
        <div className={`flex items-center gap-2 transition-opacity ${isDeleting ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={() => onEdit(expense)}
            disabled={isDeleting}
            className="text-white/40 hover:text-white"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-white/40 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
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

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, categories, onDelete, onRate, onUpdate }) => {
  const { currencySymbol } = useCurrency();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  const sortedExpenses = [...expenses].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      case 'category':
        const catA = categories.find(c => c.id === a.categoryId)?.name || '';
        const catB = categories.find(c => c.id === b.categoryId)?.name || '';
        return catA.localeCompare(catB);
      default:
        return 0;
    }
  });

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/40">
        <p className="text-sm italic">No expenses yet. Start by adding one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40">
          <ArrowUpDown size={10} />
          <span>Sort By</span>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'date-desc', icon: Calendar, label: 'Newest' },
            { id: 'amount-desc', icon: DollarSign, label: 'Highest' },
            { id: 'category', icon: Tag, label: 'Category' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => {
                if (sortBy === option.id) {
                  // Toggle between desc and asc for date and amount
                  if (option.id === 'date-desc') setSortBy('date-asc');
                  else if (option.id === 'date-asc') setSortBy('date-desc');
                  else if (option.id === 'amount-desc') setSortBy('amount-asc');
                  else if (option.id === 'amount-asc') setSortBy('amount-desc');
                } else {
                  setSortBy(option.id as SortOption);
                }
              }}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] transition-all',
                sortBy.startsWith(option.id.split('-')[0])
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-transparent bg-white/5 text-white/40 hover:bg-white/10'
              )}
            >
              <option.icon size={10} />
              <span>{option.label}</span>
              {sortBy === option.id && (option.id.includes('desc') || option.id.includes('asc')) && (
                <span className="ml-0.5 opacity-60">{sortBy.includes('desc') ? '↓' : '↑'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

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
              onEdit={setEditingExpense}
              currencySymbol={currencySymbol}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {editingExpense && (
          <EditExpenseModal 
            expense={editingExpense}
            categories={categories}
            onClose={() => setEditingExpense(null)}
            onUpdate={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  </div>
  );
};
