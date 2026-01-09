import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Check, X, Loader2, ShieldAlert, DollarSign } from 'lucide-react';
import { isAdminUnlocked } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';

const AdminTransactions: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Security Check: Only show if Admin Logic is Unlocked locally AND (optionally) verify role in DB
  const isAdmin = isAdminUnlocked();

  useEffect(() => {
    if (!isAdmin || !db) return;

    // Listen for PENDING requests
    const q = query(
      collection(db, 'transactions'),
      where('status', '==', 'PENDING'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [isAdmin]);

  const handleApprove = async (tx: any) => {
    if (!window.confirm(`Approve ₹${tx.amount} for ${tx.userEmail}? Ensure you received the money.`)) return;
    
    setProcessingId(tx.id);
    try {
        await runTransaction(db, async (transaction) => {
            const txRef = doc(db, 'transactions', tx.id);
            const userRef = doc(db, 'users', tx.userId);
            
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists()) throw "Transaction does not exist!";
            if (txDoc.data().status !== 'PENDING') throw "Transaction already processed!";

            const userDoc = await transaction.get(userRef);
            const currentBalance = userDoc.exists() ? (userDoc.data().balance || 0) : 0;

            // 1. Update Transaction
            transaction.update(txRef, { 
                status: 'COMPLETED',
                approvedBy: user?.email || 'admin',
                approvedAt: serverTimestamp() 
            });

            // 2. Update User Balance (Atomic Increment logic)
            transaction.set(userRef, { 
                balance: currentBalance + tx.amount 
            }, { merge: true });
        });
        alert("Funds Added Successfully!");
    } catch (e: any) {
        alert("Failed: " + e.message);
    } finally {
        setProcessingId(null);
    }
  };

  const handleReject = async (tx: any) => {
      if(!window.confirm("Reject this transaction?")) return;
      setProcessingId(tx.id);
      try {
          // Just update status to REJECTED
          await runTransaction(db, async (transaction) => {
             const txRef = doc(db, 'transactions', tx.id);
             transaction.update(txRef, { 
                 status: 'REJECTED',
                 rejectedBy: user?.email || 'admin',
                 rejectedAt: serverTimestamp()
             });
          });
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  if (!isAdmin) return <div className="p-10 text-center text-rose-500 font-bold">Access Denied</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-rose-500" /> Funds Approvals
            </h2>
            <div className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                {requests.length} Pending
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {requests.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <Check size={48} className="mx-auto mb-4 text-emerald-200" />
                    <p className="font-bold">All caught up! No pending requests.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {requests.map((tx) => (
                        <div key={tx.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-slate-900 text-lg">₹{tx.amount}</span>
                                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200">
                                        UTR: {tx.utr}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium">
                                    User: <span className="text-slate-800">{tx.userEmail}</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleReject(tx)}
                                    disabled={!!processingId}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all uppercase tracking-wide"
                                >
                                    Reject
                                </button>
                                <button 
                                    onClick={() => handleApprove(tx)}
                                    disabled={!!processingId}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-wide"
                                >
                                    {processingId === tx.id ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>}
                                    Approve Funds
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

export default AdminTransactions;
