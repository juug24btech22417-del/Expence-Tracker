export type CategoryId = string;

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  color: string;
}

export type RegretStatus = 'yes' | 'neutral' | 'no';

export interface Expense {
  id: string;
  amount: number;
  categoryId: CategoryId;
  description: string;
  date: string; // ISO string
  originalAmount?: number;
  originalCurrency?: string;
  rating?: RegretStatus;
}

export interface Budget {
  categoryId: CategoryId;
  amount: number;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'food', name: 'Food', color: '#A3B1C6' },
  { id: 'transport', name: 'Transport', color: '#B4A7D6' },
  { id: 'shopping', name: 'Shopping', color: '#8E9299' },
  { id: 'entertainment', name: 'Entertainment', color: '#C2B59B' },
  { id: 'health', name: 'Health', color: '#93B0A2' },
  { id: 'other', name: 'Other', color: '#7A8B99' },
];
