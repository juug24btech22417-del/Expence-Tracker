import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Sparkles, Mic, Camera, Square } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { splitBillWithAI, splitBillAudioWithAI, splitBillReceiptWithAI } from '../services/geminiService';
import { useCurrency } from '../contexts/CurrencyContext';

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
