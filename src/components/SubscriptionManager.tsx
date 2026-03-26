import React, { useState, useMemo } from 'react';
import { Expense, Subscription } from '../types';
import { GlassCard } from './GlassCard';
import { Calendar, CreditCard, X } from 'lucide-react';

interface SubscriptionManagerProps {
  expenses: Expense[];
  subscriptions: Subscription[];
  onAddSubscription: (sub: Subscription) => void;
  onRemoveSubscription: (id: string) => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ expenses, subscriptions, onAddSubscription, onRemoveSubscription }) => {
  const detectedSubscriptions = useMemo(() => {
    // Basic subscription detection logic
    const groups: Record<string, Expense[]> = {};
    expenses.forEach(e => {
      const key = e.description.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    return Object.entries(groups)
      .filter(([_, exps]) => exps.length >= 2)
      .map(([name, exps]) => {
        const sorted = exps.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const last = sorted[sorted.length - 1];
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          amount: last.amount,
          categoryId: last.categoryId,
          billingCycle: 'monthly',
          lastPaymentDate: last.date,
          nextRenewalDate: new Date(new Date(last.date).setMonth(new Date(last.date).getMonth() + 1)).toISOString(),
          status: 'active'
        } as Subscription;
      });
  }, [expenses]);

  const [newSub, setNewSub] = useState({ 
    name: '', 
    amount: '', 
    categoryId: 'other', 
    billingCycle: 'monthly' as const,
    lastPaymentDate: new Date().toISOString().split('T')[0],
    nextRenewalDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  });

  const handleAddManual = () => {
    if (!newSub.name || !newSub.amount) return;
    onAddSubscription({
      id: Math.random().toString(36).substr(2, 9),
      name: newSub.name,
      amount: Number(newSub.amount),
      categoryId: newSub.categoryId,
      billingCycle: newSub.billingCycle,
      lastPaymentDate: new Date(newSub.lastPaymentDate).toISOString(),
      nextRenewalDate: new Date(newSub.nextRenewalDate).toISOString(),
      status: 'active'
    });
    setNewSub({ 
      name: '', 
      amount: '', 
      categoryId: 'other', 
      billingCycle: 'monthly',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      nextRenewalDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-white">Subscriptions</h2>
      
      <GlassCard className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-white/60">Add Subscription Manually</h3>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Name" value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} className="rounded-lg bg-white/5 p-2 text-sm text-white" />
          <input type="number" placeholder="Amount" value={newSub.amount} onChange={e => setNewSub({...newSub, amount: e.target.value})} className="rounded-lg bg-white/5 p-2 text-sm text-white" />
          <input type="date" value={newSub.lastPaymentDate} onChange={e => setNewSub({...newSub, lastPaymentDate: e.target.value})} className="rounded-lg bg-white/5 p-2 text-sm text-white" />
          <input type="date" value={newSub.nextRenewalDate} onChange={e => setNewSub({...newSub, nextRenewalDate: e.target.value})} className="rounded-lg bg-white/5 p-2 text-sm text-white" />
        </div>
        <button onClick={handleAddManual} className="w-full rounded-lg bg-white/10 py-2 text-sm text-white hover:bg-white/20">Add</button>
      </GlassCard>

      <div className="grid gap-4">
        {subscriptions.map(sub => (
          <GlassCard key={sub.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-white/10">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{sub.name}</p>
                <p className="text-white/60 text-sm">Next: {new Date(sub.nextRenewalDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-white font-medium">₹{sub.amount}</p>
              <button onClick={() => onRemoveSubscription(sub.id)} className="text-white/60 hover:text-red-400">
                <X size={18} />
              </button>
            </div>
          </GlassCard>
        ))}
        {detectedSubscriptions.filter(ds => !subscriptions.some(s => s.name === ds.name)).map(ds => (
          <GlassCard key={ds.id} className="p-4 flex items-center justify-between border-dashed border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-white/5">
                <Calendar size={20} className="text-white/40" />
              </div>
              <div>
                <p className="text-white/80 font-medium">{ds.name} (Detected)</p>
              </div>
            </div>
            <button onClick={() => onAddSubscription(ds)} className="text-white/60 hover:text-white">
              Add
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
