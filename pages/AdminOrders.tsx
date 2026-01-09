import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Check, X, Loader2, ListOrdered, Link as LinkIcon, AlertTriangle, AlertCircle, RefreshCw, Activity, Undo2 } from 'lucide-react';
import { placeProviderOrder, fetchOrderStatus } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';

const AdminOrders: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'ACTIVE'>('QUEUE');
  
  // Temporary state to store checked statuses for Active orders
  const [checkedStatuses, setCheckedStatuses] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isAdmin || !db) return;

    // Filter based on Tab
    const targetStatus = activeTab === 'QUEUE' ? 'PENDING_APPROVAL' : 'PROCESSING';

    const q = query(
      collection(db, 'orders'),
      where('status', '==', targetStatus)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory (Newest First)
      data.sort((a: any, b: any) => {
         const timeA = a.createdAt?.seconds || 0;
         const timeB = b.createdAt?.seconds || 0;
         return timeB - timeA;
      });

      setOrders(data);
      setError(null);
    }, (err) => {
        console.error("Firestore Error:", err);
        setError("Permission Denied or Index Missing.");
    });

    return () => unsub();
  }, [isAdmin, activeTab]);

  // 1. APPROVE (Queue -> Processing)
  const handleApprove = async (order: any) => {
    if (!window.confirm(`Approve Order for ${order.quantity} units? This will execute the API call.`)) return;
    
    setProcessingId(order.id);
    try {
        const result = await placeProviderOrder(order.serviceId, order.link, order.quantity);

        if (result.error) {
            throw new Error(result.error);
        }

        const providerOrderId = result.order;

        await runTransaction(db, async (transaction) => {
            const orderRef = doc(db, 'orders', order.id);
            transaction.update(orderRef, { 
                status: 'PROCESSING',
                providerOrderId: providerOrderId,
                approvedBy: user?.email || 'admin',
                approvedAt: serverTimestamp() 
            });
        });

        alert(`Success! Provider Order ID: ${providerOrderId}`);
    } catch (e: any) {
        alert("API Order Failed: " + e.message);
    } finally {
        setProcessingId(null);
    }
  };

  // 2. REJECT (Queue -> Canceled)
  const handleReject = async (order: any) => {
      if(!window.confirm(`Reject and REFUND ₹${order.charge} to user?`)) return;
      
      setProcessingId(order.id);
      try {
          await processRefundTransaction(order, 'Rejected from Queue');
      } catch (e: any) {
          alert("Refund Error: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  // 3. CHECK STATUS (Active Orders)
  const handleCheckStatus = async (order: any) => {
      if (!order.providerOrderId) return alert("No Provider Order ID found.");
      
      setProcessingId(order.id);
      try {
          const statusData = await fetchOrderStatus(order.providerOrderId);
          if (statusData.error) throw new Error(statusData.error);
          
          setCheckedStatuses(prev => ({
              ...prev,
              [order.id]: statusData
          }));
      } catch (e: any) {
          alert("Status Check Failed: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  // 4. REFUND PROVIDER FAIL (Processing -> Canceled)
  const handleProviderRefund = async (order: any, apiStatus: string) => {
      if (!window.confirm(`Provider Status is '${apiStatus}'.\n\nConfirm REFUND of ₹${order.charge} to user?`)) return;

      setProcessingId(order.id);
      try {
          await processRefundTransaction(order, `Provider ${apiStatus} (ID: ${order.providerOrderId})`);
          // Clear the checked status as it is moved out of list
          const newStatuses = { ...checkedStatuses };
          delete newStatuses[order.id];
          setCheckedStatuses(newStatuses);
      } catch (e: any) {
          alert("Refund Error: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  // HELPER: Transactional Refund Logic
  const processRefundTransaction = async (order: any, reason: string) => {
      await runTransaction(db, async (transaction) => {
          // 1. Get User Data
          const userRef = doc(db, 'users', order.userId);
          const userDoc = await transaction.get(userRef);
          
          if (!userDoc.exists()) throw "User not found for refund";
          
          const currentBalance = userDoc.data().balance || 0;

          // 2. Refund Balance
          transaction.update(userRef, {
              balance: currentBalance + order.charge
          });

          // 3. Update Order
          const orderRef = doc(db, 'orders', order.id);
          transaction.update(orderRef, { 
              status: 'CANCELED_REFUNDED',
              rejectedBy: user?.email || 'admin',
              rejectedAt: serverTimestamp(),
              cancelReason: reason
          });

          // 4. Log Transaction
          const refundTxRef = doc(collection(db, 'transactions'));
          transaction.set(refundTxRef, {
            userId: order.userId,
            amount: order.charge,
            type: 'CREDIT',
            reason: `Refund: Order #${order.id} (${reason})`,
            createdAt: serverTimestamp(),
            status: 'COMPLETED'
          });
       });
  };

  if (!isAdmin) return <div className="p-10 text-center text-rose-500 font-bold">Access Denied</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ListOrdered className="text-brand-600" /> Order Management
            </h2>
            
            <div className="bg-slate-100 p-1 rounded-xl flex font-bold text-xs uppercase tracking-wide">
                <button 
                    onClick={() => setActiveTab('QUEUE')}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'QUEUE' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <ListOrdered size={14} /> Queue ({activeTab === 'QUEUE' ? orders.length : '...'})
                </button>
                <button 
                    onClick={() => setActiveTab('ACTIVE')}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'ACTIVE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Activity size={14} /> Active ({activeTab === 'ACTIVE' ? orders.length : '...'})
                </button>
            </div>
        </div>

        {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="font-bold text-sm">{error}</span>
            </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[300px]">
            {orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <Check size={48} className="mx-auto mb-4 text-emerald-200" />
                    <p className="font-bold">
                        {activeTab === 'QUEUE' ? 'No new orders pending approval.' : 'No active orders running.'}
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {orders.map((order) => {
                        const apiStatus = checkedStatuses[order.id];
                        const isFailed = apiStatus && ['Canceled', 'Refunded', 'Fail'].includes(apiStatus.status);

                        return (
                            <div key={order.id} className="p-6 flex flex-col gap-4 hover:bg-slate-50 transition-colors">
                                {/* Top Row: Service Info & Price */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border tracking-wide bg-slate-100 text-slate-600 border-slate-200">
                                                ID: {order.serviceId} • {order.platform}
                                            </span>
                                            {order.providerOrderId && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border tracking-wide bg-blue-50 text-blue-600 border-blue-200">
                                                    PID: {order.providerOrderId}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-sm">{order.serviceName}</h3>
                                        <a href={order.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-1 font-mono">
                                            <LinkIcon size={12} /> {order.link}
                                        </a>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-slate-900">₹{order.charge}</p>
                                        <p className="text-xs text-slate-500 font-bold">Qty: {order.quantity}</p>
                                    </div>
                                </div>

                                {/* API STATUS CHECKER RESULT */}
                                {activeTab === 'ACTIVE' && apiStatus && (
                                    <div className={`p-3 rounded-lg border flex items-center justify-between ${isFailed ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                        <div className="text-xs">
                                            <span className="font-extrabold uppercase tracking-wide block mb-1">Provider Status</span>
                                            <span className="font-mono font-bold text-lg">{apiStatus.status}</span>
                                            <p className="opacity-80">Start: {apiStatus.start_count} | Remains: {apiStatus.remains}</p>
                                        </div>
                                        {isFailed && (
                                            <button 
                                                onClick={() => handleProviderRefund(order, apiStatus.status)}
                                                disabled={!!processingId}
                                                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                                            >
                                                <Undo2 size={14} /> Process Refund
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Bottom Row: Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                    <div className="text-xs text-slate-500">
                                        <span className="font-bold text-slate-700">{order.userEmail}</span> • {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Just now'}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* QUEUE ACTIONS */}
                                        {activeTab === 'QUEUE' && (
                                            <>
                                                <button 
                                                    onClick={() => handleReject(order)}
                                                    disabled={!!processingId}
                                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all uppercase tracking-wide flex items-center gap-2"
                                                >
                                                    <X size={14} /> Reject
                                                </button>
                                                <button 
                                                    onClick={() => handleApprove(order)}
                                                    disabled={!!processingId}
                                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-brand-600 shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-wide"
                                                >
                                                    {processingId === order.id ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>}
                                                    Approve
                                                </button>
                                            </>
                                        )}

                                        {/* ACTIVE ACTIONS */}
                                        {activeTab === 'ACTIVE' && (
                                            <button 
                                                onClick={() => handleCheckStatus(order)}
                                                disabled={!!processingId}
                                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all uppercase tracking-wide flex items-center gap-2"
                                            >
                                                {processingId === order.id ? <Loader2 className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                                                Check Status
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default AdminOrders;