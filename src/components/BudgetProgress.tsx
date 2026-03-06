import React from 'react';
import { Expense, Budget, CategoryDefinition, CategoryId } from '../types';
import { GlassCard } from './GlassCard';
import { CURRENCY_SYMBOL } from '../constants';
import { motion } from 'motion/react';

interface BudgetProgressProps {
  expenses: Expense[];
  budgets: Budget[];
  categories: CategoryDefinition[];
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({ expenses, budgets, categories }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const categorySpending = monthlyExpenses.reduce((acc, curr) => {
    acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.amount;
    return acc;
  }, {} as Record<CategoryId, number>);

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const category = categories.find(c => c.id === budget.categoryId) || categories[categories.length - 1];
        const spent = categorySpending[budget.categoryId] || 0;
        const percent = Math.min((spent / budget.amount) * 100, 100);
        const remaining = budget.amount - spent;
        const isOver = spent > budget.amount;

        return (
          <GlassCard key={budget.categoryId} className="p-4" hover>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: category.color }} 
                />
                <span className="text-sm font-medium text-zinc-900">{category.name}</span>
              </div>
              <span className="text-xs text-black/40">
                {CURRENCY_SYMBOL}{spent.toFixed(0)} / {CURRENCY_SYMBOL}{budget.amount.toFixed(0)}
              </span>
            </div>
            
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: isOver ? '#DC2626' : category.color,
                  boxShadow: `0 0 10px ${isOver ? '#DC2626' : category.color}40`
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider">
              <span className={isOver ? 'text-red-600' : 'text-black/40'}>
                {isOver ? 'Over Budget' : `${percent.toFixed(0)}% spent`}
              </span>
              <span className="text-black/40">
                {remaining >= 0 ? `${CURRENCY_SYMBOL}${remaining.toFixed(0)} left` : `${CURRENCY_SYMBOL}${Math.abs(remaining).toFixed(0)} over`}
              </span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};
