
import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestDocs: () => void;
  onCompliance: () => void;
  onGetSuggestion: () => Promise<string>;
  status: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  onApprove, 
  onReject, 
  onRequestDocs,
  onCompliance,
  onGetSuggestion, 
  status 
}) => {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setSuggestion(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === 'analyzing') return;
    onSendMessage(input);
    setInput('');
    setSuggestion(null);
  };

  const handleSuggest = async () => {
    setSuggestionLoading(true);
    setSuggestion(null);
    try {
      const text = await onGetSuggestion();
      setSuggestion(text);
    } catch (error) {
      console.error("Suggestion error:", error);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const applySuggestion = () => {
    if (suggestion) {
      setInput(suggestion);
      setSuggestion(null);
    }
  };

  const getRoleBadge = (role: Message['role']) => {
    switch (role) {
      case 'user':
        return { label: 'Temsilci (Siz)', icon: '👤', class: 'text-blue-400' };
      case 'customer':
        return { label: 'Müşteri', icon: '📞', class: 'text-slate-400' };
      case 'trainer':
        return { label: 'Eğitmen Sistemi', icon: '🎓', class: 'text-amber-400' };
      default:
        return { label: 'Sistem', icon: '🤖', class: 'text-slate-500' };
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[700px] min-h-[500px] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 relative">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-slate-200 font-bold tracking-wide text-sm uppercase">Canlı Simülasyon Hattı</span>
        </div>
      </div>

      {/* Messages Scrollable View */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-3xl border border-slate-700 mb-4">🎧</div>
            <h3 className="text-slate-200 font-bold mb-1">Görüşme Hazır</h3>
            <p className="text-slate-500 text-xs px-10">Müşteri bağlandı. Profil analizine başlayın.</p>
          </div>
        )}

        {messages.map((m, i) => {
          const badge = getRoleBadge(m.role);
          const isUser = m.role === 'user';
          const isTrainer = m.role === 'trainer';
          
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex items-center gap-2 mb-1.5 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${badge.class}`}>
                  <span>{badge.icon}</span>{badge.label}
                </span>
              </div>
              <div className={`group relative max-w-[90%] px-4 py-3 rounded-2xl shadow-sm border ${
                isUser ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none' 
                : isTrainer ? 'bg-amber-900/20 text-amber-100 border-amber-500/30 rounded-tl-none italic'
                : 'bg-slate-800 text-slate-100 border-slate-700 rounded-tl-none'
              }`}>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap font-medium">{m.content}</p>
                {isTrainer && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>}
              </div>
            </div>
          );
        })}

        {status === 'analyzing' && (
          <div className="flex gap-1.5 p-3 bg-slate-800/50 rounded-xl w-fit">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          </div>
        )}
      </div>

      {/* Suggestion Popover - Now for Basic Tips */}
      {suggestion && (
        <div ref={suggestionRef} className="absolute bottom-48 right-6 left-6 bg-slate-800 border-2 border-blue-500/50 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-30">
          <h4 className="text-[10px] font-black text-blue-400 uppercase mb-1.5 tracking-wider">💡 Hızlı İpucu</h4>
          <p className="text-[13px] text-slate-200 font-bold mb-4 italic leading-snug">"{suggestion}"</p>
          <div className="flex gap-2">
            <button onClick={applySuggestion} className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-4 py-2 rounded-xl">Metni Hazırla</button>
            <button onClick={() => setSuggestion(null)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold px-4 py-2 rounded-xl">Kapat</button>
          </div>
        </div>
      )}

      {/* Input & Decision Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700 z-10 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Müşteriye sorunuzu yazın..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3.5 text-slate-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-600"
            disabled={status === 'analyzing'}
          />
          <button type="button" onClick={handleSuggest} disabled={status === 'analyzing' || suggestionLoading} className="bg-slate-700 w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-600 transition-all text-xl" title="İpucu Al">
             {suggestionLoading ? '⏳' : '💡'}
          </button>
          <button type="submit" disabled={status === 'analyzing' || !input.trim()} className="bg-blue-600 px-6 h-12 rounded-2xl text-white font-bold text-sm hover:bg-blue-500 transition-all">GÖNDER</button>
        </form>
        
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onApprove} disabled={status === 'analyzing'} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 text-[10px] font-black uppercase py-2.5 rounded-xl transition-all">✅ ONAYLA</button>
          <button onClick={onReject} disabled={status === 'analyzing'} className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/30 text-[10px] font-black uppercase py-2.5 rounded-xl transition-all">❌ REDDET</button>
          <button onClick={onRequestDocs} disabled={status === 'analyzing'} className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-600/30 text-[10px] font-black uppercase py-2.5 rounded-xl transition-all">📄 BELGE TALEP ET</button>
          <button onClick={onCompliance} disabled={status === 'analyzing'} className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 text-[10px] font-black uppercase py-2.5 rounded-xl transition-all">⚖️ UYUMA GÖNDER</button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
