import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { Session, Expense } from '../types';
import { GlassCard } from './GlassCard';
import { motion, AnimatePresence } from 'motion/react';
import { SESSION_ICONS, SESSION_COLORS, getSessionIcon } from '../utils/sessionIcons';
import { cn, triggerHaptic } from '../utils';

interface SessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onAddSession: (session: Omit<Session, 'id' | 'createdAt'>) => void;
  onUpdateSession: (id: string, updates: Partial<Session>) => void;
  onDeleteSession: (id: string, migrateToSessionId?: string) => void;
  expenses: Expense[];
}

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  expenses,
}) => {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('graduation-cap');
  const [color, setColor] = useState('#818CF8');

  // Deletion prompt state
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const [migrateToId, setMigrateToId] = useState<string>('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('graduation-cap');
    setColor('#818CF8');
    setEditingId(null);
    setMode('list');
  };

  const handleStartAdd = () => {
    resetForm();
    setMode('add');
  };

  const handleStartEdit = (session: Session) => {
    setEditingId(session.id);
    setName(session.name);
    setDescription(session.description || '');
    setIcon(session.icon || 'folder');
    setColor(session.color || '#818CF8');
    setMode('edit');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    triggerHaptic();

    if (mode === 'add') {
      onAddSession({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
      });
    } else if (mode === 'edit' && editingId) {
      onUpdateSession(editingId, {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
      });
    }

    resetForm();
  };

  const handleConfirmDelete = () => {
    if (!deletingSession) return;
    triggerHaptic();
    onDeleteSession(deletingSession.id, migrateToId || undefined);
    setDeletingSession(null);
    setMigrateToId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/90 p-6 shadow-2xl backdrop-blur-2xl text-white scrollbar-hide"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-light text-white">
              {mode === 'list' ? 'Expense Spaces / Sessions' : mode === 'add' ? 'Create New Space' : 'Edit Space'}
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              {mode === 'list'
                ? 'Separate college, home, and trip expenses into distinct spaces.'
                : 'Configure your space details and visual style.'}
            </p>
          </div>
          <button
            onClick={() => {
              if (mode !== 'list') setMode('list');
              else onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Delete Confirmation Modal Overlay */}
        <AnimatePresence>
          {deletingSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-200">Delete "{deletingSession.name}" space?</h3>
                  {(() => {
                    const count = expenses.filter((e) => (e.sessionId || sessions[0]?.id) === deletingSession.id).length;
                    const remainingSessions = sessions.filter((s) => s.id !== deletingSession.id);

                    return (
                      <div className="mt-2 space-y-3 text-xs text-white/80">
                        <p>
                          This space contains <span className="font-semibold text-white">{count} transactions</span>.
                        </p>

                        {count > 0 && remainingSessions.length > 0 && (
                          <div>
                            <label className="block text-[11px] text-white/60 mb-1 font-medium">
                              Move existing transactions to:
                            </label>
                            <select
                              value={migrateToId || remainingSessions[0]?.id}
                              onChange={(e) => setMigrateToId(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-black/60 p-2 text-white outline-none"
                            >
                              {remainingSessions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                              <option value="delete">Delete transactions too</option>
                            </select>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={handleConfirmDelete}
                            className="rounded-xl bg-red-500/80 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-red-600"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setDeletingSession(null)}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'list' ? (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {sessions.map((session) => {
                const IconComp = getSessionIcon(session.icon);
                const sessionExpenses = expenses.filter(
                  (e) => (e.sessionId || sessions[0]?.id) === session.id
                );
                const totalSpent = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);
                const isActive = activeSessionId === session.id;

                return (
                  <GlassCard
                    key={session.id}
                    className={cn(
                      'group flex items-center justify-between p-4 transition-all duration-200 cursor-pointer border',
                      isActive
                        ? 'border-white/30 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                    )}
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                        style={{
                          backgroundColor: `${session.color}20`,
                          borderColor: `${session.color}40`,
                          color: session.color,
                        }}
                      >
                        <IconComp size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white truncate text-sm">{session.name}</h3>
                          {isActive && (
                            <span className="rounded-full bg-white/20 border border-white/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 truncate">
                          {session.description || `${sessionExpenses.length} transactions`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-light text-white">
                          {sessionExpenses.length} txns
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartEdit(session)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                          title="Edit space"
                        >
                          <Edit2 size={14} />
                        </button>
                        {sessions.length > 1 && (
                          <button
                            onClick={() => {
                              const fallback = sessions.find((s) => s.id !== session.id)?.id || '';
                              setMigrateToId(fallback);
                              setDeletingSession(session);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Delete space"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            <button
              onClick={handleStartAdd}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] py-3.5 text-sm font-medium text-white/80 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              <Plus size={16} />
              Add New Space
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Space Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                Space Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. College / Hostel, Goa Trip, Home"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/30"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Canteen, books, mess fees, hostel rent"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/20 outline-none focus:border-white/30"
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                Select Icon
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {SESSION_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center gap-1',
                        isSelected
                          ? 'border-white/40 bg-white/20 text-white shadow-sm'
                          : 'border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      )}
                      title={item.label}
                    >
                      <IconComp size={18} />
                      <span className="text-[9px] truncate max-w-full">{item.label.split('/')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                Accent Color
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {SESSION_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'h-8 w-8 rounded-full border flex items-center justify-center transition-all',
                      color === c.value
                        ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                        : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                    )}
                    style={{ backgroundColor: c.value }}
                  >
                    {color === c.value && <Check size={14} className="text-black drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-95"
              >
                {mode === 'add' ? 'Create Space' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setMode('list')}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
