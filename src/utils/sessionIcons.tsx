import React from 'react';
import {
  GraduationCap,
  Home,
  Briefcase,
  Plane,
  Coffee,
  Sparkles,
  ShoppingBag,
  Heart,
  Folder,
  Compass,
  Laptop,
  Dumbbell,
  Car,
  Layers,
  LucideProps,
} from 'lucide-react';

export const SESSION_ICONS: { id: string; label: string; icon: React.FC<LucideProps> }[] = [
  { id: 'graduation-cap', label: 'College / Study', icon: GraduationCap },
  { id: 'home', label: 'Home / Living', icon: Home },
  { id: 'sparkles', label: 'Personal / Lifestyle', icon: Sparkles },
  { id: 'plane', label: 'Travel / Trip', icon: Plane },
  { id: 'briefcase', label: 'Work / Business', icon: Briefcase },
  { id: 'coffee', label: 'Cafe / Hangouts', icon: Coffee },
  { id: 'shopping-bag', label: 'Shopping', icon: ShoppingBag },
  { id: 'laptop', label: 'Tech / Projects', icon: Laptop },
  { id: 'dumbbell', label: 'Fitness / Health', icon: Dumbbell },
  { id: 'car', label: 'Commute / Auto', icon: Car },
  { id: 'heart', label: 'Family & Friends', icon: Heart },
  { id: 'folder', label: 'General / Other', icon: Folder },
];

export const SESSION_COLORS = [
  { name: 'Indigo', value: '#818CF8' },
  { name: 'Emerald', value: '#34D399' },
  { name: 'Pink', value: '#F472B6' },
  { name: 'Amber', value: '#FBBF24' },
  { name: 'Sky', value: '#38BDF8' },
  { name: 'Purple', value: '#C084FC' },
  { name: 'Rose', value: '#FB7185' },
  { name: 'Teal', value: '#2DD4BF' },
];

export const getSessionIcon = (iconId?: string): React.FC<LucideProps> => {
  const found = SESSION_ICONS.find((i) => i.id === iconId);
  return found ? found.icon : Layers;
};
