import { Expense, CategoryDefinition } from '../types';

export const calculateSpendingByCategory = (expenses: Expense[], categories: CategoryDefinition[]) => {
  const categoryData = expenses.reduce((acc, curr) => {
    const id = curr.categoryId || 'other';
    acc[id] = (acc[id] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryData).map(([id, value]) => {
    const category = categories.find(c => c.id === id);
    return {
      id,
      name: category?.name || 'Other',
      value,
      color: category?.color || '#7A8B99',
    };
  }).filter(d => d.value > 0);
};

export const calculateDailySpending = (expenses: Expense[], days: number = 7) => {
  const lastDays = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  return lastDays.map((date) => {
    const amount = expenses
      .filter((e) => e.date.startsWith(date))
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
      amount,
    };
  });
};
