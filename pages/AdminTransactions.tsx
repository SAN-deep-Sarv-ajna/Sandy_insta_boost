import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp, getDocs } from 'firebase/firestore';
import { Check, X, Loader2, ShieldAlert, DollarSign, AlertCircle, Calendar, TrendingUp, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminTransactions: React.FC = () => {
  const { user, isAdmin } = useAuth(); // Use isAdmin from Context
  const [requests, setRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!isAdmin || !db) return;

    // Filter based on active tab
    // Note: We sort client-side to avoid needing complex Firestore indexes immediately
    const targetStatus = activeTab === 'PENDING' ? 'PENDING' : 'COMPLETED';
    
    const q = query(
      collection(db, 'transactions'),
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

      setRequests(data);
      
      // Calculate Total Revenue for History Tab
      if (activeTab === 'HISTORY') {
          const total = data.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
          setTotalRevenue(total);
      }
      
      setError(null);
    }, (err) => {
      console.error("Firestore Error:", err);
      setError("Permission Denied or Index Missing. Check Console.");
    });

    return () => unsub();
  }, [isAdmin, activeTab]);

  const handleApprove = async (tx: any) => {
    if (!window.confirm(`Approve ₹${tx.amount} for ${tx.userEmail}? Ensure you received the money.`)) return;
    
    setProcessingId(tx.id);
    try {
        // 🛡️ SECURITY: MANUAL APPROVAL GUARD
        // Before running the transaction, ensure this UTR isn't already used elsewhere
        const duplicateCheck = await getDocs(query(
            collection(db, 'transactions'),
            where('utr', '==', tx.utr),
            where('status', '==', 'COMPLETED')
        ));

        if (!duplicateCheck.empty) {
            alert(`⛔ SECURITY BLOCK\n\nUTR ${tx.utr} is ALREADY used in a Completed transaction.\n\nDo not approve this.`);
            setProcessingId(null);
            return;
        }

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
        {/* HEADER & TABS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-brand-600" /> Funds Manager
            </h2>
            
            <div className="bg-slate-100 p-1 rounded-xl flex font-bold text-xs uppercase tracking-wide">
                <button 
                    onClick={() => setActiveTab('PENDING')}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'PENDING' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <ShieldAlert size={14} /> Requests {activeTab === 'PENDING' && `(${requests.length})`}
                </button>
                <button 
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={14} /> Payment History
                </button>
            </div>
        </div>
        
        {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="font-bold text-sm">{error}</span>
            </div>
        )}

        {/* REVENUE SUMMARY (History Mode Only) */}
        {activeTab === 'HISTORY' && (
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
                <div>
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Total Verified Revenue</p>
                    <p className="text-3xl font-black tracking-tight">₹{totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                    <TrendingUp size={24} className="text-white" />
                </div>
            </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {requests.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <Check size={48} className="mx-auto mb-4 text-emerald-200" />
                    <p className="font-bold">
                        {activeTab === 'PENDING' ? "No pending requests." : "No transaction history found."}
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {requests.map((tx) => (
                        <div key={tx.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-slate-900 text-lg">₹{tx.amount}</span>
                                    {tx.utr && (
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200">
                                            UTR: {tx.utr}
                                        </span>
                                    )}
                                    {activeTab === 'HISTORY' && (
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200 uppercase tracking-wide">
                                            {tx.method || 'VERIFIED'}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1">
                                    <p className="font-bold text-slate-900 text-sm">{tx.userName || 'User'}</p>
                                    <p className="text-xs text-slate-500">{tx.userEmail}</p>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                                </p>
                            </div>
                            
                            {/* ACTION BUTTONS (Only for Pending) */}
                            {activeTab === 'PENDING' && (
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
                            )}

                            {/* HISTORY STATUS (Only for History) */}
                            {activeTab === 'HISTORY' && (
                                <div className="text-right">
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                                        <Check size={14} strokeWidth={3} />
                                        Completed
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Approved by: {tx.approvedBy || 'Auto-System'}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default AdminTransactions;