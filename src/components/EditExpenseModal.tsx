import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CategoryDefinition, CategoryId, Expense } from '../types';
import { GlassCard } from './GlassCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useCurrency } from '../contexts/CurrencyContext';

interface EditExpenseModalProps {
  expense: Expense;
  categories: CategoryDefinition[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Expense>) => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ expense, categories, onClose, onUpdate }) => {
  const { currencySymbol } = useCurrency();
  const [amount, setAmount] = useState(expense.amount.toString());
  const [categoryId, setCategoryId] = useState<CategoryId>(expense.categoryId);
  const [description, setDescription] = useState(expense.description);
  const [date, setDate] = useState(new Date(expense.date).toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    onUpdate(expense.id, {
      amount: Number(amount),
      categoryId,
      description: description || categories.find(c => c.id === categoryId)?.name || 'Expense',
      date: new Date(date).toISOString(),
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md"
      >
        <GlassCard className="bg-white/5 border-white/10 backdrop-blur-3xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-medium text-white">Edit Expense</h2>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Amount ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-2xl font-light text-white outline-none focus:border-white/30"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'rounded-lg border border-white/10 p-2 text-xs transition-all truncate text-center',
                      categoryId === cat.id ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was it for?"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"
              />
            </div>

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-white py-3 font-medium text-black transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Update Expense
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};
