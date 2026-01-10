import React, { useState, useEffect } from 'react';
import { QrCode, Copy, Check, ShieldCheck, History, Wallet, Loader2, RefreshCw, Smartphone, AlertTriangle, Clock, RefreshCcw, ArrowRight } from 'lucide-react';
import { fetchPublicSettings } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, getDocs, updateDoc, doc } from 'firebase/firestore';

const AddFunds: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  
  const [upiId, setUpiId] = useState<string>('sandeep@okaxis'); 
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [amount, setAmount] = useState<string>('');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
      const getSettings = async () => {
          const settings = await fetchPublicSettings();
          if (settings && settings.upiId) {
              setUpiId(settings.upiId);
          }
          setLoadingSettings(false);
      };
      getSettings();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const q = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [user]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkPaymentStatus = async (txId: string, utr: string, amount: number) => {
      setVerifyingId(txId);
      try {
          const response = await fetch('/api/verify_payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user?.uid, utr, amount })
          });
          
          const data = await response.json();
          
          if (data.success) {
              alert("✅ Success: Funds have been added to your wallet!");
          } else if (data.rejected) {
              alert(data.message);
          } else {
              if (txId !== 'AUTO') alert(`ℹ️ Status: ${data.message}`);
          }
      } catch (e) {
          console.error("Verification failed", e);
          if (txId !== 'AUTO') alert("Connection error. Try again.");
      } finally {
          setVerifyingId(null);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    if (!amount || !utr) return alert("Please enter Amount and UTR/Reference No.");

    setSubmitting(true);
    const cleanUtr = utr.trim();
    const numAmount = parseFloat(amount);

    try {
      const duplicateQuery = query(
          collection(db, 'transactions'), 
          where('utr', '==', cleanUtr)
      );
      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
          const existingDoc = duplicateSnap.docs[0];
          const existingData = existingDoc.data();

          if (existingData.status === 'COMPLETED') {
              alert(`⛔ SECURITY BLOCK\n\nThis UTR (${cleanUtr}) has already been used and funds were added.\n\nYou cannot use the same UTR twice.`);
              setSubmitting(false);
              return;
          }

          if (existingData.status === 'PENDING' || existingData.status === 'REJECTED') {
              if (existingData.userId !== user.uid) {
                  alert("⚠️ This UTR is currently being processed by another user. Contact support.");
                  setSubmitting(false);
                  return;
              }

              const confirmUpdate = window.confirm(
                  `Existing Request Found!\n\nStatus: ${existingData.status}\nOld Amount: ₹${existingData.amount}\n\nDo you want to UPDATE it to ₹${numAmount}?`
              );

              if (confirmUpdate) {
                  await updateDoc(doc(db, 'transactions', existingDoc.id), {
                      amount: numAmount,
                      status: 'PENDING',
                      createdAt: serverTimestamp()
                  });
                  
                  checkPaymentStatus('AUTO', cleanUtr, numAmount);
                  
                  alert(`Request Updated & Checked!\n\nIf funds are not added instantly, wait for 1-2 minutes and click 'Check Status' in history.`);
                  setAmount('');
                  setUtr('');
                  setSubmitting(false);
                  return;
              } else {
                  setSubmitting(false);
                  return;
              }
          }
      }

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userName: user.displayName || 'User',
        userEmail: user.email,
        amount: numAmount,
        utr: cleanUtr,
        type: 'CREDIT',
        status: 'PENDING',
        createdAt: serverTimestamp(),
        method: 'UPI_QR'
      });
      
      checkPaymentStatus('AUTO', cleanUtr, numAmount);
      
      setAmount('');
      setUtr('');
      
      alert(`Request Submitted!\n\nWe are checking our bank records.\nIf your payment was successful, your wallet will update shortly.`);
      
    } catch (e: any) {
      alert("Error submitting transaction: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center shadow-sm border border-brand-100">
           <Wallet className="text-brand-600" size={40} />
        </div>
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Login Required</h2>
           <p className="text-slate-500 mt-2 max-w-md font-medium">You need to sign in to create your personal wallet and manage funds securely.</p>
        </div>
        <button 
          onClick={signInWithGoogle}
          className="flex items-center gap-3 bg-white border border-slate-200 px-8 py-4 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Payment Form */}
      <div className="space-y-8">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
               Add Funds
            </h2>
            <p className="text-slate-500 font-medium mt-1">Scan QR, Pay, and enter UTR to update balance.</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60">
            {/* Payment Card / QR Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-center text-white mb-8 relative overflow-hidden group shadow-lg">
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -ml-8 -mb-8 pointer-events-none"></div>
                
                <h3 className="font-bold mb-6 uppercase tracking-widest text-[10px] text-slate-400">Scan to Pay via UPI</h3>
                
                {loadingSettings ? (
                     <div className="w-48 h-48 mx-auto flex items-center justify-center border-4 border-white/10 rounded-2xl bg-white/5">
                         <Loader2 className="animate-spin text-white" />
                     </div>
                ) : (
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl shadow-black/20 relative z-10">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=SocialBoost&am=${amount}`)}`}
                            alt="UPI QR" 
                            className="w-40 h-40 mix-blend-multiply"
                        />
                    </div>
                )}
                
                <div className="mt-8 flex items-center justify-center gap-3">
                    <div className="bg-white/10 rounded-lg px-4 py-2 backdrop-blur-md border border-white/10 flex items-center gap-3 max-w-full overflow-hidden">
                        <span className="font-mono text-sm tracking-wide truncate">{upiId}</span>
                        <div className="h-4 w-px bg-white/20 shrink-0"></div>
                        <button onClick={handleCopyUpi} className="hover:text-emerald-400 transition-colors shrink-0">
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                   <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Amount (INR)</label>
                   <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-brand-600 transition-colors">₹</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount (e.g. 500)"
                        className="w-full pl-10 p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-lg placeholder:text-slate-300 placeholder:font-normal"
                        min="10"
                        required
                      />
                   </div>
                   <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                      {[100, 200, 500, 1000, 2000].map(val => (
                          <button 
                             key={val} 
                             type="button"
                             onClick={() => setAmount(val.toString())}
                             className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                          >
                             ₹{val}
                          </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Transaction ID (UTR)</label>
                   <input 
                     type="text" 
                     value={utr}
                     onChange={(e) => setUtr(e.target.value)}
                     placeholder="Enter 12 Digit UTR Number"
                     className="w-full p-4 bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-900 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-300 placeholder:font-sans"
                     required
                   />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs mt-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                  {submitting ? 'Verifying...' : 'Verify Payment'} 
                </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
               <div className="flex gap-4 p-4 bg-brand-50 rounded-xl border border-brand-100">
                   <Smartphone className="text-brand-600 shrink-0" size={20} />
                   <div>
                       <h4 className="text-xs font-bold text-brand-800 uppercase tracking-wide mb-1">Instant Auto-Verify</h4>
                       <p className="text-xs text-brand-700 leading-relaxed font-medium opacity-90">
                          System scans for bank SMS automatically. Balance updates instantly upon match.
                       </p>
                   </div>
               </div>
            </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-8">
         <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <History size={20} className="text-slate-400" /> Recent History
             </h2>
             <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                <Wallet size={12} />
                ₹{user.balance.toFixed(2)}
             </div>
         </div>

         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] relative">
            {history.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <History size={24} className="opacity-40" />
                    </div>
                    <p className="text-sm font-medium">No transactions yet.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {history.map((tx) => (
                        <div key={tx.id} className="p-6 hover:bg-slate-50 transition-colors group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm shrink-0 ${
                                        tx.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                        tx.status === 'PENDING' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                        'bg-rose-50 border-rose-100 text-rose-600'
                                    }`}>
                                        {tx.status === 'COMPLETED' ? <Check size={20} strokeWidth={3} /> :
                                        tx.status === 'PENDING' ? <Clock size={20} className="animate-pulse" /> :
                                        <AlertTriangle size={20} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-sm mb-0.5">
                                            {tx.status === 'PENDING' ? 'Processing...' : 
                                             tx.status === 'REJECTED' ? 'Failed' : 'Funds Added'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded inline-block border border-slate-200 truncate max-w-[120px] sm:max-w-none">UTR: {tx.utr}</p>
                                        
                                        {/* Informational text for Pending */}
                                        {tx.status === 'PENDING' && (
                                            <div className="mt-2.5">
                                                <button 
                                                    onClick={() => checkPaymentStatus(tx.id, tx.utr, tx.amount)}
                                                    disabled={verifyingId === tx.id}
                                                    className="flex items-center gap-1.5 bg-white border border-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
                                                >
                                                    {verifyingId === tx.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                                                    Check Status
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* REJECTION REASON */}
                                        {tx.status === 'REJECTED' && tx.reason && (
                                            <p className="text-[10px] text-rose-600 mt-1 font-medium leading-tight max-w-[200px]">
                                                {tx.reason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`font-mono font-bold text-lg ${tx.status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        +{tx.amount}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default AddFunds;