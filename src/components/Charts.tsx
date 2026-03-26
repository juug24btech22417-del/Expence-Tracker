import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, ComposedChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { Expense, CategoryDefinition } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { calculateSpendingByCategory, calculateDailySpending } from '../utils/spendingUtils';

interface ChartsProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
}

export const Charts: React.FC<ChartsProps> = ({ expenses, categories }) => {
  const { currencySymbol } = useCurrency();
  const pieData = calculateSpendingByCategory(expenses, categories);
  const dailyData = calculateDailySpending(expenses, 7);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <GlassCard className="h-[300px] md:h-[350px]">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">Spending by Category</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="40%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
              formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Amount']}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="h-[300px] md:h-[350px]">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">Daily Spending (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
              formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Amount']}
            />
            <Bar dataKey="amount" fill="#fff" radius={[4, 4, 0, 0]} barSize={20} />
          </ComposedChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
};
