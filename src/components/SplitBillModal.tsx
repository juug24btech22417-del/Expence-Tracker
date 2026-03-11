import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Sparkles } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { splitBillWithAI } from '../services/geminiService';
import { CURRENCY_SYMBOL } from '../constants';

interface SplitBillModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({ isOpen, setIsOpen }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null>(null);

  const handleProcess = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    const res = await splitBillWithAI(input);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md"
          >
            <GlassCard className="bg-white/5 border-white/10 backdrop-blur-3xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-white" />
                  <h2 className="text-xl font-medium text-white">Split Bill AI</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {!result ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Describe the bill</label>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g., Dinner was 1200. Alice had the steak (400), Bob had the fish (300), I had the salad (200). We shared a 300 bottle of wine."
                      className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    onClick={handleProcess}
                    disabled={isLoading || !input.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-black transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Split with AI
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest text-white/40">Total Bill</p>
                    <p className="text-3xl font-light text-white">{CURRENCY_SYMBOL}{result.total.toFixed(2)}</p>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {result.splits.map((split, i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white">{split.person}</span>
                          <span className="font-medium text-white">{CURRENCY_SYMBOL}{split.amount.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-white/60">{split.items.join(', ')}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setResult(null);
                      setInput('');
                    }}
                    className="w-full rounded-xl border border-white/10 bg-transparent py-3 font-medium text-white transition-colors hover:bg-white/5"
                  >
                    Split Another Bill
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
