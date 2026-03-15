export type CategoryId = string;

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: CategoryId;
  description: string;
  date: string; // ISO string
  originalAmount?: number;
  originalCurrency?: string;
}

export interface Budget {
  categoryId: CategoryId;
  amount: number;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'food', name: 'Food', color: '#FF6B6B' },
  { id: 'transport', name: 'Transport', color: '#4ECDC4' },
  { id: 'shopping', name: 'Shopping', color: '#FFE66D' },
  { id: 'entertainment', name: 'Entertainment', color: '#A594F9' },
  { id: 'health', name: 'Health', color: '#6BCB77' },
  { id: 'other', name: 'Other', color: '#95A5A6' },
];
