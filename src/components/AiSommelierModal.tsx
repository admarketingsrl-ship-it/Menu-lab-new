import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Utensils, Loader2 } from 'lucide-react';
import { Dish } from '../types';
import { askAiSommelier } from '../services/ai';

interface AiSommelierModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: Dish[];
}

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
}

export const AiSommelierModal: React.FC<AiSommelierModalProps> = ({ isOpen, onClose, dishes }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Ciao! Sono il tuo Sommelier e Chef virtuale di MenuLab. Chiedimi consigli sui nostri piatti, abbinamenti di vini o chiedimi di impacchettare un menu degustazione su misura per te!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    const aiResponse = await askAiSommelier(userMsg, dishes);
    setMessages((prev) => [...prev, { sender: 'ai', text: aiResponse }]);
    setLoading(false);
  };

  const quickPrompts = [
    'Consigliami un menu degustazione di pesce per due',
    'Quali pizze sono vegetariane e quale vino abbinare?',
    'Cosa mi consigli senza glutine?',
    'Crea un pacchetto romantico con antipasto, pizza gourmet e dolce',
  ];

  const handleQuickPrompt = async (promptText: string) => {
    if (loading) return;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: promptText }]);
    setLoading(true);

    const aiResponse = await askAiSommelier(promptText, dishes);
    setMessages((prev) => [...prev, { sender: 'ai', text: aiResponse }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[80vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">MenuLab AI Sommelier & Chef</h3>
              <p className="text-xs text-white/85">Consigli & Degustazione • Powered by Gemini 3.1 Flash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.sender === 'user' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-amber-500 text-white'
              }`}>
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-tr-none'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-700'
              }`}>
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-4 flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Il sommelier sta esaminando il menu...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 overflow-x-auto scrollbar-none">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleQuickPrompt(p)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs font-medium whitespace-nowrap hover:bg-amber-50 hover:border-amber-300 transition-colors"
            >
              ✨ {p}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Chiedi un consiglio o un menu impacchettato..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white shadow-md transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
