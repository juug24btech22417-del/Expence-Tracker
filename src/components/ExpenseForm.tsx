import React, { useState } from 'react';
import { Plus, X, MessageSquare } from 'lucide-react';
import { CategoryDefinition, CategoryId } from '../types';
import { GlassCard } from './GlassCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { parseSMSTransactionWithAI } from '../services/geminiService';
import { CURRENCIES } from '../constants';

interface ExpenseFormProps {
  categories: CategoryDefinition[];
  onAdd: (expense: { amount: number; categoryId: CategoryId; description: string; date?: string; originalAmount?: number; originalCurrency?: string }) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ categories, onAdd }) => {
  const { currencySymbol, baseCurrency } = useCurrency();
  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60000);
    return localDate.toISOString().split('T')[0];
  };

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [originalCurrency, setOriginalCurrency] = useState(baseCurrency);
  const [categoryId, setCategoryId] = useState<CategoryId>(categories[0]?.id || 'other');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [smsText, setSmsText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDate(getLocalDateString());
    }
  }, [isOpen]);

  const handleParseSMS = async () => {
    if (!smsText.trim()) return;
    setIsParsing(true);
    const result = await parseSMSTransactionWithAI(smsText);
    setIsParsing(false);
    if (result) {
      setAmount(result.amount.toString());
      setDescription(result.description);
      const cat = categories.find(c => c.name.toLowerCase() === result.category.toLowerCase());
      if (cat) setCategoryId(cat.id);
      setSmsText('');
    } else {
      alert("Couldn't parse SMS. Try again!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    const selectedDate = new Date(date);
    const now = new Date();
    selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    // If original currency is different from base, we need to store the original amount
    // and let App.tsx handle the conversion, OR convert it here.
    // Given the current structure, App.tsx handles the conversion if originalCurrency is provided.
    // The issue is that the amount input is being treated as the final amount in base currency.
    // If originalCurrency !== baseCurrency, the amount input should be treated as originalAmount.

    const isForeign = originalCurrency !== baseCurrency;
    
    onAdd({
      amount: Number(amount),
      categoryId,
      description: description || categories.find(c => c.id === categoryId)?.name || 'Expense',
      date: selectedDate.toISOString(),
      originalAmount: isForeign ? Number(amount) : undefined,
      originalCurrency: isForeign ? originalCurrency : undefined,
    });
    
    setAmount('');
    setOriginalAmount('');
    setOriginalCurrency(baseCurrency);
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setSmsText('');
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
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      placeholder="Paste SMS transaction here..."
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"
                    />
                    <button
                      type="button"
                      onClick={handleParseSMS}
                      disabled={isParsing || !smsText.trim()}
                      className="rounded-xl bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                    >
                      {isParsing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <MessageSquare size={20} />}
                    </button>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Amount ({currencySymbol})</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-2xl font-light text-white outline-none focus:border-white/30"
                      />
                      <select
                        value={originalCurrency}
                        onChange={(e) => setOriginalCurrency(e.target.value)}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code} className="bg-black text-white">{c.code} ({c.symbol})</option>
                        ))}
                      </select>
                    </div>
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
