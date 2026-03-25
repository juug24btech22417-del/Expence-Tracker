import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend, Line } from 'recharts';
import { Expense, CategoryDefinition, CategoryId } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';

interface ChartsProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
}

export const Charts: React.FC<ChartsProps> = ({ expenses, categories }) => {
  const { currencySymbol } = useCurrency();
  const categoryData = expenses.reduce((acc, curr) => {
    // Handle both old string categories and new IDs for backward compatibility
    const id = curr.categoryId || (curr as any).category?.toLowerCase();
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + curr.amount;
    return acc;
  }, {} as Record<CategoryId, number>);

  const pieData = Object.entries(categoryData).map(([id, value]) => {
    const category = categories.find(c => c.id === id || c.name.toLowerCase() === id);
    return {
      id,
      name: category?.name || 'Other',
      value,
      color: category?.color || '#7A8B99',
    };
  }).filter(d => (d.value as number) > 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const dailyData = last7Days.map((date) => {
    const amount = expenses
      .filter((e) => e.date.startsWith(date))
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
      amount,
    };
  });

  // Calculate simple trendline (average)
  const totalAmount = dailyData.reduce((sum, d) => sum + d.amount, 0);
  const averageAmount = totalAmount / dailyData.length;
  const trendData = dailyData.map(() => ({ trend: averageAmount }));
  const combinedData = dailyData.map((d, i) => ({ ...d, ...trendData[i] }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <GlassCard className="h-[350px]">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">Spending by Category</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="40%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: '#fff' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
              formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Amount']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', paddingTop: '20px', color: 'rgba(255,255,255,0.6)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="h-[350px]">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">Daily Spending (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={combinedData}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: '#fff' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
              formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Amount']}
            />
            <Bar dataKey="amount" fill="#fff" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="trend" stroke="#f97316" strokeWidth={2} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
};
