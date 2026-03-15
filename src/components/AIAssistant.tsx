import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Mic, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { chatWithAIAssistant } from '../services/geminiService';
import { Expense, CategoryDefinition, CategoryId } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';

interface AIAssistantProps {
  expenses: Expense[];
  budgets: any[];
  categories: CategoryDefinition[];
  onAddExpense: (expense: { amount: number; categoryId: CategoryId; description: string }) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ expenses, budgets, categories, onAddExpense }) => {
  const { baseCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; isAudio?: boolean }[]>([
    { role: 'ai', content: 'Hi! I can help you add expenses or answer questions about your spending. What do you need?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleVoiceRecord = async () => {
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

        if (duration < 1000) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          setMessages(prev => [...prev, { role: 'user', content: '🎤 Voice message sent', isAudio: true }]);
          setIsLoading(true);

          const response = await chatWithAIAssistant(
            "I sent a voice message. Please process it.", 
            expenses, budgets, categories, baseCurrency,
            { base64Audio, mimeType: audioBlob.type }
          );
          
          setIsLoading(false);
          handleAIResponse(response);
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

  const handleAIResponse = (response: any) => {
    if (response) {
      setMessages(prev => [...prev, { role: 'ai', content: response.message }]);
      
      if (response.action) {
        const categoryId = categories.find(c => c.name.toLowerCase() === response.action!.category.toLowerCase())?.id || 'other';
        onAddExpense({
          amount: response.action.amount,
          categoryId,
          description: response.action.description
        });
      }
    } else {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I'm having trouble connecting right now. Please try again." }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const response = await chatWithAIAssistant(userMessage, expenses, budgets, categories, baseCurrency);
    setIsLoading(false);
    handleAIResponse(response);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-white/20 transition-transform hover:scale-110 active:scale-95 z-40"
      >
        <MessageSquare size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-8 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md h-[600px] max-h-[80vh] pointer-events-auto flex flex-col"
            >
              <GlassCard className="flex-1 flex flex-col bg-white/5 border-white/10 backdrop-blur-3xl overflow-hidden p-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 p-4 bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">AI Assistant</h3>
                      <p className="text-[10px] text-white/50">Powered by Gemini</p>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-white/10 text-white'}`}>
                          {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-white/10 text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-sm'} ${msg.isAudio ? 'italic text-white/60' : ''}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[80%] gap-3 flex-row">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                          <Bot size={14} />
                        </div>
                        <div className="rounded-2xl px-4 py-3 text-sm bg-white/5 border border-white/10 text-white/90 rounded-tl-sm flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-xs text-white/60">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-white/10 p-4 bg-white/5">
                  <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Ask a question or add an expense..."}
                        disabled={isListening}
                        className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-4 pr-12 text-sm text-white placeholder-white/40 outline-none focus:border-white/30 focus:bg-white/10 transition-all disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading || isListening}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black disabled:opacity-50 disabled:bg-white/20 disabled:text-white transition-colors"
                      >
                        <Send size={14} className="ml-0.5" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleVoiceRecord}
                      disabled={isLoading}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all ${
                        isListening 
                          ? 'border-red-500/50 bg-red-500/20 text-red-400 animate-pulse' 
                          : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      } disabled:opacity-50`}
                    >
                      {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                    </button>
                  </form>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
