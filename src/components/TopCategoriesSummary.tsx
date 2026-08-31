import React from 'react';
import { Expense, CategoryDefinition, CategoryId } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { motion } from 'motion/react';
import { TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TopCategoriesSummaryProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
}

export const TopCategoriesSummary: React.FC<TopCategoriesSummaryProps> = ({ expenses, categories }) => {
  const { currencySymbol } = useCurrency();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = format(now, 'MMMM yyyy');

  // Filter current month expenses
  const monthlyExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [expenses, currentMonth, currentYear]);

  const totalMonthlySpent = React.useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  // Calculate spending per category
  const topCategories = React.useMemo(() => {
    const categoryTotals: Record<CategoryId, { total: number; count: number }> = {};

    monthlyExpenses.forEach(e => {
      if (!categoryTotals[e.categoryId]) {
        categoryTotals[e.categoryId] = { total: 0, count: 0 };
      }
      categoryTotals[e.categoryId].total += e.amount;
      categoryTotals[e.categoryId].count += 1;
    });

    const list = Object.entries(categoryTotals).map(([catId, data]) => {
      const category = categories.find(c => c.id === catId) || {
        id: catId,
        name: catId.charAt(0).toUpperCase() + catId.slice(1),
        color: '#A3B1C6'
      };
      const percentage = totalMonthlySpent > 0 ? (data.total / totalMonthlySpent) * 100 : 0;
      return {
        category,
        total: data.total,
        count: data.count,
        percentage
      };
    });

    // Sort descending by total amount spent
    list.sort((a, b) => b.total - a.total);

    return list.slice(0, 3);
  }, [monthlyExpenses, categories, totalMonthlySpent]);

  return (
    <GlassCard className="p-5" hover>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white">
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Top 3 Expense Categories
            </h3>
            <p className="text-[11px] text-white/40">{monthName}</p>
          </div>
        </div>

        {totalMonthlySpent > 0 && (
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-white/40 block">Month Total</span>
            <span className="text-xs font-medium text-white/80">
              {currencySymbol}{totalMonthlySpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {topCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/30 mb-2">
            <Sparkles size={18} />
          </div>
          <p className="text-xs text-white/40">No expenses recorded for this month yet</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {topCategories.map((item, index) => {
            const rankColors = [
              'text-amber-300 border-amber-400/30 bg-amber-400/10',
              'text-slate-300 border-slate-400/30 bg-slate-400/10',
              'text-amber-600 dark:text-amber-500 border-amber-600/30 bg-amber-600/10',
            ];

            return (
              <div key={item.category.id} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-bold ${rankColors[index] || 'text-white/60 border-white/20 bg-white/5'}`}
                    >
                      #{index + 1}
                    </span>
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.category.color }}
                    />
                    <span className="font-medium text-white/90">
                      {item.category.name}
                    </span>
                    <span className="text-[10px] text-white/40">
                      ({item.count} {item.count === 1 ? 'txn' : 'txns'})
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-light text-white text-sm">
                      {currencySymbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-medium text-white/40">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: item.category.color,
                      boxShadow: `0 0 10px ${item.category.color}40`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
