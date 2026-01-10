import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_SERVICES, APP_CONFIG } from '../constants';
import { Platform, Service } from '../types';
import { TrendingUp, Info, Check, Server, XCircle, ShieldCheck, ShoppingBag, Loader2, Zap, MessageCircle, Wallet, Clock, Tag, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { fetchProviderServices, placeProviderOrder, fetchPublicSettings, fetchPrivateSettings } from '../services/smmProvider';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NewOrder: React.FC = () => {
  // Services State
  const [catalogServices, setCatalogServices] = useState<Service[]>(MOCK_SERVICES);
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [displayedServices, setDisplayedServices] = useState<Service[]>(MOCK_SERVICES);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { user, signInWithGoogle, isAdmin } = useAuth(); 
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<'ADMIN' | 'CLIENT'>('CLIENT');

  // Form State
  const [selectedPlatform, setSelectedPlatform] = useState<string>(Platform.INSTAGRAM);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  
  const [charge, setCharge] = useState(0); 
  const [providerCost, setProviderCost] = useState(0);
  
  const [orderResult, setOrderResult] = useState<{success: boolean, message: string} | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [searchParams] = useSearchParams();

  // 1. On Mount: Check Admin and Load appropriate data
  useEffect(() => {
    setIsAdminMode(isAdmin);
    if(isAdmin) {
      loadAdminData();
    } else {
      setDisplayedServices(MOCK_SERVICES);
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
        const priv = await fetchPrivateSettings();
        const pub = await fetchPublicSettings();
        
        if (priv && priv.apiKey) {
            const data = await fetchProviderServices(
                priv.apiKey, 
                priv.proxyUrl, 
                priv.useProxy, 
                pub?.exchangeRate || 1, 
                pub?.globalDiscount || 0
            );
            
            if(data.length > 0) {
                setLiveServices(data);
                setViewMode('ADMIN');
            }
        }
    } catch (e) {
        console.error("Failed to load admin services", e);
        setViewMode('CLIENT');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'ADMIN' && liveServices.length > 0) {
        setDisplayedServices(liveServices);
    } else {
        setDisplayedServices(catalogServices);
    }
    setSelectedServiceId(0);
  }, [viewMode, liveServices, catalogServices]);

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
      const finalPrice = manualDiscount > 0 ? rawPrice * (1 - manualDiscount / 100) : rawPrice;
      setCharge(finalPrice);

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

  const handlePurchase = async () => {
    if (!user) {
        alert("Please login first to place an order.");
        return signInWithGoogle();
    }
    if (!currentService) return alert("Select service");
    if (!quantity || quantity < currentService.min || quantity > currentService.max) return alert(`Quantity must be between ${currentService.min} and ${currentService.max}`);
    if (!link) return alert("Enter link");

    if (user.balance < charge) {
        return alert(`Insufficient Balance! You need ₹${formatINR(charge - user.balance)} more.`);
    }

    if (!window.confirm(`Confirm Order for ₹${formatINR(charge)}?`)) return;

    setPlacingOrder(true);
    setOrderResult(null);

    try {
        const response = await fetch('/api/place_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName,
                serviceId: currentService.id,
                serviceName: currentService.name,
                platform: currentService.platform,
                link: link,
                quantity: quantity
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Server Error');
        }

        setOrderResult({ 
            success: true, 
            message: `Order Placed Successfully! ID: ${data.orderId}` 
        });
        
        setQuantity(0);
        setLink('');

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

  const handleAdminOrder = async () => {
    if (!isAdmin) return alert("Security Alert: Access Denied.");

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
        {isAdminMode && (
            <div className="bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                     <div className="bg-brand-500/20 p-2 rounded-lg"><ShieldCheck className="text-brand-400" size={20} /></div>
                     <div>
                         <h3 className="font-bold text-sm text-white tracking-tight">Admin Mode</h3>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {viewMode === 'ADMIN' ? 'Live API View' : 'Client Catalog View'}
                         </p>
                     </div>
                </div>
                <button 
                    onClick={() => setViewMode(viewMode === 'ADMIN' ? 'CLIENT' : 'ADMIN')}
                    className={`w-12 h-7 rounded-full p-1 transition-all duration-300 flex items-center shadow-inner ring-1 ring-slate-600 ${viewMode === 'ADMIN' ? 'bg-brand-600' : 'bg-slate-700'}`}
                >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${viewMode === 'ADMIN' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
            </div>
        )}

        <div className={`bg-white rounded-2xl shadow-sm border p-5 md:p-8 transition-all ${viewMode === 'ADMIN' ? 'border-brand-200 shadow-brand-50' : 'border-slate-200/60'}`}>
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className={`p-2.5 rounded-xl ${viewMode === 'ADMIN' ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-700"}`}>
                  {viewMode === 'ADMIN' ? <Server size={22} /> : <TrendingUp size={22} />}
              </div>
              {viewMode === 'ADMIN' ? 'Admin Direct Order' : 'Create New Order'}
            </h2>
            <p className="text-slate-500 text-sm mt-2 ml-14 font-medium hidden sm:block">Select a platform and service to get started.</p>
          </div>
          
          <div className="space-y-8">
            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider pl-1">Platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.values(Platform).filter(p => p !== 'Other').map((platform) => (
                  <button 
                    key={platform} 
                    type="button" 
                    onClick={() => setSelectedPlatform(platform)} 
                    className={`
                        py-3 px-2 md:px-4 rounded-xl border text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
                        ${selectedPlatform === platform 
                            ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/20 transform scale-[1.02]' 
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-slate-50 hover:text-brand-600'}
                    `}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider pl-1">Service Type</label>
              <div className="relative group">
                  <select 
                    value={selectedServiceId} 
                    onChange={(e) => setSelectedServiceId(Number(e.target.value))} 
                    className="w-full rounded-xl border border-slate-200 p-4 pr-10 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all appearance-none text-xs md:text-sm shadow-sm cursor-pointer hover:border-slate-300"
                  >
                    {availableServices.length === 0 && <option value="0">No services found for {selectedPlatform}</option>}
                    {availableServices.map((service) => (
                      <option key={service.id} value={service.id}>
                         {service.id} - {service.name} ({formatINR(service.rate)} / 1K)
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 group-hover:text-brand-500 transition-colors">
                      <ChevronDown size={18} />
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Link Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider pl-1">Target Link</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                          <LinkIcon size={16} />
                      </div>
                      <input 
                        type="text" 
                        value={link} 
                        onChange={(e) => setLink(e.target.value)} 
                        placeholder="https://instagram.com/p/..." 
                        className="w-full rounded-xl border border-slate-200 p-3.5 pl-10 font-medium text-slate-900 bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm placeholder:text-slate-400 hover:border-slate-300" 
                      />
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider pl-1">Quantity</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                          <Tag size={16} />
                      </div>
                      <input 
                        type="number" 
                        min={currentService?.min} 
                        max={currentService?.max} 
                        value={quantity || ''} 
                        onChange={(e) => setQuantity(Number(e.target.value))} 
                        placeholder={`Min: ${currentService?.min || 0} - Max: ${currentService?.max || 0}`} 
                        className="w-full rounded-xl border border-slate-200 p-3.5 pl-10 font-mono font-medium text-slate-900 bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm placeholder:text-slate-400 hover:border-slate-300" 
                      />
                  </div>
                </div>
            </div>

            {/* Quote Display */}
            <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 block">Total Amount</span>
                        <p className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight flex items-baseline gap-1.5">
                            {formatINR(charge)} <span className="text-lg font-medium text-slate-500 ml-1">INR</span>
                        </p>
                    </div>
                    {viewMode === 'CLIENT' && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 w-fit">
                            <Clock size={12} />
                            Estimated start: Instant - 1hr
                        </div>
                    )}
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {viewMode === 'ADMIN' ? (
                    <button type="button" onClick={handleAdminOrder} disabled={placingOrder} className="flex-[2] flex justify-center items-center gap-3 font-bold py-4 px-6 rounded-xl shadow-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all uppercase tracking-wide text-xs">
                       {placingOrder ? <Loader2 className="animate-spin" /> : <Server size={18} />} {placingOrder ? 'Processing...' : 'Force Order (API)'}
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={handlePurchase}
                            disabled={placingOrder || !user}
                            className={`flex-[2] flex justify-center items-center gap-2.5 font-bold py-4 px-6 rounded-xl shadow-lg transition-all uppercase tracking-wide text-xs ${user && user.balance >= charge ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                        >
                            {placingOrder ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                            {placingOrder ? 'Processing...' : (user ? (user.balance >= charge ? 'Confirm & Pay' : 'Insufficient Funds') : 'Login to Pay')}
                        </button>
                        
                        <button type="button" onClick={handleWhatsAppOrder} className="flex-1 flex justify-center items-center gap-2 font-bold py-4 px-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all uppercase tracking-wide text-xs shadow-sm">
                            <MessageCircle size={18} /> WhatsApp
                        </button>
                    </>
                )}
            </div>
            
            {viewMode === 'CLIENT' && user && user.balance >= charge && (
                <p className="text-[11px] text-center text-slate-400 font-medium flex items-center justify-center gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-500"/> Secure Payment. Balance deducted automatically.
                </p>
            )}

            {/* Result Message */}
            {orderResult && (
              <div className={`p-5 rounded-xl text-sm font-medium flex items-center gap-3 border animate-in fade-in slide-in-from-top-2 ${orderResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                 {orderResult.success ? <Check size={18} className="shrink-0" /> : <XCircle size={18} className="shrink-0" />}
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
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl shadow-xl shadow-brand-600/20 p-6 text-white relative overflow-hidden ring-1 ring-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Wallet size={20} /></div>
                    <span className="font-bold uppercase tracking-widest text-[10px] opacity-80">Available Funds</span>
                </div>
                <p className="text-3xl font-mono font-bold tracking-tight mb-6 relative z-10">₹{user.balance.toFixed(2)}</p>
                <button onClick={() => navigate('/add-funds')} className="w-full bg-white text-brand-700 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wide hover:bg-brand-50 transition-colors shadow-sm relative z-10">
                    + Add Funds
                </button>
            </div>
        )}

        {/* Service Details Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 sticky top-24">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5 tracking-tight">
            <ShoppingBag size={20} className="text-slate-400" />
            Service Details
          </h3>
          {currentService ? (
            <div className="space-y-6 text-sm">
              <div className="pb-4 border-b border-slate-100">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1.5">Service Name</span>
                <span className="font-semibold text-slate-900 text-sm leading-snug">{currentService.name}</span>
              </div>
              <div className="pb-4 border-b border-slate-100">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1.5">Price per 1000</span>
                <span className="font-bold text-brand-600 text-xl tracking-tight bg-brand-50 inline-block px-2 py-0.5 rounded border border-brand-100">{formatINR(currentService.rate)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-2">Description</span>
                <div className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-medium">
                  {currentService.description || 'No description available'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-center py-12 flex flex-col items-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Info size={32} className="mb-3 opacity-30" />
                <p className="font-medium text-xs">Select a service to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewOrder;