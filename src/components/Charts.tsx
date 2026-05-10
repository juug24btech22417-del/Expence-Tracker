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
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="rounded-lg border border-white/10 bg-black/90 backdrop-blur-md p-3 text-white shadow-xl min-w-[120px] z-50">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{data.name}</p>
                      <p className="text-lg font-light text-white">
                        {currencySymbol}{Number(data.value).toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
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
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-black/90 backdrop-blur-md p-3 text-white shadow-xl min-w-[120px] z-50">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
                      <p className="text-lg font-light text-white">
                        {currencySymbol}{Number(payload[0].value).toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" fill="#fff" radius={[4, 4, 0, 0]} barSize={20} />
          </ComposedChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
};
