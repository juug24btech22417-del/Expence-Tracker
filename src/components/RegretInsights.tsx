import React, { useMemo } from 'react';
import { Expense, CategoryDefinition } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { startOfMonth, isAfter, format, subDays, eachDayOfInterval } from 'date-fns';

interface RegretInsightsProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
}

export const RegretInsights: React.FC<RegretInsightsProps> = ({ expenses, categories }) => {
  const { currencySymbol } = useCurrency();

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);

    const regretExpenses = expenses.filter(e => e.rating === 'no');
    const worthItExpenses = expenses.filter(e => e.rating === 'yes');
    const currentMonthRegrets = regretExpenses.filter(e => isAfter(new Date(e.date), startOfCurrentMonth));

    const totalRegretSpending = currentMonthRegrets.reduce((sum, e) => sum + e.amount, 0);
    const ratedExpenses = expenses.filter(e => e.rating);
    const percentageRegret = ratedExpenses.length > 0 ? (regretExpenses.length / ratedExpenses.length) * 100 : 0;

    // Time of day (Regret)
    const timeCount = regretExpenses.reduce((acc, e) => {
      const hour = new Date(e.date).getHours();
      let timeOfDay = 'Night';
      if (hour >= 5 && hour < 12) timeOfDay = 'Morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';
      
      acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let mostCommonTime = 'N/A';
    let maxTimeCount = 0;
    Object.entries(timeCount).forEach(([time, count]) => {
      const c = count as number;
      if (c > maxTimeCount) {
        maxTimeCount = c;
        mostCommonTime = time;
      }
    });

    // Vendors (Regret)
    const vendorCount = regretExpenses.reduce((acc, e) => {
      const vendor = e.description.split(' ')[0] || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let mostCommonVendor = 'N/A';
    let maxVendorCount = 0;
    Object.entries(vendorCount).forEach(([vendor, count]) => {
      const c = count as number;
      if (c > maxVendorCount) {
        maxVendorCount = c;
        mostCommonVendor = vendor;
      }
    });

    // Vendors (Worth It)
    const worthItVendorCount = worthItExpenses.reduce((acc, e) => {
      const vendor = e.description.split(' ')[0] || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let mostCommonWorthItVendor = 'N/A';
    let maxWorthItVendorCount = 0;
    Object.entries(worthItVendorCount).forEach(([vendor, count]) => {
      const c = count as number;
      if (c > maxWorthItVendorCount) {
        maxWorthItVendorCount = c;
        mostCommonWorthItVendor = vendor;
      }
    });

    // Time of day (Worth It)
    const worthItTimeCount = worthItExpenses.reduce((acc, e) => {
      const hour = new Date(e.date).getHours();
      let timeOfDay = 'Night';
      if (hour >= 5 && hour < 12) timeOfDay = 'Morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';
      
      acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Data for charts
    const categoryData = categories.map(cat => {
      const amount = regretExpenses
        .filter(e => e.categoryId === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: cat.name, value: amount, color: cat.color };
    }).filter(d => d.value > 0);

    const worthItCategoryData = categories.map(cat => {
      const amount = worthItExpenses
        .filter(e => e.categoryId === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: cat.name, value: amount, color: cat.color };
    }).filter(d => d.value > 0);

    const timeData = Object.entries(timeCount).map(([name, value]) => ({
      name,
      value
    }));

    const worthItTimeData = Object.entries(worthItTimeCount).map(([name, value]) => ({
      name,
      value
    }));

    // Trend data for the last 30 days
    const last30Days = eachDayOfInterval({ start: subDays(now, 29), end: now });
    const trendData = last30Days.map(day => {
      const dayStr = format(day, 'MMM dd');
      const amount = regretExpenses
        .filter(e => format(new Date(e.date), 'MMM dd') === dayStr)
        .reduce((sum, e) => sum + e.amount, 0);
      return { date: dayStr, amount };
    });

    const COLORS = ['#f97316', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return {
      totalRegretSpending,
      percentageRegret,
      mostCommonTime,
      mostCommonVendor,
      mostCommonWorthItVendor,
      categoryData,
      worthItCategoryData,
      timeData,
      worthItTimeData,
      trendData,
      COLORS
    };
  }, [expenses, categories]);

  if (expenses.filter(e => e.rating).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/40 mb-2">No rated purchases yet.</p>
        <p className="text-xs text-white/30">Rate your past expenses to see insights here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4 border-orange-500/20 bg-orange-500/5">
          <p className="text-[10px] uppercase tracking-widest text-orange-400/60 mb-1">Regret Spending</p>
          <p className="text-2xl font-light text-orange-400">{currencySymbol}{metrics.totalRegretSpending.toFixed(2)}</p>
        </GlassCard>
        <GlassCard className="p-4 border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Regret Rate</p>
          <p className="text-2xl font-light text-white">{metrics.percentageRegret.toFixed(1)}%</p>
        </GlassCard>
        <GlassCard className="p-4 border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Top Regret Vendor</p>
          <p className="text-lg font-medium text-white capitalize truncate">{metrics.mostCommonVendor}</p>
        </GlassCard>
        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[10px] uppercase tracking-widest text-emerald-400/60 mb-1">Top Worth It Vendor</p>
          <p className="text-lg font-medium text-emerald-400 capitalize truncate">{metrics.mostCommonWorthItVendor}</p>
        </GlassCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard className="p-6 md:col-span-2">
          <h3 className="mb-6 text-sm font-medium text-white/60">Regret Spending Trend (Last 30 Days)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trendData}>
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickMargin={10} minTickGap={30} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={(value) => `${currencySymbol}${value}`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Regret Spending']}
                />
                <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#f97316' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-6 text-sm font-medium text-white/60">Regret by Category</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-6 text-sm font-medium text-white/60">Regret by Time of Day</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.timeData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'capitalize' }} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', textTransform: 'capitalize' }}
                />
                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]}>
                  {metrics.timeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={metrics.COLORS[index % metrics.COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-6 text-sm font-medium text-white/60">Worth It by Category</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.worthItCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics.worthItCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="mb-6 text-sm font-medium text-white/60">Worth It by Time of Day</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.worthItTimeData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'capitalize' }} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', textTransform: 'capitalize' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                  {metrics.worthItTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={metrics.COLORS[index % metrics.COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
