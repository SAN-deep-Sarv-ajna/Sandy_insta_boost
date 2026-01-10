import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Package, Clock, CheckCircle, XCircle, Loader2, Search, ExternalLink, Activity, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !db) return;

    // Query: Users can only see their OWN orders
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Client-side sort by date descending
      data.sort((a: any, b: any) => {
         const timeA = a.createdAt?.seconds || 0;
         const timeB = b.createdAt?.seconds || 0;
         return timeB - timeA;
      });

      setOrders(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const getStatusBadge = (status: string) => {
      const s = status || 'PENDING';
      if (s.includes('COMPLETED') || s === 'Completed') return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-emerald-200 flex items-center gap-1.5 w-fit"><CheckCircle size={12} /> Completed</span>;
      if (s.includes('PROCESSING') || s === 'Processing') return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-blue-200 flex items-center gap-1.5 w-fit"><Activity size={12} /> Processing</span>;
      if (s.includes('PENDING')) return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-amber-200 flex items-center gap-1.5 w-fit"><Clock size={12} /> Queue</span>;
      return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-rose-200 flex items-center gap-1.5 w-fit"><XCircle size={12} /> {s}</span>;
  };

  if (!user) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
              <Package size={48} className="mb-4 opacity-20"/>
              <p>Please login to view your orders.</p>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <Package className="text-brand-600" /> My Orders
            </h2>
            <p className="text-slate-500 text-sm md:text-base font-medium mt-1">History of all your purchases and their status.</p>
        </div>
        <Link to="/calculator" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2">
            New Order <ArrowRight size={14} />
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
                <Loader2 className="animate-spin" /> Loading...
            </div>
        ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Package size={48} className="mb-4 opacity-10"/>
                <p className="font-bold text-sm">No orders found.</p>
                <Link to="/calculator" className="text-brand-600 hover:underline text-xs mt-2 font-bold">Place your first order</Link>
            </div>
        ) : (
            <>
                {/* --- MOBILE CARD VIEW (Block on md and below) --- */}
                <div className="md:hidden divide-y divide-slate-100">
                    {orders.map((order) => (
                        <div key={order.id} className="p-5 flex flex-col gap-3">
                            {/* Header: ID & Status */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-mono font-bold text-slate-800 text-sm">#{order.id.slice(0, 6).toUpperCase()}</span>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                    </p>
                                </div>
                                {getStatusBadge(order.status)}
                            </div>

                            {/* Service Details */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{order.serviceName}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{order.platform}</span>
                                    <a href={order.link} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate flex-1 block font-mono text-xs flex items-center gap-1">
                                        <LinkIcon size={10} /> Link
                                    </a>
                                </div>
                            </div>

                            {/* Footer: Stats & Action */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Quantity</span>
                                        <span className="font-mono font-bold text-slate-900">{order.quantity}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Cost</span>
                                        <span className="font-mono font-bold text-slate-900">₹{order.charge}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/track?orderId=${order.id}`)}
                                    className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-2.5 rounded-xl transition-colors"
                                >
                                    <Activity size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- DESKTOP TABLE VIEW (Hidden on mobile) --- */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Order ID</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Service</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Link</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center">Qty / Cost</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                        #{order.id.slice(0, 6).toUpperCase()}
                                        <span className="block text-[10px] text-slate-400 font-normal">
                                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="font-bold text-slate-800 truncate">{order.serviceName}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mt-0.5">{order.platform} • ID: {order.serviceId}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={order.link} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate max-w-[150px] block font-mono text-xs">
                                            {order.link}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <p className="font-bold text-slate-900">{order.quantity}</p>
                                        <p className="text-xs text-slate-500">₹{order.charge}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            {getStatusBadge(order.status)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => navigate(`/track?orderId=${order.id}`)}
                                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wide border border-slate-200 hover:border-brand-200"
                                        >
                                            <Activity size={12} /> Track
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default MyOrders;