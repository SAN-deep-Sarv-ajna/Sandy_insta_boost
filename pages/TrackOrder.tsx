import React, { useState, useEffect } from 'react';
import { Search, Activity, Clock, CheckCircle, XCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { fetchOrderStatus } from '../services/smmProvider';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const TrackOrder: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const oid = searchParams.get('orderId');
    if (oid) {
        setOrderId(oid);
        handleTrackById(oid);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleTrackById(orderId);
  }

  const handleTrackById = async (id: string) => {
    if (!id.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. If User is Logged In, try to find the Order in Firestore (Local Lookup)
      if (user && db) {
          const docRef = doc(db, 'orders', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
              const localOrder = docSnap.data();
              
              // CASE A: Order is still in Admin Queue
              if (localOrder.status === 'PENDING_APPROVAL') {
                  setResult({
                      status: 'Pending Approval',
                      localStatus: 'In Queue',
                      details: 'Waiting for admin to approve processing.'
                  });
                  setLoading(false);
                  return;
              }

              // CASE B: Order Rejected
              if (localOrder.status === 'CANCELED_REFUNDED') {
                  setResult({
                      status: 'Canceled',
                      localStatus: 'Refunded',
                      details: localOrder.cancelReason || 'Order rejected by admin.'
                  });
                  setLoading(false);
                  return;
              }

              // CASE C: Order is Processing -> Check Provider API
              if (localOrder.providerOrderId) {
                  const apiData = await fetchOrderStatus(localOrder.providerOrderId);
                  
                  if (apiData.error) {
                      // Fallback if API fails but we have local data
                      setResult({
                          status: localOrder.status,
                          localStatus: localOrder.status,
                          error: 'Provider API unavailable, showing local status.'
                      });
                  } else {
                      setResult({
                          ...apiData,
                          localData: localOrder // Keep local context
                      });
                  }
                  setLoading(false);
                  return;
              }
          }
      }

      // 2. Fallback: If not found locally (or user not logged in), try Direct Provider Check
      // This supports cases where user might have the actual Provider ID (rare) or old system.
      const data = await fetchOrderStatus(id);
      
      if (data.error) {
         // Custom error message for clarity
         if (!user) {
             setError("Order not found. If this is a recent purchase, please Login to track it securely.");
         } else {
             setError("Order ID not found in system or provider.");
         }
      } else {
        setResult(data);
      }

    } catch (err: any) {
      setError("Failed to fetch status. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('completed')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s.includes('processing') || s.includes('progress') || s.includes('active')) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (s.includes('pending') || s.includes('queue')) return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s.includes('cancel') || s.includes('refund')) return 'text-rose-700 bg-rose-50 border-rose-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  return (
    <div className="max-w-xl mx-auto space-y-10 py-6 md:py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Activity className="text-brand-600" size={32} />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">
          Track Your Order
        </h2>
        <p className="text-slate-500 text-sm md:text-lg font-medium">Enter your Order ID to check real-time progress.</p>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter Order ID (e.g. 5x8s...)"
            className="flex-1 p-4 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-mono text-base md:text-lg font-bold text-slate-800 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !orderId}
            className="bg-slate-900 text-white w-full sm:w-auto px-8 py-4 sm:py-0 rounded-xl font-bold hover:bg-brand-600 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            <span>Check</span>
          </button>
        </form>

        {!user && (
            <p className="text-center text-xs text-slate-400 mt-4 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                <Link to="/my-orders" className="text-brand-600 hover:underline">Login</Link> is recommended to track orders by their Purchase ID.
            </p>
        )}

        {error && (
          <div className="mt-6 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            
            {/* Main Status Card */}
            <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-sm ${getStatusColor(result.status)}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/60 rounded-full backdrop-blur-sm">
                    {result.status?.includes('Completed') ? <CheckCircle size={24} /> : 
                    result.status?.includes('Cancel') ? <XCircle size={24} /> : 
                    <Clock size={24} />}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase opacity-70 block mb-0.5 tracking-widest">Current Status</span>
                  <span className="text-lg md:text-xl font-black capitalize tracking-tight leading-tight">{result.status}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase opacity-70 block mb-0.5 tracking-widest">Order ID</span>
                <span className="font-mono font-bold text-lg md:text-xl">
                    #{orderId.length > 8 ? orderId.slice(0,6) + '..' : orderId}
                </span>
              </div>
            </div>
            
            {/* Details Grid (Only if live data exists) */}
            {result.start_count !== undefined ? (
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
            ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                    <p className="text-slate-600 font-medium text-sm">
                        {result.details || "Order is in queue for processing. Check back shortly."}
                    </p>
                </div>
            )}

            {/* Back Button */}
            {user && (
                <Link to="/my-orders" className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 py-2 transition-colors uppercase tracking-wide">
                    View All My Orders <ArrowRight size={14} />
                </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;