import React, { useMemo } from 'react';
import { Subscription } from '../types';
import { AlertTriangle } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface SubscriptionAlertsProps {
  subscriptions: Subscription[];
}

export const SubscriptionAlerts: React.FC<SubscriptionAlertsProps> = ({ subscriptions }) => {
  const alerts = useMemo(() => {
    const today = new Date();
    return subscriptions.filter(sub => {
      const renewalDate = new Date(sub.nextRenewalDate);
      const diffDays = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    });
  }, [subscriptions]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <GlassCard key={alert.id} className="p-3 flex items-center gap-3 border-yellow-500/30 bg-yellow-500/10">
          <AlertTriangle size={20} className="text-yellow-500" />
          <p className="text-white text-sm">
            Your {alert.name} subscription will renew soon for ₹{alert.amount}.
          </p>
        </GlassCard>
      ))}
    </div>
  );
};
