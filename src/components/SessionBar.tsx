import React from 'react';
import { Layers, Plus, Settings2, Sparkles } from 'lucide-react';
import { Session, Expense } from '../types';
import { getSessionIcon } from '../utils/sessionIcons';
import { cn, triggerHaptic } from '../utils';
import { useCurrency } from '../contexts/CurrencyContext';

interface SessionBarProps {
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onOpenManager: () => void;
  expenses: Expense[];
}

export const SessionBar: React.FC<SessionBarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onOpenManager,
  expenses,
}) => {
  const { currencySymbol } = useCurrency();

  const getSessionTotal = (sessionId: string) => {
    if (sessionId === 'all') {
      return expenses.reduce((sum, e) => sum + e.amount, 0);
    }
    return expenses
      .filter((e) => (e.sessionId || sessions[0]?.id) === sessionId)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getSessionCount = (sessionId: string) => {
    if (sessionId === 'all') {
      return expenses.length;
    }
    return expenses.filter((e) => (e.sessionId || sessions[0]?.id) === sessionId).length;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white/40">
            Active Space / Session
          </span>
        </div>
        <button
          onClick={() => {
            triggerHaptic();
            onOpenManager();
          }}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
          title="Manage spaces"
        >
          <Settings2 size={13} />
          <span>Manage Spaces</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* All Sessions Combined Option */}
        <button
          onClick={() => {
            triggerHaptic();
            onSelectSession('all');
          }}
          className={cn(
            'flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs transition-all shrink-0 whitespace-nowrap',
            activeSessionId === 'all'
              ? 'border-white/30 bg-white/15 text-white font-medium shadow-[0_0_15px_rgba(255,255,255,0.08)]'
              : 'border-white/5 bg-white/[0.03] text-white/50 hover:bg-white/10 hover:text-white/80'
          )}
        >
          <Layers size={14} className={activeSessionId === 'all' ? 'text-white' : 'text-white/40'} />
          <span>All Spaces</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-white/70">
            {expenses.length}
          </span>
        </button>

        {/* Individual Sessions */}
        {sessions.map((session) => {
          const IconComp = getSessionIcon(session.icon);
          const isActive = activeSessionId === session.id;
          const count = getSessionCount(session.id);
          const total = getSessionTotal(session.id);

          return (
            <button
              key={session.id}
              onClick={() => {
                triggerHaptic();
                onSelectSession(session.id);
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-xs transition-all shrink-0 whitespace-nowrap',
                isActive
                  ? 'border-white/30 bg-white/15 text-white font-medium shadow-[0_0_15px_rgba(255,255,255,0.08)]'
                  : 'border-white/5 bg-white/[0.03] text-white/50 hover:bg-white/10 hover:text-white/80'
              )}
            >
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${session.color}25`,
                  color: session.color,
                }}
              >
                <IconComp size={12} />
              </div>
              <span className="font-medium">{session.name}</span>
              <span
                className="rounded-full px-1.5 py-0.2 text-[10px]"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {currencySymbol}
                {total > 9999 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
              </span>
            </button>
          );
        })}

        {/* Quick Add Button */}
        <button
          onClick={() => {
            triggerHaptic();
            onOpenManager();
          }}
          className="flex items-center gap-1 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-xs text-white/40 hover:border-white/30 hover:bg-white/5 hover:text-white/80 transition-all shrink-0"
          title="Create a new session"
        >
          <Plus size={13} />
          <span>New Space</span>
        </button>
      </div>
    </div>
  );
};
