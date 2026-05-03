import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Sparkles, Mic, Camera, Square, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { splitBillWithAI, splitBillAudioWithAI, splitBillReceiptWithAI } from '../services/geminiService';
import { useCurrency } from '../contexts/CurrencyContext';

interface SavedGroup {
  id: string;
  name: string;
  members: string;
}

interface SplitBillModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({ isOpen, setIsOpen }) => {
  const { currencySymbol, baseCurrency } = useCurrency();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null>(null);

  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>(() => {
    const saved = localStorage.getItem('savedSplitGroups');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Roommates', members: 'Alice, Bob, Me (split equally)' }
    ];
  });
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');

  useEffect(() => {
    localStorage.setItem('savedSplitGroups', JSON.stringify(savedGroups));
  }, [savedGroups]);

  const handleSaveGroup = () => {
    if (!newGroupName.trim() || !newGroupMembers.trim()) return;
    setSavedGroups(prev => [...prev, {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      members: newGroupMembers.trim()
    }]);
    setNewGroupName('');
    setNewGroupMembers('');
    setIsAddingGroup(false);
  };
  
  const handleDeleteGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleApplyGroup = (group: SavedGroup) => {
    const prefix = `Split between: ${group.members}.\n`;
    if (!input.includes(prefix)) {
      setInput(prev => prefix + prev);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const handleProcessText = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    const res = await splitBillWithAI(input, baseCurrency);
    setResult(res);
    setIsLoading(false);
  };

  const handleVoiceInput = async () => {
    if (isListening) {
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
        stream.getTracks().forEach(track => track.stop());

        if (duration < 1000) {
          return; // Ignore if less than 1 second
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsLoading(true);
          const res = await splitBillAudioWithAI(base64Audio, audioBlob.type, baseCurrency);
          setResult(res);
          setIsLoading(false);
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

      setIsLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await splitBillReceiptWithAI(base64, baseCurrency);
        setResult(res);
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md"
          >
            <GlassCard className="bg-white/5 border-white/10 backdrop-blur-3xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-white" />
                  <h2 className="text-xl font-medium text-white">Split Bill AI</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {!result ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/40">Describe the bill</label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleVoiceInput}
                          disabled={isLoading}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                          title={isListening ? "Stop Recording" : "Voice Input"}
                        >
                          {isListening ? (
                            <Square size={12} className="animate-pulse text-red-400" fill="currentColor" />
                          ) : (
                            <Mic size={14} />
                          )}
                        </button>
                        <button
                          onClick={handleReceiptScan}
                          disabled={isLoading || isListening}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                          title="Scan Receipt"
                        >
                          <Camera size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Saved Groups</span>
                        <button 
                          onClick={() => setIsAddingGroup(!isAddingGroup)}
                          className="text-[10px] uppercase font-medium text-indigo-300 hover:text-indigo-200"
                        >
                          {isAddingGroup ? 'Cancel' : '+ Add Group'}
                        </button>
                      </div>
                      
                      {isAddingGroup && (
                        <div className="mb-3 p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                          <input 
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="Group Name (e.g. Roommates)"
                            className="w-full bg-transparent border-b border-white/10 p-1 text-sm text-white focus:border-white/30 outline-none"
                          />
                          <input 
                            value={newGroupMembers}
                            onChange={e => setNewGroupMembers(e.target.value)}
                            placeholder="Rules (e.g. Alice 40%, Bob 60%)"
                            className="w-full bg-transparent border-b border-white/10 p-1 text-sm text-white focus:border-white/30 outline-none"
                          />
                          <button 
                            onClick={handleSaveGroup}
                            className="w-full py-1.5 mt-2 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded-lg hover:bg-indigo-500/30 transition"
                          >
                            Save Group
                          </button>
                        </div>
                      )}
                      
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {savedGroups.map(group => (
                          <button
                            key={group.id}
                            onClick={() => handleApplyGroup(group)}
                            className="group relative flex items-center justify-between gap-3 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex-shrink-0"
                          >
                            <span className="text-xs text-white/80">{group.name}</span>
                            <div 
                              onClick={(e) => handleDeleteGroup(group.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-500/20 text-red-400 transition"
                            >
                              <Trash2 size={12} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g., Dinner was 1200. Alice had the steak (400), Bob had the fish (300), I had the salad (200). We shared a 300 bottle of wine."
                      className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"
                      disabled={isLoading || isListening}
                    />
                  </div>

                  <button
                    onClick={handleProcessText}
                    disabled={isLoading || isListening || !input.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-black transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Split with AI
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest text-white/40">Total Bill</p>
                    <p className="text-3xl font-light text-white">{currencySymbol}{result.total.toFixed(2)}</p>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {result.splits.map((split, i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white">{split.person}</span>
                          <span className="font-medium text-white">{currencySymbol}{split.amount.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-white/60">{split.items.join(', ')}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setResult(null);
                      setInput('');
                    }}
                    className="w-full rounded-xl border border-white/10 bg-transparent py-3 font-medium text-white transition-colors hover:bg-white/5"
                  >
                    Split Another Bill
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
