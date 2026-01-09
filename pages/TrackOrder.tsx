
import React, { useState } from 'react';
import { Search, Package, Activity, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { fetchOrderStatus } from '../services/smmProvider';

const TrackOrder: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchOrderStatus(orderId);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError("Failed to fetch status. Please check your connection or API key.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 'processing' || s === 'inprogress') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (s === 'pending') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s === 'canceled') return 'text-rose-700 bg-rose-50 border-rose-200';
    if (s === 'partial') return 'text-purple-700 bg-purple-50 border-purple-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  return (
    <div className="max-w-xl mx-auto space-y-10 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Activity className="text-brand-600" size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
          Track Your Order
        </h2>
        <p className="text-slate-500 text-lg font-medium">Enter your Order ID to check real-time progress.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <form onSubmit={handleTrack} className="flex gap-3">
          <input
            type="number"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter Order ID (e.g. 45923)"
            className="flex-1 p-4 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-mono text-lg font-bold text-slate-800 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !orderId}
            className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-brand-600 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center gap-2 uppercase tracking-wide text-xs"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            <span>Check</span>
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-sm ${getStatusColor(result.status)}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/60 rounded-full backdrop-blur-sm">
                    {result.status === 'Completed' ? <CheckCircle size={24} /> : 
                    result.status === 'Canceled' ? <XCircle size={24} /> : 
                    <Clock size={24} />}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase opacity-70 block mb-0.5 tracking-widest">Status</span>
                  <span className="text-xl font-black capitalize tracking-tight">{result.status}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase opacity-70 block mb-0.5 tracking-widest">Order ID</span>
                <span className="font-mono font-bold text-xl">#{orderId}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest">Start Count</span>
                <p className="text-2xl font-black text-slate-800 mt-1 font-mono tracking-tighter">{result.start_count ?? '-'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest">Remains</span>
                <p className="text-2xl font-black text-slate-800 mt-1 font-mono tracking-tighter">{result.remains ?? '-'}</p>
              </div>
            </div>

            {result.currency && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Currency: <span className="font-bold text-slate-700">{result.currency}</span> | Charge: <span className="font-bold text-slate-700">{result.charge}</span>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
