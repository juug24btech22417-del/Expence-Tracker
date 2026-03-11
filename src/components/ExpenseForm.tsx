import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CategoryDefinition, CategoryId } from '../types';
import { GlassCard } from './GlassCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { CURRENCY_SYMBOL } from '../constants';

interface ExpenseFormProps {
  categories: CategoryDefinition[];
  onAdd: (expense: { amount: number; categoryId: CategoryId; description: string }) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ categories, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>(categories[0]?.id || 'other');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    onAdd({
      amount: Number(amount),
      categoryId,
      description: description || categories.find(c => c.id === categoryId)?.name || 'Expense',
    });
    setAmount('');
    setDescription('');
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/50 transition-transform hover:scale-110 active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
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
                  <h2 className="text-xl font-medium text-white">Add Expense</h2>
                  <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Amount ({CURRENCY_SYMBOL})</label>
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
                            'rounded-lg border border-white/10 p-2 text-xs transition-all',
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

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-white py-3 font-medium text-black transition-opacity hover:opacity-90 active:scale-[0.98]"
                  >
                    Save Expense
                  </button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
