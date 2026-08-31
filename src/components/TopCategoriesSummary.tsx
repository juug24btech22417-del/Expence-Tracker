import React from 'react';
import { Expense, CategoryDefinition, CategoryId } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { motion } from 'motion/react';
import { TrendingUp, Sparkles, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { format, subMonths } from 'date-fns';

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

  const prevDate = subMonths(now, 1);
  const prevMonth = prevDate.getMonth();
  const prevYear = prevDate.getFullYear();
  const prevMonthName = format(prevDate, 'MMM');

  // Filter current month expenses
  const monthlyExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [expenses, currentMonth, currentYear]);

  // Filter previous month expenses
  const prevMonthlyExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });
  }, [expenses, prevMonth, prevYear]);

  const totalMonthlySpent = React.useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  // Calculate spending per category for previous month
  const prevCategoryTotals = React.useMemo(() => {
    const totals: Record<CategoryId, number> = {};
    prevMonthlyExpenses.forEach(e => {
      totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
    });
    return totals;
  }, [prevMonthlyExpenses]);

  // Calculate spending per category for current month
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
      const prevTotal = prevCategoryTotals[catId] || 0;
      const diff = data.total - prevTotal;
      let percentChange = 0;
      let trend: 'up' | 'down' | 'neutral' | 'new' = 'neutral';

      if (prevTotal === 0 && data.total > 0) {
        trend = 'new';
      } else if (prevTotal > 0) {
        percentChange = ((data.total - prevTotal) / prevTotal) * 100;
        if (Math.abs(percentChange) < 0.5) {
          trend = 'neutral';
        } else if (percentChange > 0) {
          trend = 'up';
        } else {
          trend = 'down';
        }
      }

      return {
        category,
        total: data.total,
        count: data.count,
        percentage,
        prevTotal,
        diff,
        percentChange,
        trend
      };
    });

    // Sort descending by total amount spent
    list.sort((a, b) => b.total - a.total);

    return list.slice(0, 3);
  }, [monthlyExpenses, categories, totalMonthlySpent, prevCategoryTotals]);

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
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${rankColors[index] || 'text-white/60 border-white/20 bg-white/5'}`}
                    >
                      #{index + 1}
                    </span>
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.category.color }}
                    />
                    <span className="font-medium text-white/90 truncate">
                      {item.category.name}
                    </span>
                    <span className="text-[10px] text-white/40 shrink-0 hidden xs:inline">
                      ({item.count} {item.count === 1 ? 'txn' : 'txns'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Previous Month Trend Arrow & Percentage Badge */}
                    <div
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                        item.trend === 'up'
                          ? 'text-rose-300 border-rose-500/20 bg-rose-500/10'
                          : item.trend === 'down'
                          ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10'
                          : item.trend === 'new'
                          ? 'text-indigo-300 border-indigo-500/20 bg-indigo-500/10'
                          : 'text-white/50 border-white/10 bg-white/5'
                      }`}
                      title={
                        item.trend === 'new'
                          ? `New expense category this month (none in ${prevMonthName})`
                          : `${item.percentChange >= 0 ? '+' : ''}${item.percentChange.toFixed(1)}% compared to ${prevMonthName} (${currencySymbol}${item.prevTotal.toFixed(2)})`
                      }
                    >
                      {item.trend === 'up' && <ArrowUpRight size={11} className="shrink-0 stroke-[2.5]" />}
                      {item.trend === 'down' && <ArrowDownRight size={11} className="shrink-0 stroke-[2.5]" />}
                      {item.trend === 'neutral' && <Minus size={11} className="shrink-0 stroke-[2.5]" />}
                      
                      <span>
                        {item.trend === 'new'
                          ? 'New'
                          : item.trend === 'neutral'
                          ? '0%'
                          : `${Math.abs(item.percentChange).toFixed(0)}%`}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="font-light text-white text-sm">
                        {currencySymbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-medium text-white/40">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
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
