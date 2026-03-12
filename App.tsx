
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, CustomerProfile, Message } from './types';
import { generateScenario, evaluateResponse, getQuestionSuggestion } from './services/geminiService';
import ProfileCard from './components/ProfileCard';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    score: 0,
    level: 1,
    currentProfile: null,
    history: [],
    status: 'idle',
    correctAnswers: 0,
    totalAttempts: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'kolay' | 'orta' | 'zor'>('orta');

  const isQuotaError = (error: any) => {
    const errStr = JSON.stringify(error).toLowerCase();
    const msg = (error?.message || "").toLowerCase();
    return errStr.includes('429') || 
           errStr.includes('resource_exhausted') || 
           errStr.includes('quota') ||
           msg.includes('429') ||
           msg.includes('resource_exhausted');
  };

  const loadNewScenario = useCallback(async (diffOverride?: 'kolay' | 'orta' | 'zor') => {
    setState(prev => ({ ...prev, status: 'analyzing', history: [] }));
    setErrorMessage(null);
    try {
      const profile = await generateScenario(diffOverride || difficulty);
      setState(prev => ({
        ...prev,
        currentProfile: profile,
        status: 'idle'
      }));
    } catch (error: any) {
      console.error("Scenario Error:", error);
      setErrorMessage(isQuotaError(error) 
        ? "Günlük API kullanım kotanız doldu. Lütfen bir süre bekleyip tekrar deneyin veya ücretli bir API anahtarı kullanın."
        : "Senaryo yüklenirken bir hata oluştu. Lütfen bağlantınızı kontrol edin."
      );
      setState(prev => ({ ...prev, status: 'error' }));
    }
  }, []);

  useEffect(() => {
    loadNewScenario(difficulty);
  }, [difficulty]);

  const handleUpdateProfileField = (field: keyof CustomerProfile, value: string | number) => {
    if (!state.currentProfile) return;
    setState(prev => ({
      ...prev,
      currentProfile: {
        ...prev.currentProfile!,
        [field]: value
      }
    }));
  };

  const handleSendMessage = async (text: string) => {
    if (!state.currentProfile) return;
    setErrorMessage(null);

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setState(prev => ({
      ...prev,
      status: 'analyzing',
      history: [...prev.history, userMsg]
    }));

    try {
      const evaluation = await evaluateResponse(state.currentProfile, text, state.history);
      
      const aiMsg: Message = {
        role: evaluation.role,
        content: evaluation.text,
        timestamp: new Date(),
        evaluation: evaluation
      };

      setState(prev => {
        const isTrainer = evaluation.role === 'trainer';
        const newCorrect = evaluation.isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers;
        const newScore = prev.score + (evaluation.points || (evaluation.isCorrect ? 100 : -100));
        
        return {
          ...prev,
          history: [...prev.history, aiMsg],
          status: isTrainer ? 'feedback' : 'roleplay',
          correctAnswers: newCorrect,
          totalAttempts: isTrainer ? prev.totalAttempts + 1 : prev.totalAttempts,
          score: Math.max(0, newScore),
          level: Math.floor(newCorrect / 3) + 1
        };
      });
    } catch (error: any) {
      console.error("Evaluation Error:", error);
      setErrorMessage(isQuotaError(error) 
        ? "API Kotası doldu (429). Lütfen bir süre bekleyin veya farklı bir API anahtarı deneyin." 
        : "Yapay zeka şu an yanıt veremiyor, lütfen tekrar deneyin.");
      setState(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const handleApprove = async () => {
    if (!state.currentProfile) return;
    setState(prev => ({ ...prev, status: 'analyzing' }));
    await handleSendMessage("Görüşmeyi başarıyla tamamladım ve profili ONAYLIYORUM.");
  };

  const handleReject = async () => {
    if (!state.currentProfile) return;
    setState(prev => ({ ...prev, status: 'analyzing' }));
    await handleSendMessage("Profilde güvenlik riski tespit ettim ve işlemi REDDEDİYORUM.");
  };

  const handleRequestDocs = async () => {
    if (!state.currentProfile) return;
    setState(prev => ({ ...prev, status: 'analyzing' }));
    await handleSendMessage("Beyan edilen gelir/meslek verileri yetersiz olduğu için GELİR BELGESİ TALEP EDİYORUM.");
  };

  const handleSendToCompliance = async () => {
    if (!state.currentProfile) return;
    setState(prev => ({ ...prev, status: 'analyzing' }));
    await handleSendMessage("Tarafımdan yapılan ilk inceleme tutarlı olsa da nihai onay için dosyayı UYUMA GÖNDERİYORUM.");
  };

  const handleGetSuggestion = async () => {
    if (!state.currentProfile) return "";
    return await getQuestionSuggestion(state.currentProfile, state.history);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar: Dashboard */}
      <aside className="w-full lg:w-80 bg-slate-900 text-white p-6 border-r border-slate-800 flex flex-col gap-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">V</div>
          <div>
            <h1 className="font-bold text-sm tracking-tight uppercase">Video KYC Trainer</h1>
            <p className="text-[10px] text-slate-500 font-medium">KVHS AKADEMİ v4.0 (2026)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Skor</p>
            <p className="text-3xl font-black text-blue-400">{state.score}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Seviye</p>
            <p className="text-3xl font-black text-emerald-400">{state.level}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Zorluk Seviyesi</h3>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            {(['kolay', 'orta', 'zor'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                  difficulty === d 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Başarı İstatistikleri</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Başarılı Karar</span>
              <span className="font-bold text-emerald-500">{state.correctAnswers} / {state.totalAttempts || 0}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (state.correctAnswers / Math.max(1, state.totalAttempts)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>📚</span> Eğitim Rehberi
          </h3>
          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mali Müşavir / Avukat</p>
              <p className="text-[11px] text-slate-300 italic">"Kendinize ait bir ofisiniz mi var, yoksa bir şirkette mi çalışıyorsunuz?"</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bilgi Güncelleme</p>
              <p className="text-[11px] text-slate-300 italic">"Doğru bilgileri iletebilirsiniz, ben sistem üzerinden güncelleyebilirim."</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">E-posta Uyumu</p>
              <p className="text-[11px] text-slate-300 italic">"E-posta adresiniz isminizden farklı, bu adres size mi ait?"</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Yaş & Varlık</p>
              <p className="text-[11px] text-slate-300 italic">"Yüksek gelir beyanınızın kaynağını biraz detaylandırabilir misiniz?"</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lokasyon Sorgusu</p>
              <p className="text-[11px] text-slate-300 italic">"Lokasyonunuz mesleğiniz için uzak görünüyor, uzaktan mı çalışıyorsunuz?"</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">3. Şahıs Uyarısı</p>
              <p className="text-[11px] text-slate-300 italic">"Hesabınızı bizzat sizin kullanmanız gerektiğini hatırlatmak isterim."</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-8 flex flex-col gap-6 bg-slate-50 overflow-y-auto">
        {errorMessage && (
          <div className="max-w-7xl mx-auto w-full bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-rose-800 text-sm font-medium">{errorMessage}</p>
            </div>
            {(state.status === 'error' || state.status === 'idle') && (
              <button onClick={loadNewScenario} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">Yeniden Dene</button>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <ProfileCard 
              profile={state.currentProfile} 
              loading={state.status === 'analyzing' && !state.currentProfile} 
              onUpdateField={handleUpdateProfileField}
            />
            {state.status === 'feedback' && (
              <div className="bg-slate-900 text-white border-l-4 border-blue-500 p-6 rounded-2xl animate-in slide-in-from-bottom-4 duration-300 shadow-xl">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">📢</span>
                  <div className="flex-1">
                    <h3 className="text-blue-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Eğitmen Analizi</h3>
                    
                    {/* Detailed Scores */}
                    {state.history[state.history.length - 1].evaluation?.analysis && (
                      <div className="grid grid-cols-3 gap-2 my-4">
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                          <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Mantık</p>
                          <p className="text-lg font-black text-blue-400">{state.history[state.history.length - 1].evaluation?.analysis?.logicScore}<span className="text-[10px] text-slate-600">/40</span></p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                          <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">AML</p>
                          <p className="text-lg font-black text-emerald-400">{state.history[state.history.length - 1].evaluation?.analysis?.amlScore}<span className="text-[10px] text-slate-600">/40</span></p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                          <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">İletişim</p>
                          <p className="text-lg font-black text-amber-400">{state.history[state.history.length - 1].evaluation?.analysis?.communicationScore}<span className="text-[10px] text-slate-600">/20</span></p>
                        </div>
                      </div>
                    )}

                    <div className="text-slate-300 text-sm mb-4 leading-relaxed font-medium">
                      {state.history[state.history.length - 1].evaluation?.analysis?.feedbackDetails || state.history[state.history.length - 1].content}
                    </div>

                    {/* Missed Details */}
                    {state.history[state.history.length - 1].evaluation?.analysis?.missedDetails && state.history[state.history.length - 1].evaluation!.analysis!.missedDetails.length > 0 && (
                      <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                        <h4 className="text-rose-400 text-[9px] font-bold uppercase mb-2 tracking-widest">Kaçırılan Sinsi Detaylar</h4>
                        <ul className="space-y-1">
                          {state.history[state.history.length - 1].evaluation?.analysis?.missedDetails.map((detail, idx) => (
                            <li key={idx} className="text-xs text-rose-200/70 flex items-center gap-2">
                              <span className="w-1 h-1 bg-rose-500 rounded-full"></span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button onClick={loadNewScenario} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl w-full sm:w-auto">YENİ VAKA →</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-1/2">
            <ChatInterface 
              messages={state.history} 
              onSendMessage={handleSendMessage} 
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestDocs={handleRequestDocs}
              onCompliance={handleSendToCompliance}
              onGetSuggestion={handleGetSuggestion}
              status={state.status}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
