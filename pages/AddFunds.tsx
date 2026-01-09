import React, { useState } from 'react';
import { QrCode, Copy, Check, ShieldCheck, AlertTriangle, History, Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { getStoredSettings } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const AddFunds: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  const settings = getStoredSettings();
  const upiId = settings.upiId || 'sandeep@okaxis'; // Default fallback

  const [amount, setAmount] = useState<string>('');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  const [history, setHistory] = useState<any[]>([]);

  // Load Transaction History
  React.useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    if (!amount || !utr) return alert("Please enter Amount and UTR/Reference No.");

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userEmail: user.email,
        amount: parseFloat(amount),
        utr: utr.trim(),
        type: 'CREDIT',
        status: 'PENDING',
        createdAt: serverTimestamp(),
        method: 'UPI_QR'
      });
      setSuccess(true);
      setAmount('');
      setUtr('');
      setTimeout(() => setSuccess(false), 5000);
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
                <div className="bg-white p-3 rounded-xl inline-block shadow-lg border-4 border-white/20">
                     <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=SocialBoost&am=${amount}`)}`}
                        alt="UPI QR" 
                        className="w-40 h-40 mix-blend-multiply"
                     />
                </div>
                
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
                   {/* Presets */}
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
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Transaction ID (UTR / Ref No.)</label>
                   <input 
                     type="text" 
                     value={utr}
                     onChange={(e) => setUtr(e.target.value)}
                     placeholder="12 Digit UTR Number"
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                     required
                   />
                   <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                      <ShieldCheck size={12} /> Verification required to update balance.
                   </p>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Verify Payment'} 
                </button>
            </form>

            {success && (
                <div className="mt-4 p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-emerald-200 p-1 rounded-full"><Check size={14} /></div>
                    <div>
                        <p className="font-bold text-sm">Request Submitted!</p>
                        <p className="text-xs opacity-80">Admin will approve funds shortly.</p>
                    </div>
                </div>
            )}
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
                        <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                                    tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                                    tx.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                                    'bg-rose-100 text-rose-600'
                                }`}>
                                    {tx.status === 'COMPLETED' ? <Check size={16} strokeWidth={3} /> :
                                     tx.status === 'PENDING' ? <Loader2 size={16} className="animate-spin" /> :
                                     <AlertTriangle size={16} />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">Funds Added</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">UTR: {tx.utr}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-slate-800">+₹{tx.amount}</p>
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${
                                     tx.status === 'COMPLETED' ? 'text-emerald-600' :
                                     tx.status === 'PENDING' ? 'text-amber-500' :
                                     'text-rose-500'
                                }`}>{tx.status}</span>
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
