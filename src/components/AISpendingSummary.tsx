import React, { useState, useEffect } from 'react';
import { Expense, CategoryDefinition } from '../types';
import { GlassCard } from './GlassCard';
import { summarizeSpendingWithAI } from '../services/geminiService';
import { useCurrency } from '../contexts/CurrencyContext';

interface AISpendingSummaryProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
}

export const AISpendingSummary: React.FC<AISpendingSummaryProps> = ({ expenses, categories }) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { currencySymbol } = useCurrency();

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      const summary = expenses.map(e => ({
        amount: e.amount,
        category: categories.find(c => c.id === e.categoryId)?.name || 'Other',
        date: e.date
      }));
      
      const result = await summarizeSpendingWithAI(JSON.stringify(summary), currencySymbol);
      if (result) {
        setInsights(result.insights);
      }
      setLoading(false);
    };

    if (expenses.length > 0) {
      fetchInsights();
    }
  }, [expenses, categories]);

  if (loading) {
    return (
      <GlassCard className="p-6">
        <h3 className="mb-4 text-sm font-medium text-white/60">AI Insights</h3>
        <p className="text-white/40">Analyzing your spending...</p>
      </GlassCard>
    );
  }

  if (insights.length === 0) return null;

  return (
    <GlassCard className="p-6">
      <h3 className="mb-4 text-sm font-medium text-white/60">AI Insights</h3>
      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <li key={index} className="text-sm text-white/80 flex items-start gap-2">
            <span className="text-indigo-400 mt-1">✦</span>
            {insight}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
};
