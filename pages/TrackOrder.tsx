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
    if (s === 'completed') return 'text-green-600 bg-green-100 border-green-200';
    if (s === 'processing' || s === 'inprogress') return 'text-blue-600 bg-blue-100 border-blue-200';
    if (s === 'pending') return 'text-amber-600 bg-amber-100 border-amber-200';
    if (s === 'canceled') return 'text-red-600 bg-red-100 border-red-200';
    if (s === 'partial') return 'text-purple-600 bg-purple-100 border-purple-200';
    return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Activity className="text-brand-500" />
          Track Order
        </h2>
        <p className="text-slate-500 mt-2">Enter your Order ID to see real-time progress.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleTrack} className="flex gap-2">
          <input
            type="number"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter Order ID (e.g. 45923)"
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !orderId}
            className="bg-slate-900 text-white px-6 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            Check
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className={`p-4 rounded-lg border flex items-center justify-between ${getStatusColor(result.status)}`}>
              <div className="flex items-center gap-3">
                {result.status === 'Completed' ? <CheckCircle size={24} /> : 
                 result.status === 'Canceled' ? <XCircle size={24} /> : 
                 <Clock size={24} />}
                <div>
                  <span className="text-xs font-bold uppercase opacity-70 block">Status</span>
                  <span className="text-lg font-bold capitalize">{result.status}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase opacity-70 block">Order ID</span>
                <span className="font-mono font-bold">#{orderId}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 uppercase font-bold">Start Count</span>
                <p className="text-xl font-bold text-slate-800 mt-1">{result.start_count ?? '-'}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 uppercase font-bold">Remains</span>
                <p className="text-xl font-bold text-slate-800 mt-1">{result.remains ?? '-'}</p>
              </div>
            </div>

            {result.currency && (
                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center text-xs text-slate-400">
                    Currency: {result.currency} | Charge: {result.charge}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;