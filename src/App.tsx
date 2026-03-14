import React, { useState, useEffect } from 'react';
import { Mic, Camera, LayoutDashboard, List, PieChart as ChartIcon, Sparkles, Wallet, Plane, Users, Square, Settings } from 'lucide-react';
import { Expense, CategoryId, Budget, CategoryDefinition, DEFAULT_CATEGORIES } from './types';
import { GlassCard } from './components/GlassCard';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Charts } from './components/Charts';
import { BudgetProgress } from './components/BudgetProgress';
import { BudgetManager } from './components/BudgetManager';
import { SplitBillModal } from './components/SplitBillModal';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { motion, AnimatePresence } from 'motion/react';
import { parseExpenseWithAI, scanReceiptWithAI, parseAudioExpenseWithAI } from './services/geminiService';
import { Waves } from './components/Waves';
import { cn } from './utils';
import { useCurrency } from './contexts/CurrencyContext';
import { CURRENCIES } from './constants';

export default function App() {
  const { baseCurrency, setBaseCurrency, currencySymbol } = useCurrency();
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'stats' | 'budgets'>('dashboard');
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isTravelMode, setIsTravelMode] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [budgetAlert, setBudgetAlert] = useState<{ message: string, type: 'warning' | 'danger' } | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordingStartTimeRef = React.useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  const addExpense = (data: { amount: number; categoryId: CategoryId; description: string }) => {
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      date: new Date().toISOString(),
    };

    // Check budget
    const categoryBudget = budgets.find(b => b.categoryId === data.categoryId);
    if (categoryBudget) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const categorySpent = expenses
        .filter(e => {
          const d = new Date(e.date);
          return e.categoryId === data.categoryId && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0);
        
      const newTotal = categorySpent + data.amount;
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

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

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
          const result = await parseAudioExpenseWithAI(base64Audio, audioBlob.type, isTravelMode, baseCurrency);
          setIsProcessingVoice(false);

          if (result) {
            const categoryId = categories.find(c => c.name.toLowerCase() === (result as any).category.toLowerCase())?.id || 'other';
            addExpense({
              amount: result.amount,
              categoryId,
              description: result.description
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
        const result = await scanReceiptWithAI(base64, isTravelMode, baseCurrency);
        setIsScanning(false);
        if (result) {
          const categoryId = categories.find(c => c.name.toLowerCase() === (result as any).category.toLowerCase())?.id || 'other';
          addExpense({
            amount: result.amount,
            categoryId,
            description: result.description
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

      {/* Budget Alert Toast */}
      <AnimatePresence>
        {budgetAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/80 px-6 py-3 shadow-2xl backdrop-blur-xl"
          >
            <div className={cn("h-2 w-2 rounded-full", budgetAlert.type === 'danger' ? "bg-red-500" : "bg-yellow-500")} />
            <p className="text-sm font-medium text-white">{budgetAlert.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-2xl px-6 pt-12 pb-32">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Glass Ledger</h1>
            <p className="text-sm text-white/40">Manage your wealth with clarity.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsTravelMode(!isTravelMode)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border transition-all",
                isTravelMode 
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" 
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              )}
              title="Travel Mode (Auto-Convert Foreign Currency)"
            >
              <Plane size={18} />
            </button>
            <button
              onClick={() => setIsSplitBillOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
              title="Split Bill AI"
            >
              <Users size={18} />
            </button>
            <button
              onClick={handleVoiceLog}
              disabled={isProcessingVoice}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              title={isListening ? "Stop Recording" : "Voice Log"}
            >
              {isListening ? (
                <Square size={14} className="animate-pulse text-red-400" fill="currentColor" />
              ) : (
                <Mic size={18} />
              )}
            </button>
            <button
              onClick={handleReceiptScan}
              disabled={isScanning}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <Camera size={18} className={isScanning ? 'animate-pulse text-emerald-400' : ''} />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

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
                className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-black/80 p-6 shadow-2xl backdrop-blur-xl"
              >
                <h3 className="mb-6 text-xl font-light text-white">Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
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
                              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span className="block text-lg font-light">{c.symbol}</span>
                          <span className="mt-1 block text-[10px] uppercase tracking-wider">{c.code}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-white/40">
                      Changing the base currency will apply to all new expenses and AI conversions.
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Total Balance Spent</p>
          <h2 className="mt-2 text-6xl font-extralight tracking-tighter">
            <span className="text-white/40">{currencySymbol}</span>
            {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Transactions</p>
              <p className="text-lg font-light">{expenses.length}</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Daily Avg</p>
              <p className="text-lg font-light">
                {currencySymbol}{(totalSpent / (expenses.length || 1)).toFixed(2)}
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
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-medium transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-transparent text-white/40 hover:text-white/60'
              )}
            >
              <tab.icon size={14} />
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
                <Charts expenses={expenses.slice(0, 10)} categories={categories} />
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white/60">Recent Activity</h3>
                    <button onClick={() => setActiveTab('history')} className="text-xs text-indigo-400 hover:underline">
                      View All
                    </button>
                  </div>
                  <ExpenseList expenses={expenses.slice(0, 5)} categories={categories} onDelete={deleteExpense} />
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="mb-6 text-sm font-medium text-white/60">Transaction History</h3>
                <ExpenseList expenses={expenses} categories={categories} onDelete={deleteExpense} />
              </div>
            )}

            {activeTab === 'budgets' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/60">Monthly Budgets</h3>
                  <BudgetManager 
                    budgets={budgets} 
                    categories={categories} 
                    onUpdateBudgets={setBudgets} 
                    onUpdateCategories={setCategories} 
                  />
                </div>
                <BudgetProgress expenses={expenses} budgets={budgets} categories={categories} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-8">
                <h3 className="mb-2 text-sm font-medium text-white/60">Deep Insights</h3>
                <Charts expenses={expenses} categories={categories} />
                <WhatIfSimulator expenses={expenses} categories={categories} />
                <GlassCard className="flex items-center gap-4 border-indigo-500/20 bg-indigo-500/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI Spending Tip</p>
                    <p className="text-xs text-white/60">
                      {expenses.length > 3 
                        ? "You've spent most on " + (categories.find(c => c.id === Object.entries(expenses.reduce((acc, e) => ({...acc, [e.categoryId]: (acc[e.categoryId] || 0) + e.amount}), {} as any)).sort((a: any, b: any) => b[1] - a[1])[0][0])?.name || 'one category') + " lately. Consider setting a budget!"
                        : "Add more expenses to get personalized AI insights."}
                    </p>
                  </div>
                </GlassCard>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Add Expense Button & Form */}
      <ExpenseForm categories={categories} onAdd={addExpense} />
      
      {/* Split Bill Modal */}
      <SplitBillModal isOpen={isSplitBillOpen} setIsOpen={setIsSplitBillOpen} />

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
