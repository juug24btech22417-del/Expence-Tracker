import React, { useState } from 'react';
import { Budget, CategoryDefinition, CategoryId } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { X, Plus, Save, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: CategoryDefinition[];
  onUpdateBudgets: (budgets: Budget[]) => void;
  onUpdateCategories: (categories: CategoryDefinition[]) => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ budgets, categories, onUpdateBudgets, onUpdateCategories }) => {
  const { currencySymbol } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [tempBudgets, setTempBudgets] = useState<Budget[]>(budgets);
  const [tempCategories, setTempCategories] = useState<CategoryDefinition[]>(categories);

  const handleUpdateBudget = (categoryId: CategoryId, amount: number) => {
    setTempBudgets(prev => {
      const existing = prev.find(b => b.categoryId === categoryId);
      if (existing) {
        return prev.map(b => b.categoryId === categoryId ? { ...b, amount } : b);
      }
      return [...prev, { categoryId, amount }];
    });
  };

  const handleUpdateCategoryName = (id: CategoryId, name: string) => {
    setTempCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleSave = () => {
    onUpdateBudgets(tempBudgets);
    onUpdateCategories(tempCategories);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white"
      >
        <Edit2 size={14} />
        Manage Budgets
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
                  <h2 className="text-xl font-medium text-white">Manage Budgets</h2>
                  <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {tempCategories.map((cat) => {
                    const budget = tempBudgets.find(b => b.categoryId === cat.id);
                    return (
                      <div key={cat.id} className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40">Category Name</label>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => handleUpdateCategoryName(cat.id, e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white outline-none focus:border-white/30"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40">Monthly Budget</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">{currencySymbol}</span>
                            <input
                              type="number"
                              value={budget?.amount || ''}
                              onChange={(e) => handleUpdateBudget(cat.id, Number(e.target.value))}
                              placeholder="0"
                              className="w-full rounded-xl border border-white/10 bg-white/5 p-2 pl-8 text-sm text-white outline-none focus:border-white/30"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleSave}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-black transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
