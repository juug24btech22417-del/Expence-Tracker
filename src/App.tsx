import React, { useState, useEffect } from 'react';
import { Mic, Camera, LayoutDashboard, List, PieChart as ChartIcon, Sparkles, Wallet, Plane, Users, Square, Settings, AlertTriangle, CreditCard, Layers } from 'lucide-react';
import { Expense, CategoryId, Budget, CategoryDefinition, DEFAULT_CATEGORIES, RegretStatus, Subscription, Session, DEFAULT_SESSIONS } from './types';
import { GlassCard } from './components/GlassCard';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Charts } from './components/Charts';
import { BudgetProgress } from './components/BudgetProgress';
import { BudgetManager } from './components/BudgetManager';
import { SplitBillModal } from './components/SplitBillModal';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { SplashScreen } from './components/SplashScreen';
import { SubscriptionManager } from './components/SubscriptionManager';
import { SubscriptionAlerts } from './components/SubscriptionAlerts';
import { AIAssistant } from './components/AIAssistant';
import { SessionBar } from './components/SessionBar';
import { SessionManagerModal } from './components/SessionManagerModal';
import { motion, AnimatePresence } from 'motion/react';
import { parseExpenseWithAI, scanReceiptWithAI, parseAudioExpenseWithAI, parseSMSTransactionWithAI, estimateCarbonFootprintWithAI } from './services/geminiService';
import { Waves } from './components/Waves';
import { cn, triggerHaptic } from './utils';
import { useTheme } from './contexts/ThemeContext';
import { useCurrency } from './contexts/CurrencyContext';
import { CURRENCIES } from './constants';
import { RegretInsights } from './components/RegretInsights';
import { AISpendingSummary } from './components/AISpendingSummary';
import { RegretNudge } from './components/RegretNudge';
import { CashflowSankey } from './components/CashflowSankey';
import { TopCategoriesSummary } from './components/TopCategoriesSummary';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { baseCurrency, setBaseCurrency, currencySymbol, exchangeRates, setExchangeRate, travelMode, setTravelMode } = useCurrency();
  
  // Sessions & Spaces State
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('activeSessionId') || 'college';
  });

  const [isSessionManagerOpen, setIsSessionManagerOpen] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [categories, setCategories] = useState<CategoryDefinition[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('budgets');
    return saved ? JSON.parse(saved) : [
      { categoryId: 'food', amount: 5000 },
      { categoryId: 'transport', amount: 2000 },
      { categoryId: 'shopping', amount: 3000 },
    ];
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'stats' | 'cashflow' | 'budgets' | 'regret' | 'subscriptions'>('dashboard');
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [budgetAlert, setBudgetAlert] = useState<{ message: string, type: 'warning' | 'danger' } | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordingStartTimeRef = React.useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('activeSessionId', activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  const defaultSessionId = sessions[0]?.id || 'college';

  // Filtered expenses based on active session
  const filteredExpenses = React.useMemo(() => {
    if (activeSessionId === 'all') return expenses;
    return expenses.filter(e => (e.sessionId || defaultSessionId) === activeSessionId);
  }, [expenses, activeSessionId, defaultSessionId]);

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Session Handlers
  const handleAddSession = (newSessionData: Omit<Session, 'id' | 'createdAt'>) => {
    const newSession: Session = {
      ...newSessionData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };

  const handleUpdateSession = (id: string, updates: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteSession = (id: string, migrateToSessionId?: string) => {
    if (sessions.length <= 1) return;

    if (migrateToSessionId && migrateToSessionId !== 'delete') {
      setExpenses(prev => prev.map(e => (e.sessionId || defaultSessionId) === id ? { ...e, sessionId: migrateToSessionId } : e));
    } else if (migrateToSessionId === 'delete') {
      setExpenses(prev => prev.filter(e => (e.sessionId || defaultSessionId) !== id));
    } else {
      const remaining = sessions.filter(s => s.id !== id);
      const fallbackId = remaining[0]?.id || 'college';
      setExpenses(prev => prev.map(e => (e.sessionId || defaultSessionId) === id ? { ...e, sessionId: fallbackId } : e));
    }

    const remainingSessions = sessions.filter(s => s.id !== id);
    setSessions(remainingSessions);
    if (activeSessionId === id) {
      setActiveSessionId(remainingSessions[0]?.id || 'all');
    }
  };

  // Migrate old bright colors to new muted colors
  useEffect(() => {
    const colorMap: Record<string, string> = {
      '#FF6B6B': '#A3B1C6',
      '#4ECDC4': '#B4A7D6',
      '#FFE66D': '#8E9299',
      '#A594F9': '#C2B59B',
      '#6BCB77': '#93B0A2',
      '#95A5A6': '#7A8B99',
    };
    
    setCategories(prev => {
      let changed = false;
      const next = prev.map(c => {
        if (colorMap[c.color]) {
          changed = true;
          return { ...c, color: colorMap[c.color] };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, []);

  const addSubscription = (sub: Subscription) => {
    setSubscriptions(prev => [...prev, sub]);
  };

  const removeSubscription = (id: string) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  };

  const addExpense = async (data: { amount: number; categoryId: CategoryId; description: string; date?: string; sessionId?: string; originalAmount?: number; originalCurrency?: string; alreadyConverted?: boolean }) => {
    let finalAmount = data.amount;
    
    // If original currency is provided and different from base, convert it.
    if (data.originalCurrency && data.originalCurrency !== baseCurrency && exchangeRates[data.originalCurrency] && !data.alreadyConverted) {
      const rate = exchangeRates[data.originalCurrency];
      finalAmount = data.amount / rate;
    }

    let carbonFootprint = null;
    if (data.categoryId === 'transport') {
      carbonFootprint = await estimateCarbonFootprintWithAI(data.description, finalAmount);
    }

    const targetSessionId = data.sessionId || (activeSessionId === 'all' ? (sessions[0]?.id || 'college') : activeSessionId);

    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      sessionId: targetSessionId,
      amount: finalAmount,
      date: data.date || new Date().toISOString(),
      carbonFootprint: carbonFootprint?.carbonFootprint
    };

    // Check budget
    const categoryBudget = budgets.find(b => b.categoryId === data.categoryId);
    if (categoryBudget) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const categorySpent = filteredExpenses
        .filter(e => {
          const d = new Date(e.date);
          return e.categoryId === data.categoryId && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0);
        
      const newTotal = categorySpent + finalAmount;
      const categoryName = categories.find(c => c.id === data.categoryId)?.name || data.categoryId;

      if (newTotal > categoryBudget.amount) {
        setBudgetAlert({ message: `You have exceeded your budget for ${categoryName}!`, type: 'danger' });
        setTimeout(() => setBudgetAlert(null), 5000);
      } else if (newTotal >= categoryBudget.amount * 0.8) {
        setBudgetAlert({ message: `You are approaching your budget limit for ${categoryName}.`, type: 'warning' });
        setTimeout(() => setBudgetAlert(null), 5000);
      }
    }

    setExpenses((prev) => [newExpense, ...prev]);
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const exportData = (format: 'csv' | 'json' | 'pdf') => {
    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text('Expense Summary', 14, 15);
      (doc as any).autoTable({
        head: [['ID', 'Date', 'Space', 'Amount', 'Currency', 'Category', 'Description']],
        body: filteredExpenses.map(e => {
          const s = sessions.find(sess => sess.id === (e.sessionId || defaultSessionId));
          return [e.id, e.date, s?.name || 'Default', e.amount, e.originalCurrency || baseCurrency, e.categoryId, e.description];
        }),
        startY: 20,
      });
      doc.save('expenses.pdf');
      return;
    }

    let dataStr = '';
    let mimeType = '';
    let fileName = `expenses.${format}`;

    if (format === 'json') {
      dataStr = JSON.stringify(filteredExpenses, null, 2);
      mimeType = 'application/json';
    } else {
      const headers = ['ID', 'Date', 'Space', 'Amount', 'Currency', 'Category', 'Description'];
      const rows = filteredExpenses.map(e => {
        const s = sessions.find(sess => sess.id === (e.sessionId || defaultSessionId));
        return [e.id, e.date, s?.name || 'Default', e.amount, e.originalCurrency || baseCurrency, e.categoryId, e.description];
      });
      dataStr = [headers, ...rows].map(row => row.join(',')).join('\n');
      mimeType = 'text/csv';
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRateExpense = (id: string, status: RegretStatus) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, regretStatus: status } : e));
  };

  const unratedExpense = React.useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return filteredExpenses.find(e => !e.regretStatus && new Date(e.date) <= threeDaysAgo);
  }, [filteredExpenses]);

  const handleVoiceLog = async () => {
    if (isListening) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = Date.now() - recordingStartTimeRef.current;
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        if (duration < 1000) {
          // Recording too short, ignore
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          setIsProcessingVoice(true);
          const result = await parseAudioExpenseWithAI(base64Audio, audioBlob.type, travelMode, baseCurrency, exchangeRates);
          setIsProcessingVoice(false);

          if (result) {
            const categoryId = categories.find(c => c.name.toLowerCase() === (result as any).category.toLowerCase())?.id || 'other';
            addExpense({
              amount: result.amount,
              categoryId,
              description: result.description,
              originalAmount: result.originalAmount,
              originalCurrency: result.originalCurrency,
              alreadyConverted: true
            });
          } else {
            alert("Couldn't understand that. Try again!");
          }
        };
      };

      mediaRecorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsListening(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const handleReceiptScan = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsScanning(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await scanReceiptWithAI(base64, travelMode, baseCurrency, exchangeRates);
        setIsScanning(false);
        if (result) {
          const categoryId = categories.find(c => c.name.toLowerCase() === (result as any).category.toLowerCase())?.id || 'other';
          addExpense({
            amount: result.amount,
            categoryId,
            description: result.description,
            originalAmount: result.originalAmount,
            originalCurrency: result.originalCurrency,
            alreadyConverted: true
          });
        } else {
          alert("Couldn't scan receipt. Try a clearer photo!");
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen text-white selection:bg-white/20">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Animated Waves Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Waves
          lineColor="rgba(255, 255, 255, 0.15)"
          backgroundColor="#000000"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
          className="absolute inset-0"
        />
      </div>

      {/* Travel Mode Banner */}
      <AnimatePresence>
        {travelMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-xl"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
              <Plane size={12} />
            </div>
            <span className="text-xs font-medium tracking-wide text-indigo-200">
              Travel Mode • Auto-converting to {baseCurrency}
            </span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Alert Toast */}
      <AnimatePresence>
        {budgetAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/80 px-6 py-3 shadow-2xl backdrop-blur-xl"
          >
            <div className={cn("h-2 w-2 rounded-full", budgetAlert.type === 'danger' ? "bg-red-500" : "bg-yellow-500")} />
            <p className="text-sm font-medium text-white">{budgetAlert.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-6 sm:pt-12 pb-32">
        {/* Header */}
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner backdrop-blur-md">
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight">Glass Ledger</h1>
              <p className="text-xs sm:text-sm text-white/40">Manage your wealth with clarity.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                triggerHaptic();
                setIsSessionManagerOpen(true);
              }}
              className="flex h-9 sm:h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white shrink-0"
              title="Manage Spaces"
            >
              <Layers size={14} />
              <span>Spaces</span>
            </button>

            <button
              onClick={() => setTravelMode(!travelMode)}
              className={cn(
                "flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border transition-all",
                travelMode 
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" 
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              )}
              title="Travel Mode (Auto-Convert Foreign Currency)"
            >
              <Plane size={16} className="sm:size-[18px]" />
            </button>
            <button
              onClick={() => setIsSplitBillOpen(true)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
              title="Split Bill AI"
            >
              <Users size={16} className="sm:size-[18px]" />
            </button>
            <button
              onClick={handleVoiceLog}
              disabled={isProcessingVoice}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              title={isListening ? "Stop Recording" : "Voice Log"}
            >
              {isListening ? (
                <Square size={13} className="animate-pulse text-red-400" fill="currentColor" />
              ) : (
                <Mic size={16} className="sm:size-[18px]" />
              )}
            </button>
            <button
              onClick={handleReceiptScan}
              disabled={isScanning}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              title="Scan Receipt"
            >
              <Camera size={16} className={cn('sm:size-[18px]', isScanning ? 'animate-pulse text-emerald-400' : '')} />
            </button>
            <button
              onClick={() => {
                triggerHaptic();
                setIsSettingsOpen(true);
              }}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
              title="Settings"
            >
              <Settings size={16} className="sm:size-[18px]" />
            </button>
          </div>
        </header>

        {/* Space / Session Switcher Bar */}
        <SessionBar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onOpenManager={() => setIsSessionManagerOpen(true)}
          expenses={expenses}
        />

        {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200/20 bg-white/90 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/80"
              >
                <h3 className="mb-6 text-xl font-light text-gray-900 dark:text-white">Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40 dark:text-gray-400">
                      Spaces & Contexts
                    </label>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsSessionManagerOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white hover:bg-white/10 transition-all"
                    >
                      <Layers size={16} />
                      <span>Manage Spaces (College, Home, etc.)</span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40 dark:text-gray-400">
                      Theme
                    </label>
                    <button
                      onClick={toggleTheme}
                      className="w-full rounded-xl border border-gray-200/20 bg-gray-100/10 p-3 text-center text-gray-800 dark:text-white/60 transition-all hover:bg-gray-200/20 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                    >
                      {theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                    </button>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40 dark:text-gray-400">
                      Base Currency
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => setBaseCurrency(c.code)}
                          className={cn(
                            "rounded-xl border p-3 text-center transition-all",
                            baseCurrency === c.code
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                              : "border-gray-200/20 bg-gray-100/50 text-gray-800 hover:bg-gray-200/20 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                          )}
                        >
                          <span className="block text-lg font-light">{c.symbol}</span>
                          <span className="mt-1 block text-[10px] uppercase tracking-wider">{c.code}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-white/40">
                      Changing the base currency will apply to all new expenses and AI conversions.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
                      Travel Mode
                    </label>
                    <button
                      onClick={() => setTravelMode(!travelMode)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-center transition-all",
                        travelMode
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          : "border-gray-200/20 bg-gray-100/50 text-gray-800 hover:bg-gray-200/20 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                      )}
                    >
                      {travelMode ? 'Enabled' : 'Disabled'}
                    </button>
                    <p className="mt-3 text-xs text-white/40">
                      When enabled, the AI will try to detect the original currency of your expenses.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
                      Export Data
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => exportData('csv')}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-white/60 transition-all hover:bg-white/10 hover:text-white"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => exportData('json')}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-white/60 transition-all hover:bg-white/10 hover:text-white"
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={() => exportData('pdf')}
                        className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center text-white/60 transition-all hover:bg-white/10 hover:text-white"
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
                      Exchange Rates (1 [Currency] = X {baseCurrency})
                    </label>
                    <div className="space-y-2">
                      {['USD', 'EUR', 'GBP'].map(currency => (
                        <div key={currency} className="flex items-center gap-2">
                          <span className="text-white/60 w-12">{currency}</span>
                          <input
                            type="number"
                            value={exchangeRates[currency] || ''}
                            onChange={(e) => setExchangeRate(currency, Number(e.target.value))}
                            placeholder="Rate"
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 p-2 text-white outline-none focus:border-white/30"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
                      Developer Tools
                    </label>
                    <button
                      onClick={() => {
                        setExpenses(prev => prev.map(e => {
                          const newDate = new Date(e.date);
                          newDate.setDate(newDate.getDate() - 3);
                          return { ...e, date: newDate.toISOString() };
                        }));
                        setIsSettingsOpen(false);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      Fast Forward 3 Days (Test Regret)
                    </button>
                    <p className="mt-3 text-xs text-white/40">
                      Ages all expenses by 3 days to trigger regret nudges.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="mt-8 w-full rounded-xl bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  Done
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Hero Card */}
        <GlassCard className="mb-12 py-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
            {activeSessionId === 'all' ? 'Total Combined Spending' : `Spending • ${sessions.find(s => s.id === activeSessionId)?.name || 'Space'}`}
          </p>
          <h2 className="mt-2 text-6xl font-extralight tracking-tighter">
            <span className="text-white/40">{currencySymbol}</span>
            {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Transactions</p>
              <p className="text-lg font-light">{filteredExpenses.length}</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Daily Avg</p>
              <p className="text-lg font-light">
                {currencySymbol}{(totalSpent / (filteredExpenses.length || 1)).toFixed(2)}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
            { id: 'history', icon: List, label: 'History' },
            { id: 'budgets', icon: Wallet, label: 'Budgets' },
            { id: 'stats', icon: ChartIcon, label: 'Analytics' },
            { id: 'cashflow', icon: Sparkles, label: 'Cashflow' },
            { id: 'regret', icon: AlertTriangle, label: 'Regret Insights' },
            { id: 'subscriptions', icon: CreditCard, label: 'Subs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex min-w-[80px] flex-1 items-center justify-center gap-1.5 rounded-2xl border py-3 text-[10px] transition-all',
                activeTab === tab.id
                  ? 'border-white/20 bg-white/10 text-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                  : 'border-transparent text-white/40 hover:text-white/60 font-medium'
              )}
            >
              <tab.icon size={14} className="shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <AnimatePresence>
                  {unratedExpense && (
                    <RegretNudge expense={unratedExpense} onRate={handleRateExpense} />
                  )}
                </AnimatePresence>
                <TopCategoriesSummary expenses={filteredExpenses} categories={categories} />
                <SubscriptionAlerts subscriptions={subscriptions} />
                <Charts expenses={filteredExpenses.slice(0, 10)} categories={categories} />
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white/60">Recent Activity</h3>
                    <button onClick={() => setActiveTab('history')} className="text-xs text-indigo-400 hover:underline">
                      View All
                    </button>
                  </div>
                  <ExpenseList 
                    expenses={filteredExpenses.slice(0, 5)} 
                    categories={categories} 
                    sessions={sessions}
                    showSessionBadge={activeSessionId === 'all'}
                    onDelete={deleteExpense} 
                    onRate={handleRateExpense} 
                    onUpdate={updateExpense}
                  />
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/60">
                    Transaction History {activeSessionId !== 'all' && `(${sessions.find(s => s.id === activeSessionId)?.name || ''})`}
                  </h3>
                  <button onClick={() => setActiveTab('dashboard')} className="text-xs text-indigo-400 hover:underline">
                    View Less
                  </button>
                </div>
                <ExpenseList 
                  expenses={filteredExpenses} 
                  categories={categories} 
                  sessions={sessions}
                  showSessionBadge={activeSessionId === 'all'}
                  onDelete={deleteExpense} 
                  onRate={handleRateExpense} 
                  onUpdate={updateExpense}
                />
              </div>
            )}

            {activeTab === 'budgets' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/60">Monthly Budgets</h3>
                  <BudgetManager 
                    expenses={filteredExpenses}
                    budgets={budgets} 
                    categories={categories} 
                    onUpdateBudgets={setBudgets} 
                    onUpdateCategories={setCategories} 
                  />
                </div>
                <BudgetProgress expenses={filteredExpenses} budgets={budgets} categories={categories} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-8">
                <h3 className="mb-2 text-sm font-medium text-white/60">Deep Insights</h3>
                <Charts expenses={filteredExpenses} categories={categories} />
                <WhatIfSimulator expenses={filteredExpenses} categories={categories} />
                <AISpendingSummary expenses={filteredExpenses} categories={categories} />
              </div>
            )}

            {activeTab === 'cashflow' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                   <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                     <Sparkles size={18} />
                   </div>
                   <h2 className="text-2xl font-light">Cashflow Visualization</h2>
                </div>
                <CashflowSankey expenses={filteredExpenses} categories={categories} />
              </motion.div>
            )}

            {activeTab === 'regret' && (
              <div className="space-y-6">
                <RegretInsights expenses={filteredExpenses} categories={categories} />
              </div>
            )}
            {activeTab === 'subscriptions' && (
              <SubscriptionManager 
                expenses={filteredExpenses} 
                subscriptions={subscriptions} 
                onAddSubscription={addSubscription} 
                onRemoveSubscription={removeSubscription} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* AI Assistant */}
      <AIAssistant 
        expenses={filteredExpenses} 
        budgets={budgets} 
        categories={categories} 
        onAddExpense={addExpense}
        travelMode={travelMode}
        exchangeRates={exchangeRates}
      />

      {/* Add Expense Button & Form */}
      <ExpenseForm 
        categories={categories} 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onAdd={addExpense} 
      />
      
      {/* Split Bill Modal */}
      <SplitBillModal isOpen={isSplitBillOpen} setIsOpen={setIsSplitBillOpen} />

      {/* Space / Session Manager Modal */}
      <SessionManagerModal
        isOpen={isSessionManagerOpen}
        onClose={() => setIsSessionManagerOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onAddSession={handleAddSession}
        onUpdateSession={handleUpdateSession}
        onDeleteSession={handleDeleteSession}
        expenses={expenses}
      />

      {/* Loading States */}
      {(isScanning || isProcessingVoice) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-white" />
            </div>
            <p className="text-sm font-medium tracking-widest uppercase text-white/60">
              {isScanning ? 'Scanning Receipt...' : 'Processing Voice...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
