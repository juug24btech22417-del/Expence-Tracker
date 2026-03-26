export type CategoryId = string;

export type RegretStatus = 'yes' | 'neutral' | 'no';

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
  regretStatus?: RegretStatus;
  carbonFootprint?: number; // kg CO2e
}

export interface Budget {
  categoryId: CategoryId;
  amount: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  categoryId: CategoryId;
  billingCycle: 'monthly' | 'yearly';
  lastPaymentDate: string;
  nextRenewalDate: string;
  status: 'active' | 'cancelled';
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'food', name: 'Food', color: '#A3B1C6' },
  { id: 'transport', name: 'Transport', color: '#B4A7D6' },
  { id: 'shopping', name: 'Shopping', color: '#8E9299' },
  { id: 'entertainment', name: 'Entertainment', color: '#C2B59B' },
  { id: 'health', name: 'Health', color: '#93B0A2' },
  { id: 'other', name: 'Other', color: '#7A8B99' },
];
