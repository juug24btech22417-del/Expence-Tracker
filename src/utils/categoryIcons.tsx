import React from 'react';
import { 
  UtensilsCrossed, 
  Car, 
  ShoppingBag, 
  Film, 
  HeartPulse, 
  Tag, 
  LucideIcon 
} from 'lucide-react';
import { CategoryId } from '../types';

export const getCategoryIcon = (categoryId: string): LucideIcon => {
  switch (categoryId.toLowerCase()) {
    case 'food':
      return UtensilsCrossed;
    case 'transport':
      return Car;
    case 'shopping':
      return ShoppingBag;
    case 'entertainment':
      return Film;
    case 'health':
      return HeartPulse;
    case 'other':
    default:
      return Tag;
  }
};
