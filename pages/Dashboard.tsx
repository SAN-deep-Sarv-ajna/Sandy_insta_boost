
import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare, Send, RefreshCw } from 'lucide-react';
import { getMarketingAdvice } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiAdvice = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const advice = await getMarketingAdvice(aiPrompt, 'General');
      setAiResponse(advice);
    } catch (e) {
      setAiResponse("Could not get advice at this time.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">AI Marketing Strategist</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Generate expert marketing ideas, caption strategies, and growth hacks specifically tailored for the Indian market.
        </p>
      </div>

      {/* AI Assistant */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="bg-slate-900 p-6 flex items-center gap-4 text-white border-b border-slate-800">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
             <Bot className="text-white" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-xl tracking-tight">Growth Advisor</h2>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Powered by Gemini AI</p>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-8 bg-slate-50/50 flex flex-col justify-end">
          <div className="space-y-6 mb-8 overflow-y-auto max-h-[400px] pr-2">
             
             {/* Empty State */}
             {!aiResponse && !isAiLoading && (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-6 py-10 opacity-70">
                 <Bot size={64} className="opacity-10" />
                 <p className="font-bold text-slate-500 text-sm uppercase tracking-wide">Ask a question to start generating ideas.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
                    <button onClick={() => setAiPrompt("How to increase engagement on Instagram Reels in India?")} className="text-xs text-left bg-white border border-slate-200 p-4 rounded-xl hover:bg-slate-50 hover:border-brand-200 hover:text-brand-700 transition-all shadow-sm font-semibold text-slate-600">
                        ✨ "How to increase Reels engagement?"
                    </button>
                    <button onClick={() => setAiPrompt("Best time to post on Facebook for Indian audience?")} className="text-xs text-left bg-white border border-slate-200 p-4 rounded-xl hover:bg-slate-50 hover:border-brand-200 hover:text-brand-700 transition-all shadow-sm font-semibold text-slate-600">
                        🕒 "Best time to post in India?"
                    </button>
                 </div>
               </div>
             )}

             {/* User Query (Simulated visual if needed, but keeping it simple) */}
             {/* Response Bubble */}
             {isAiLoading && (
               <div className="flex gap-4 max-w-2xl animate-pulse">
                 <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                    <Sparkles size={18} className="text-brand-600" />
                 </div>
                 <div className="space-y-2 w-full">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                 </div>
               </div>
             )}

             {aiResponse && !isAiLoading && (
               <div className="flex gap-4 max-w-3xl animate-in slide-in-from-bottom-2 duration-300">
                 <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center shrink-0 shadow-md shadow-brand-500/20 mt-1">
                    <Bot size={20} className="text-white" />
                 </div>
                 <div className="bg-white p-6 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                   <h3 className="text-[10px] font-extrabold text-brand-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Sparkles size={12} /> Strategic Advice
                   </h3>
                   <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                      {aiResponse}
                   </div>
                 </div>
               </div>
             )}
          </div>

          {/* Input Area */}
          <div className="relative">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiAdvice()}
              placeholder="Ask for viral ideas, hashtags, or strategies..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-6 pr-16 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 shadow-lg shadow-slate-100/50 transition-all text-base font-semibold"
            />
            <button 
              onClick={handleAiAdvice}
              disabled={!aiPrompt.trim() || isAiLoading}
              className="absolute right-3 top-3 p-2.5 bg-slate-900 rounded-xl text-white hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-md active:scale-95"
            >
              {isAiLoading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
