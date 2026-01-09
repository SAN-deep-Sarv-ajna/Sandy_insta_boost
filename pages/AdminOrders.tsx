import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Check, X, Loader2, ListOrdered, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { placeProviderOrder } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';

const AdminOrders: React.FC = () => {
  const { user, isAdmin } = useAuth(); // Use isAdmin from Context (which handles Email Logic)
  const [orders, setOrders] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !db) return;

    // Listen for PENDING_APPROVAL orders
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'PENDING_APPROVAL'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [isAdmin]);

  const handleApprove = async (order: any) => {
    if (!window.confirm(`Approve Order for ${order.quantity} units? This will execute the API call.`)) return;
    
    setProcessingId(order.id);
    try {
        // 1. CALL API (Real Execution)
        // Note: We use the stored API Key in the browser local storage here.
        const result = await placeProviderOrder(order.serviceId, order.link, order.quantity);

        if (result.error) {
            throw new Error(result.error);
        }

        const providerOrderId = result.order;

        // 2. Update DB
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
        alert("API Order Failed: " + e.message + "\n\nConsider rejecting and refunding if the issue persists.");
    } finally {
        setProcessingId(null);
    }
  };

  const handleReject = async (order: any) => {
      if(!window.confirm(`Reject and REFUND ₹${order.charge} to user?`)) return;
      
      setProcessingId(order.id);
      try {
          await runTransaction(db, async (transaction) => {
             // 1. Get User Data for refund
             const userRef = doc(db, 'users', order.userId);
             const userDoc = await transaction.get(userRef);
             
             if (!userDoc.exists()) throw "User not found for refund";
             
             const currentBalance = userDoc.data().balance || 0;

             // 2. Refund Balance
             transaction.update(userRef, {
                 balance: currentBalance + order.charge
             });

             // 3. Mark Order Canceled
             const orderRef = doc(db, 'orders', order.id);
             transaction.update(orderRef, { 
                 status: 'CANCELED_REFUNDED',
                 rejectedBy: user?.email || 'admin',
                 rejectedAt: serverTimestamp()
             });

             // 4. Log Transaction
             const refundTxRef = doc(collection(db, 'transactions'));
             transaction.set(refundTxRef, {
                userId: order.userId,
                amount: order.charge,
                type: 'CREDIT',
                reason: `Refund Order #${order.id}`,
                createdAt: serverTimestamp(),
                status: 'COMPLETED'
             });
          });
      } catch (e: any) {
          alert("Refund Error: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  if (!isAdmin) return <div className="p-10 text-center text-rose-500 font-bold">Access Denied</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ListOrdered className="text-brand-600" /> Order Queue
            </h2>
            <div className="bg-brand-100 text-brand-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                {orders.length} Pending
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <Check size={48} className="mx-auto mb-4 text-emerald-200" />
                    <p className="font-bold">Queue Empty. All orders processed.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {orders.map((order) => (
                        <div key={order.id} className="p-6 flex flex-col gap-4 hover:bg-slate-50 transition-colors">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border tracking-wide bg-slate-100 text-slate-600 border-slate-200 mb-2">
                                        ID: {order.serviceId} • {order.platform}
                                    </span>
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

                            {/* User Info */}
                            <div className="bg-slate-100 p-3 rounded-lg text-xs flex justify-between items-center text-slate-600">
                                <span>User: <span className="font-bold">{order.userEmail}</span></span>
                                <span>Ordered: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button 
                                    onClick={() => handleReject(order)}
                                    disabled={!!processingId}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all uppercase tracking-wide flex items-center gap-2"
                                >
                                    <X size={14} /> Reject & Refund
                                </button>
                                <button 
                                    onClick={() => handleApprove(order)}
                                    disabled={!!processingId}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-brand-600 shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-wide"
                                >
                                    {processingId === order.id ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>}
                                    Approve & Order
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default AdminOrders;