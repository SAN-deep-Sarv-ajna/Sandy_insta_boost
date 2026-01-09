import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_SERVICES, APP_CONFIG } from '../constants';
import { Platform, Service } from '../types';
import { TrendingUp, Info, Copy, Check, Server, DollarSign, XCircle, ShieldCheck, ShoppingBag, Loader2, Zap, AlertTriangle, MessageCircle, Wallet } from 'lucide-react';
import { fetchProviderServices, placeProviderOrder, getStoredSettings, isAdminUnlocked } from '../services/smmProvider';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const NewOrder: React.FC = () => {
  // Services State
  const [catalogServices, setCatalogServices] = useState<Service[]>(MOCK_SERVICES); // The Public List
  const [liveServices, setLiveServices] = useState<Service[]>([]); // The Admin/API List
  const [displayedServices, setDisplayedServices] = useState<Service[]>(MOCK_SERVICES); // What is currently shown
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  // Toggle for Admin to see what clients see
  const [viewMode, setViewMode] = useState<'ADMIN' | 'CLIENT'>('CLIENT');

  // Form State
  const [selectedPlatform, setSelectedPlatform] = useState<string>(Platform.INSTAGRAM);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  
  // UI State
  const [charge, setCharge] = useState(0); 
  const [providerCost, setProviderCost] = useState(0);
  
  const [copied, setCopied] = useState(false);
  const [orderResult, setOrderResult] = useState<{success: boolean, message: string} | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  // URL Params
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const adminStatus = isAdminUnlocked();
    setIsAdmin(adminStatus);
    
    if(adminStatus && getStoredSettings().apiKey) {
      loadApiServices();
      setViewMode('ADMIN');
    } else {
      setViewMode('CLIENT');
      setDisplayedServices(MOCK_SERVICES);
    }
  }, []);

  // When viewMode changes, swap the dataset
  useEffect(() => {
    if (viewMode === 'ADMIN' && liveServices.length > 0) {
        setDisplayedServices(liveServices);
    } else {
        setDisplayedServices(catalogServices);
    }
    // Reset selection when switching modes to avoid ID conflicts
    setSelectedServiceId(0);
  }, [viewMode, liveServices, catalogServices]);

  const loadApiServices = async () => {
    setIsLoading(true);
    setOrderResult(null); 
    try {
      const data = await fetchProviderServices();
      if(data && data.length > 0) {
        setLiveServices(data);
        if (viewMode === 'ADMIN') {
            setDisplayedServices(data);
        }
      }
    } catch (e: any) {
      console.error("Failed to load services", e);
      if (viewMode === 'ADMIN') {
          setOrderResult({ success: false, message: "API Connection Failed. Switched to Offline Catalog." });
          setViewMode('CLIENT');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const sidParam = searchParams.get('serviceId');
    if (sidParam && displayedServices.length > 0) {
      const serviceId = parseInt(sidParam);
      const service = displayedServices.find(s => s.id === serviceId);
      if (service) {
        setSelectedPlatform(service.platform);
        setSelectedServiceId(serviceId);
      }
    } else if (displayedServices.length > 0 && selectedServiceId === 0) {
        const first = displayedServices.find(s => s.platform === Platform.INSTAGRAM);
        if (first) setSelectedServiceId(first.id);
    }
  }, [searchParams, displayedServices]);

  const availableServices = useMemo(() => {
    return displayedServices.filter(s => s.platform === selectedPlatform);
  }, [selectedPlatform, displayedServices]);

  useEffect(() => {
    if (availableServices.length > 0) {
        const currentServiceExists = availableServices.find(s => s.id === selectedServiceId);
        if (!currentServiceExists) {
             setSelectedServiceId(availableServices[0].id);
        }
    } else {
       if (selectedServiceId !== 0) setSelectedServiceId(0);
    }
  }, [selectedPlatform, availableServices]);

  const currentService = useMemo(() => {
    return displayedServices.find(s => s.id === selectedServiceId);
  }, [selectedServiceId, displayedServices]);

  useEffect(() => {
    if (currentService && quantity) {
      const rawPrice = (quantity / 1000) * currentService.rate;
      
      const finalPrice = manualDiscount > 0 
         ? rawPrice * (1 - manualDiscount / 100)
         : rawPrice;
      
      setCharge(finalPrice);

      // Provider Cost (Only exists in Live Data / Admin Mode)
      if (currentService.originalRate) {
        const standardCost = (quantity / 1000) * currentService.originalRate;
        setProviderCost(standardCost);
      } else {
        setProviderCost(0);
      }
    } else {
      setCharge(0);
      setProviderCost(0);
    }
  }, [quantity, currentService, manualDiscount]);

  const handleCopy = () => {
    if (!currentService || !quantity) return;
    const text = `SERVICE: ${currentService.name}\nLINK: ${link || 'N/A'}\nQUANTITY: ${quantity}\nPRICE: ${formatINR(charge)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CLIENT WALLET PURCHASE LOGIC
  const handlePurchase = async () => {
    if (!user) {
        alert("Please login first to place an order.");
        return signInWithGoogle();
    }
    if (!currentService) return alert("Select service");
    if (!quantity || quantity < currentService.min || quantity > currentService.max) return alert(`Quantity must be between ${currentService.min} and ${currentService.max}`);
    if (!link) return alert("Enter link");
    if (!db) return alert("Database error.");

    // 1. Balance Check (Client Side Pre-Check)
    if (user.balance < charge) {
        return alert(`Insufficient Balance! You need ₹${formatINR(charge - user.balance)} more.\nPlease go to 'Add Funds'.`);
    }

    if (!window.confirm(`Confirm Order for ₹${formatINR(charge)}?`)) return;

    setPlacingOrder(true);
    setOrderResult(null);

    try {
        // 2. FIRESTORE TRANSACTION (Deduct Money)
        let providerOrderId = null;
        let errorMsg = "";

        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await transaction.get(userRef);
            
            if (!userDoc.exists()) throw "User does not exist!";
            
            const currentBalance = userDoc.data().balance || 0;
            
            if (currentBalance < charge) {
                throw "Insufficient funds during transaction.";
            }

            // Deduct
            const newBalance = currentBalance - charge;
            transaction.update(userRef, { balance: newBalance });

            // 3. CALL SMM API (Inside transaction logic flow, but actually executed after if success, 
            // generally we do it optimistic or with cloud functions. 
            // Here we do it client side for this architecture)
        });

        // 4. PLACE ACTUAL ORDER (If deduction success)
        try {
            const result = await placeProviderOrder(currentService.id, link, quantity);
            
            if (result.order) {
                providerOrderId = result.order;
            } else if (result.error) {
                errorMsg = result.error;
                throw new Error(result.error);
            } else {
                throw new Error("Unknown Provider Error");
            }
        } catch (apiError: any) {
            // 5. ROLLBACK (REFUND) IF API FAILS
            console.error("API Failed, Refunding...", apiError);
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await transaction.get(userRef);
                const currentBalance = userDoc.data().balance || 0;
                transaction.update(userRef, { balance: currentBalance + charge });
            });
            throw new Error(`Order Failed: ${apiError.message || "Provider Error"}. Money Refunded.`);
        }

        // 6. RECORD HISTORY (If Success)
        if (providerOrderId) {
            await addDoc(collection(db, 'orders'), {
                userId: user.uid,
                serviceId: currentService.id,
                serviceName: currentService.name,
                link: link,
                quantity: quantity,
                charge: charge,
                providerOrderId: providerOrderId,
                status: 'PENDING',
                createdAt: serverTimestamp()
            });
            
            // Transaction Log
            await addDoc(collection(db, 'transactions'), {
                userId: user.uid,
                amount: charge,
                type: 'DEBIT',
                reason: `Order #${providerOrderId}`,
                createdAt: serverTimestamp(),
                status: 'COMPLETED'
            });

            setOrderResult({ success: true, message: `Order Placed Successfully! ID: ${providerOrderId}` });
            setQuantity(0);
            setLink('');
        }

    } catch (e: any) {
        setOrderResult({ success: false, message: e.message || "Transaction Failed" });
    } finally {
        setPlacingOrder(false);
    }
  };

  const handleWhatsAppOrder = () => {
    if (!currentService || !quantity || !link) return alert("Please fill all fields.");
    const message = `*NEW ORDER REQUEST* 🚀\n------------------\n*Service:* ${currentService.name} (ID: ${currentService.id})\n*Link:* ${link}\n*Quantity:* ${quantity}\n*Price Quote:* ${formatINR(charge)}\n------------------\nPlease confirm and share payment QR.`;
    const url = `https://wa.me/${APP_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // ADMIN OVERRIDE ORDER (Bypasses wallet)
  const handleAdminOrder = async () => {
    if (!currentService || !quantity || !link) return alert("Fill all fields");
    if (!window.confirm("Place Direct API Order (Bypass Wallet)?")) return;
    setPlacingOrder(true);
    try {
        const res = await placeProviderOrder(currentService.id, link, quantity);
        if(res.order) setOrderResult({success: true, message: `Admin Order Placed: ${res.order}`});
        else setOrderResult({success: false, message: res.error || "Failed"});
    } catch(e:any) { setOrderResult({success: false, message: e.message}); }
    setPlacingOrder(false);
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-6">
        
        {/* ADMIN CONTROLS */}
        {isAdmin && (
            <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                     <div className="bg-brand-500/20 p-2 rounded-lg"><ShieldCheck className="text-brand-400" size={20} /></div>
                     <div>
                         <h3 className="font-bold text-sm text-white tracking-tight">Admin Mode</h3>
                         <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                            {viewMode === 'ADMIN' ? 'Live API View' : 'Client Catalog View'}
                         </p>
                     </div>
                </div>
                <button 
                    onClick={() => setViewMode(viewMode === 'ADMIN' ? 'CLIENT' : 'ADMIN')}
                    className={`w-12 h-7 rounded-full p-1 transition-all duration-300 flex items-center shadow-inner ${viewMode === 'ADMIN' ? 'bg-brand-600' : 'bg-slate-700'}`}
                >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${viewMode === 'ADMIN' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
            </div>
        )}

        <div className={`bg-white rounded-2xl shadow-sm border p-8 transition-all ${viewMode === 'ADMIN' ? 'border-brand-200 shadow-brand-50' : 'border-slate-200'}`}>
          <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
            <div className={`p-2 rounded-xl ${viewMode === 'ADMIN' ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-600"}`}>
                {viewMode === 'ADMIN' ? <Server size={24} /> : <TrendingUp size={24} />}
            </div>
            {viewMode === 'ADMIN' ? 'Admin Direct Order' : 'Place Order'}
          </h2>
          
          <div className="space-y-8">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Select Platform</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.values(Platform).filter(p => p !== 'Other').map((platform) => (
                  <button key={platform} type="button" onClick={() => setSelectedPlatform(platform)} className={`py-3.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 ${selectedPlatform === platform ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>{platform}</button>
                ))}
              </div>
            </div>

            {/* Service Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Choose Service</label>
              <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(Number(e.target.value))} className="w-full rounded-xl border-slate-200 border-2 p-4 text-slate-900 font-semibold bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all cursor-pointer appearance-none text-sm">
                {availableServices.length === 0 && <option value="0">No services found for {selectedPlatform}</option>}
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>{service.id} - {service.name} - {formatINR(service.rate)}</option>
                ))}
              </select>
            </div>

            {/* Inputs */}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Target Link</label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://instagram.com/p/..." className="w-full rounded-xl border-slate-200 border p-4 font-semibold text-slate-900 bg-slate-50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Quantity</label>
              <div className="relative">
                  <input type="number" min={currentService?.min} max={currentService?.max} value={quantity || ''} onChange={(e) => setQuantity(Number(e.target.value))} placeholder={`Min: ${currentService?.min || 0} - Max: ${currentService?.max || 0}`} className="w-full rounded-xl border-slate-200 border p-4 font-mono font-bold text-slate-900 bg-slate-50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all" />
              </div>
            </div>

            {/* Quote Display */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <span className="text-slate-500 text-xs font-extrabold uppercase tracking-widest relative z-10">Total Cost</span>
                <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter relative z-10 flex items-baseline gap-1">
                    {formatINR(charge)} <span className="text-sm font-bold text-slate-400 ml-2 tracking-normal">INR</span>
                </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {viewMode === 'ADMIN' ? (
                    <button type="button" onClick={handleAdminOrder} disabled={placingOrder} className="flex-[2] flex justify-center items-center gap-3 font-bold py-4 px-6 rounded-xl shadow-lg bg-slate-900 text-white hover:bg-slate-800 transition-all uppercase tracking-wide text-xs">
                       {placingOrder ? <Loader2 className="animate-spin" /> : <Server size={18} />} {placingOrder ? 'Processing...' : 'Admin API Force'}
                    </button>
                ) : (
                    <>
                        {/* WALLET PAY BUTTON */}
                        <button
                            type="button"
                            onClick={handlePurchase}
                            disabled={placingOrder || !user}
                            className={`flex-[2] flex justify-center items-center gap-3 font-bold py-4 px-6 rounded-xl shadow-lg transition-all uppercase tracking-wide text-xs ${user && user.balance >= charge ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            {placingOrder ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
                            {placingOrder ? 'Processing...' : (user ? (user.balance >= charge ? 'Pay with Wallet' : 'Insufficient Funds') : 'Login to Pay')}
                        </button>
                        
                        {/* WHATSAPP FALLBACK */}
                        <button type="button" onClick={handleWhatsAppOrder} className="flex-1 flex justify-center items-center gap-2 font-bold py-4 px-6 rounded-xl border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-all uppercase tracking-wide text-xs">
                            <MessageCircle size={18} /> WhatsApp
                        </button>
                    </>
                )}
            </div>

            {/* Result Message */}
            {orderResult && (
              <div className={`p-5 rounded-xl text-sm font-medium flex items-center gap-3 border ${orderResult.success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                 {orderResult.success ? <Check size={16} /> : <XCircle size={16} />}
                 {orderResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Info */}
      <div className="lg:col-span-1 space-y-6">
        {/* Wallet Card */}
        {user && (
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20} /></div>
                    <span className="font-bold uppercase tracking-widest text-xs opacity-80">Your Wallet</span>
                </div>
                <p className="text-3xl font-mono font-bold tracking-tight mb-6">₹{user.balance.toFixed(2)}</p>
                <button onClick={() => navigate('/add-funds')} className="w-full bg-white text-brand-700 font-bold py-3 rounded-xl text-xs uppercase tracking-wide hover:bg-brand-50 transition-colors shadow-sm">
                    + Add Funds
                </button>
            </div>
        )}

        {/* Service Details Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sticky top-24">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3 tracking-tight">
            <div className="bg-brand-100 p-2 rounded-lg"><ShoppingBag size={20} className="text-brand-600" /></div>
            Service Info
          </h3>
          {currentService ? (
            <div className="space-y-6 text-sm">
              <div className="pb-4 border-b border-slate-100">
                <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest block mb-2">Service Name</span>
                <span className="font-semibold text-slate-800 text-sm leading-snug">{currentService.name}</span>
              </div>
              <div className="pb-4 border-b border-slate-100">
                <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest block mb-2">Price per 1000</span>
                <span className="font-black text-brand-600 text-2xl tracking-tighter">{formatINR(currentService.rate)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest block mb-2">Description</span>
                <div className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-medium">
                  {currentService.description || 'No description available'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-center py-10 flex flex-col items-center">
                <Info size={48} className="mb-4 opacity-20" />
                <p className="font-medium text-sm">Select a service to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewOrder;