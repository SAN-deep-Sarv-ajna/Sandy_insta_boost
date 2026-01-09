import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Package, Clock, CheckCircle, XCircle, Loader2, Search, ExternalLink, Activity, ArrowRight } from 'lucide-react';
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
      if (s.includes('COMPLETED') || s === 'Completed') return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-emerald-200 flex items-center gap-1"><CheckCircle size={10} /> Completed</span>;
      if (s.includes('PROCESSING') || s === 'Processing') return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-blue-200 flex items-center gap-1"><Activity size={10} /> Processing</span>;
      if (s.includes('PENDING')) return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-amber-200 flex items-center gap-1"><Clock size={10} /> Queue</span>;
      return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-rose-200 flex items-center gap-1"><XCircle size={10} /> {s}</span>;
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <Package className="text-brand-600" /> My Orders
            </h2>
            <p className="text-slate-500 font-medium mt-1">History of all your purchases and their status.</p>
        </div>
        <Link to="/calculator" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2">
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
            <div className="overflow-x-auto">
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
        )}
      </div>
    </div>
  );
};

export default MyOrders;