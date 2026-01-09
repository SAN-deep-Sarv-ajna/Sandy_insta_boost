import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">AI Marketing Strategist</h1>
        <p className="text-slate-600">
          Use this tool to generate marketing ideas, caption strategies, or growth hacks for your clients.
        </p>
      </div>

      {/* AI Assistant */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 flex items-center gap-3 text-white">
          <Bot className="text-brand-400" size={28} />
          <div>
            <h2 className="font-bold text-lg">Growth Advisor</h2>
            <p className="text-slate-400 text-xs">Powered by Gemini AI</p>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 min-h-[300px] flex flex-col">
          <div className="flex-1 mb-6">
             {isAiLoading ? (
               <div className="flex items-center justify-center h-full gap-2 text-brand-600">
                 <Sparkles className="animate-spin" size={20} /> Generative AI is thinking...
               </div>
             ) : aiResponse ? (
               <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                 <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Strategic Advice</h3>
                 <p className="text-slate-800 leading-relaxed whitespace-pre-line">{aiResponse}</p>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                 <Bot size={48} className="opacity-20" />
                 <p>Ask a question to get started.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                    <button onClick={() => setAiPrompt("How to increase engagement on Instagram Reels in India?")} className="text-xs bg-white border border-slate-200 p-2 rounded hover:bg-slate-100">"How to increase Reels engagement?"</button>
                    <button onClick={() => setAiPrompt("Best time to post on Facebook for Indian audience?")} className="text-xs bg-white border border-slate-200 p-2 rounded hover:bg-slate-100">"Best time to post in India?"</button>
                 </div>
               </div>
             )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiAdvice()}
              placeholder="Ex: suggest 3 viral content ideas for a fashion brand..."
              className="w-full bg-white border border-slate-300 rounded-xl py-4 pl-4 pr-12 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
            />
            <button 
              onClick={handleAiAdvice}
              className="absolute right-3 top-3 p-1.5 bg-brand-600 rounded-lg text-white hover:bg-brand-700 transition-colors"
            >
              <MessageSquare size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;