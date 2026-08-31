export type CategoryId = string;

export type RegretStatus = 'yes' | 'neutral' | 'no';

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  color: string;
}

export interface Session {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: CategoryId;
  description: string;
  date: string; // ISO string
  sessionId?: string; // id of the session it belongs to
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

export const DEFAULT_SESSIONS: Session[] = [
  {
    id: 'college',
    name: 'College',
    icon: 'graduation-cap',
    color: '#818CF8',
    description: 'Hostel, canteen, books, tuition & campus expenses',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'home',
    name: 'Home',
    icon: 'home',
    color: '#34D399',
    description: 'Groceries, utilities, family expenses & home stay',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'personal',
    name: 'Personal',
    icon: 'sparkles',
    color: '#F472B6',
    description: 'Leisure, subscriptions, hobbies & shopping',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'food', name: 'Food', color: '#A3B1C6' },
  { id: 'transport', name: 'Transport', color: '#B4A7D6' },
  { id: 'shopping', name: 'Shopping', color: '#8E9299' },
  { id: 'entertainment', name: 'Entertainment', color: '#C2B59B' },
  { id: 'health', name: 'Health', color: '#93B0A2' },
  { id: 'other', name: 'Other', color: '#7A8B99' },
];
