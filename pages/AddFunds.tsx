import React, { useState, useEffect } from 'react';
import { QrCode, Copy, Check, ShieldCheck, History, Wallet, Loader2, RefreshCw, Smartphone, AlertTriangle, Clock, RefreshCcw } from 'lucide-react';
import { fetchPublicSettings } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, getDocs, updateDoc, doc } from 'firebase/firestore';

const AddFunds: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  
  // State for Global UPI ID (Fetched from Database)
  const [upiId, setUpiId] = useState<string>('sandeep@okaxis'); 
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [amount, setAmount] = useState<string>('');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null); // For manual check button
  const [copied, setCopied] = useState(false);
  
  const [history, setHistory] = useState<any[]>([]);

  // 1. Fetch Secure UPI ID on Mount
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

  // 2. Load Transaction History (Real-time Listener)
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

  // --- FORCE CHECK FUNCTION ---
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
          } else {
              // Only alert if it's a manual click, otherwise just log
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
      // 🛡️ SECURITY CHECK: SMART UTR HANDLING
      const duplicateQuery = query(
          collection(db, 'transactions'), 
          where('utr', '==', cleanUtr)
      );
      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
          const existingDoc = duplicateSnap.docs[0];
          const existingData = existingDoc.data();

          // CASE 1: UTR is ALREADY USED (Money added) -> BLOCK IT
          if (existingData.status === 'COMPLETED') {
              alert(`⛔ SECURITY BLOCK\n\nThis UTR (${cleanUtr}) has already been used and funds were added.\n\nYou cannot use the same UTR twice.`);
              setSubmitting(false);
              return;
          }

          // CASE 2: UTR is PENDING (User made a mistake or re-submitting) -> UPDATE IT
          if (existingData.status === 'PENDING' || existingData.status === 'REJECTED') {
              // Ensure it belongs to the same user (Security against claim sniping)
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
                      status: 'PENDING', // Reset to Pending so Admin/Bot checks it again
                      createdAt: serverTimestamp() // Bump to top of list
                  });
                  
                  // 🔥 AUTO CHECK IMMEDIATELY
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

      // CASE 3: NEW UTR -> CREATE IT
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userName: user.displayName || 'User', // 🟢 Added Username
        userEmail: user.email,
        amount: numAmount,
        utr: cleanUtr,
        type: 'CREDIT',
        status: 'PENDING',
        createdAt: serverTimestamp(),
        method: 'UPI_QR'
      });
      
      // 🔥 AUTO CHECK IMMEDIATELY (Fixes the "SMS arrived before User" race condition)
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
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center shadow-lg shadow-brand-100">
           <Wallet className="text-brand-600" size={40} />
        </div>
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Login Required</h2>
           <p className="text-slate-500 mt-2 max-w-md">You need to sign in to create your personal wallet and manage funds securely.</p>
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
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Payment Form */}
      <div className="space-y-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
               <Wallet className="text-brand-600" /> Add Funds
            </h2>
            <p className="text-slate-500 font-medium mt-1">Scan QR, Pay, and enter UTR to update balance.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
            {/* QR Section */}
            <div className="bg-slate-900 rounded-xl p-6 text-center text-white mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                <h3 className="font-bold mb-4 uppercase tracking-wider text-xs text-slate-400">Scan to Pay via UPI</h3>
                
                {loadingSettings ? (
                     <div className="w-40 h-40 mx-auto flex items-center justify-center">
                         <Loader2 className="animate-spin text-white" />
                     </div>
                ) : (
                    <div className="bg-white p-3 rounded-xl inline-block shadow-lg border-4 border-white/20">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=SocialBoost&am=${amount}`)}`}
                            alt="UPI QR" 
                            className="w-40 h-40 mix-blend-multiply"
                        />
                    </div>
                )}
                
                <div className="mt-6 flex items-center justify-between bg-white/10 rounded-lg p-3 backdrop-blur-md border border-white/10">
                    <span className="font-mono text-sm">{upiId}</span>
                    <button onClick={handleCopyUpi} className="p-1.5 hover:bg-white/20 rounded-md transition-colors">
                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Amount (INR)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount (e.g. 500)"
                        className="w-full pl-10 p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                        min="10"
                        required
                      />
                   </div>
                   <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {[100, 200, 500, 1000, 2000].map(val => (
                          <button 
                             key={val} 
                             type="button"
                             onClick={() => setAmount(val.toString())}
                             className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                          >
                             ₹{val}
                          </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Transaction ID (UTR)</label>
                   <input 
                     type="text" 
                     value={utr}
                     onChange={(e) => setUtr(e.target.value)}
                     placeholder="12 Digit UTR Number"
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                     required
                   />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Verify Payment'} 
                </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
               <div className="flex items-start gap-3 opacity-60">
                   <Smartphone className="text-slate-400 mt-0.5" size={16} />
                   <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                      <span className="font-bold">Auto-Verify System:</span> We scan for the Bank SMS. If the SMS arrived *before* you submitted, your balance updates instantly. Otherwise, it updates when the SMS arrives.
                   </p>
               </div>
            </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-6">
         <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <History size={20} className="text-slate-400" /> History
             </h2>
             <div className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
                Wallet: ₹{user.balance.toFixed(2)}
             </div>
         </div>

         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
            {history.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center h-full text-slate-400">
                    <History size={48} className="opacity-20 mb-4" />
                    <p className="text-sm font-medium">No transactions yet.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {history.map((tx) => (
                        <div key={tx.id} className="p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm shrink-0 ${
                                        tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                                        tx.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                                        'bg-rose-100 text-rose-600'
                                    }`}>
                                        {tx.status === 'COMPLETED' ? <Check size={16} strokeWidth={3} /> :
                                        tx.status === 'PENDING' ? <Clock size={16} className="animate-pulse" /> :
                                        <AlertTriangle size={16} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">
                                            {tx.status === 'PENDING' ? 'Processing Funds...' : 'Funds Added'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">UTR: {tx.utr}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                                        </p>
                                        
                                        {/* Informational text for Pending */}
                                        {tx.status === 'PENDING' && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded inline-block">
                                                    Waiting for Bank SMS...
                                                </p>
                                                {/* Manual Check Button */}
                                                <button 
                                                    onClick={() => checkPaymentStatus(tx.id, tx.utr, tx.amount)}
                                                    disabled={verifyingId === tx.id}
                                                    className="flex items-center gap-1 bg-white border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
                                                >
                                                    {verifyingId === tx.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
                                                    Check Now
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-800">+₹{tx.amount}</p>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide block ${
                                        tx.status === 'COMPLETED' ? 'text-emerald-600' :
                                        tx.status === 'PENDING' ? 'text-amber-500' :
                                        'text-rose-500'
                                    }`}>{tx.status}</span>
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