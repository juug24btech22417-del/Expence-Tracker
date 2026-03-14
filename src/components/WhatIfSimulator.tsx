import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { simulateWhatIf } from '../services/geminiService';
import { Expense, CategoryDefinition } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';

interface WhatIfSimulatorProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ expenses, categories }) => {
  const { currencySymbol, baseCurrency } = useCurrency();
  const [scenario, setScenario] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ monthlySavings: number; yearlySavings: number; insights: string } | null>(null);

  const handleSimulate = async () => {
    if (!scenario.trim()) return;
    setIsLoading(true);

    // Create a summary of expenses to send to AI
    const categoryTotals = expenses.reduce((acc, curr) => {
      const id = curr.categoryId || (curr as any).category?.toLowerCase();
      const cat = categories.find(c => c.id === id || c.name.toLowerCase() === id);
      const name = cat?.name || 'Other';
      acc[name] = (acc[name] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    const summary = Object.entries(categoryTotals)
      .map(([name, total]) => `${name}: ${currencySymbol}${total}`)
      .join(', ');

    const res = await simulateWhatIf(scenario, summary, baseCurrency);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-indigo-400" />
        <h3 className="text-sm font-medium text-white">"What-If" Scenarios</h3>
      </div>
      
      <p className="text-xs text-white/60">
        Simulate how cutting a specific expense impacts your savings goals.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="e.g., What if I stop buying daily coffee?"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"
          onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
        />
        <button
          onClick={handleSimulate}
          disabled={isLoading || !scenario.trim()}
          className="flex items-center justify-center rounded-xl bg-white px-4 text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          ) : (
            <ArrowRight size={18} />
          )}
        </button>
      </div>

      {result && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-emerald-400/60">Monthly Savings</p>
              <p className="text-xl font-medium text-emerald-400">+{currencySymbol}{result.monthlySavings.toFixed(0)}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-emerald-400/60">Yearly Savings</p>
              <p className="text-xl font-medium text-emerald-400">+{currencySymbol}{result.yearlySavings.toFixed(0)}</p>
            </div>
          </div>
          <p className="text-sm text-white/90 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
            {result.insights}
          </p>
        </div>
      )}
    </GlassCard>
  );
};
