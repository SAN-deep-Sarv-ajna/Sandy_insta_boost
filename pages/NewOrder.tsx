
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_SERVICES, APP_CONFIG } from '../constants';
import { Platform, Service } from '../types';
import { TrendingUp, Info, Copy, Check, RefreshCw, Server, DollarSign, ExternalLink, Settings, AlertTriangle, HelpCircle, XCircle, ShieldCheck, Tag, MessageCircle, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { fetchProviderServices, placeProviderOrder, getStoredSettings, isAdminUnlocked } from '../services/smmProvider';
import { Link, useSearchParams } from 'react-router-dom';

const NewOrder: React.FC = () => {
  // Services State
  const [catalogServices, setCatalogServices] = useState<Service[]>(MOCK_SERVICES); // The Public List
  const [liveServices, setLiveServices] = useState<Service[]>([]); // The Admin/API List
  const [displayedServices, setDisplayedServices] = useState<Service[]>(MOCK_SERVICES); // What is currently shown
  
  const [isLiveConnection, setIsLiveConnection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
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
    
    // Default Behavior:
    // If Admin -> Try to load Live Data, set view to Admin.
    // If Client -> Set view to Client, use Mock Data.
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
        setIsLiveConnection(true);
        // If we are currently in Admin mode, update the display immediately
        if (viewMode === 'ADMIN') {
            setDisplayedServices(data);
        }
      }
    } catch (e: any) {
      console.error("Failed to load services", e);
      // Fallback to client mode if API fails
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

  // 🟢 CLIENT MODE: Send to WhatsApp
  const handleWhatsAppOrder = () => {
    if (!currentService || !quantity || !link) return alert("Please fill all fields.");
    
    const message = `
*NEW ORDER REQUEST* 🚀
------------------
*Service:* ${currentService.name} (ID: ${currentService.id})
*Link:* ${link}
*Quantity:* ${quantity}
*Price Quote:* ${formatINR(charge)}
------------------
Please confirm and share payment QR.
    `.trim();
    
    const url = `https://wa.me/${APP_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // 🔴 ADMIN MODE: Direct API Order
  const handleAdminOrder = async () => {
    if (!currentService) return alert("Select service");
    if (!quantity) return alert("Enter quantity");
    if (!link) return alert("Enter link");

    if (viewMode === 'CLIENT') {
        return alert("⚠️ You are in Client View (Catalog Mode).\n\nSwitch to 'Admin View' to verify the real Base Rate before placing an API order.");
    }

    if (!window.confirm(`CONFIRM API ORDER?\n\nService: ${currentService.name}\n\nClient Pays: ${formatINR(charge)}\nBASE RATE: ${formatINR(providerCost)}\nTAX/FEES: ${formatINR(charge - providerCost)}\n\nProceed?`)) return;

    setPlacingOrder(true);
    setOrderResult(null);

    try {
      const result = await placeProviderOrder(currentService.id, link, quantity);
      
      if (result.order) {
        setOrderResult({ success: true, message: `SUCCESS! Order ID: ${result.order}` });
        setQuantity(0);
        setLink('');
      } else if (result.error) {
         setOrderResult({ success: false, message: `Provider Error: ${result.error}` });
      } else {
         setOrderResult({ success: false, message: `Unknown: ${JSON.stringify(result)}` });
      }
    } catch (e: any) {
      setOrderResult({ success: false, message: e.message || "Network Error" });
    } finally {
      setPlacingOrder(false);
    }
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-6">
        
        {/* ADMIN CONTROLS - COMPACT */}
        {isAdmin && (
            <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                     <div className="bg-brand-500/20 p-2 rounded-lg">
                        <ShieldCheck className="text-brand-400" size={20} />
                     </div>
                     <div>
                         <h3 className="font-bold text-sm text-white tracking-tight">Admin Mode</h3>
                         <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 uppercase tracking-wide">
                            {viewMode === 'ADMIN' ? (
                                <span className="text-brand-300 flex items-center gap-1"><Server size={10}/> Live API Source</span>
                            ) : (
                                <span className="text-amber-300 flex items-center gap-1"><Eye size={10}/> Client Catalog View</span>
                            )}
                         </p>
                     </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:block">
                        {viewMode === 'ADMIN' ? 'Admin View' : 'Client View'}
                    </span>
                    <button 
                        onClick={() => setViewMode(viewMode === 'ADMIN' ? 'CLIENT' : 'ADMIN')}
                        className={`w-12 h-7 rounded-full p-1 transition-all duration-300 flex items-center shadow-inner ${viewMode === 'ADMIN' ? 'bg-brand-600' : 'bg-slate-700'}`}
                        aria-label="Toggle View Mode"
                    >
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${viewMode === 'ADMIN' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            </div>
        )}

        {/* Client Welcome Message (Only if NOT Admin) */}
        {!isAdmin && (
            <div className="bg-white border border-brand-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
                <div className="bg-brand-50 p-2.5 rounded-full shrink-0">
                    <Info className="text-brand-600" size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-lg tracking-tight">Price Calculator</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed font-medium">
                        Select a service to calculate your exact cost. When you are ready, click <strong>"Order via WhatsApp"</strong> to send your request directly to our team for instant processing.
                    </p>
                </div>
            </div>
        )}

        <div className={`bg-white rounded-2xl shadow-sm border p-8 transition-all ${viewMode === 'ADMIN' ? 'border-brand-200 shadow-brand-50' : 'border-slate-200'}`}>
          <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
            <div className={`p-2 rounded-xl ${viewMode === 'ADMIN' ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-600"}`}>
                {viewMode === 'ADMIN' ? <Server size={24} /> : <TrendingUp size={24} />}
            </div>
            {viewMode === 'ADMIN' ? 'Direct Order' : 'New Order'}
          </h2>
          
          <div className="space-y-8">
            
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Select Platform</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.values(Platform).filter(p => p !== 'Other').map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setSelectedPlatform(platform)}
                    className={`
                      py-3.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200
                      ${selectedPlatform === platform 
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 shadow-sm' 
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                    `}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Choose Service</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                className="w-full rounded-xl border-slate-200 border-2 p-4 text-slate-900 font-semibold bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all cursor-pointer appearance-none text-sm"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
              >
                {availableServices.length === 0 && <option value="0">No services found for {selectedPlatform}</option>}
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id} className="text-slate-900 font-medium py-2">
                    {service.id} - {service.name} - {formatINR(service.rate)}
                  </option>
                ))}
              </select>
            </div>

            {/* Link Input */}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Target Link</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="w-full rounded-xl border-slate-200 border p-4 font-semibold text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-sm"
              />
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">Quantity</label>
              <div className="relative">
                  <input
                    type="number"
                    min={currentService?.min}
                    max={currentService?.max}
                    value={quantity || ''}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    placeholder={`Min: ${currentService?.min || 0} - Max: ${currentService?.max || 0}`}
                    className="w-full rounded-xl border-slate-200 border p-4 font-mono font-bold text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono">
                      {currentService?.min || 0} - {currentService?.max || 0}
                  </div>
              </div>
            </div>

            {/* Quote Display */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-50 rounded-full blur-2xl opacity-50"></div>
                
                <span className="text-slate-500 text-xs font-extrabold uppercase tracking-widest relative z-10">Total Estimated Cost</span>
                <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter relative z-10 flex items-baseline gap-1">
                    {formatINR(charge)}
                    <span className="text-sm font-bold text-slate-400 ml-2 tracking-normal">INR</span>
                </p>
                
                {/* INVOICE BREAKDOWN - ONLY VISIBLE IN ADMIN MODE */}
                {viewMode === 'ADMIN' && currentService && (
                    <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 relative z-10">
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Base Rate</span>
                            <p className="text-slate-600 font-mono font-bold text-lg mt-1 tracking-tight">{formatINR(providerCost)}</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">GST & Taxes</span>
                            <p className="text-emerald-600 font-mono font-bold text-lg mt-1 tracking-tight">+{formatINR(charge - providerCost)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!quantity || quantity <= 0}
                  className="flex-1 flex justify-center items-center gap-2 font-bold py-4 px-6 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all active:scale-[0.98] uppercase tracking-wide text-xs"
                >
                  {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy Quote'}
                </button>

                {isAdmin ? (
                    /* ADMIN BUTTON: Logic changes based on View Mode */
                    <button
                    type="button"
                    onClick={handleAdminOrder}
                    disabled={placingOrder}
                    className={`
                        flex-[2] flex justify-center items-center gap-3 font-bold py-4 px-6 rounded-xl shadow-lg transition-all text-white uppercase tracking-wide text-xs
                        ${viewMode === 'CLIENT' ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : (placingOrder ? 'bg-slate-700' : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.98] shadow-slate-900/20')}
                    `}
                    >
                    {viewMode === 'CLIENT' ? 'Switch to Admin View to Order' : (placingOrder ? 'Processing...' : 'BUY WITH SANDEEP BHAI')}
                    <Server size={18} />
                    </button>
                ) : (
                    /* CLIENT BUTTON: WhatsApp */
                    <button
                    type="button"
                    onClick={handleWhatsAppOrder}
                    className="flex-[2] flex justify-center items-center gap-3 font-bold py-4 px-6 rounded-xl shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:shadow-emerald-600/30 active:scale-[0.98] uppercase tracking-wide text-xs"
                    >
                    Order via WhatsApp
                    <MessageCircle size={18} />
                    </button>
                )}
            </div>

            {/* Result Message (Admin Only) */}
            {orderResult && (
              <div className={`p-5 rounded-xl text-sm font-medium flex items-center gap-3 border ${orderResult.success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                 <div className={`p-2 rounded-full ${orderResult.success ? 'bg-green-200' : 'bg-red-200'}`}>
                    {orderResult.success ? <Check size={16} className="text-green-800" /> : <XCircle size={16} className="text-red-800" />}
                 </div>
                 {orderResult.message}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="lg:col-span-1 space-y-6">
        {/* Service Details Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sticky top-24">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3 tracking-tight">
            <div className="bg-brand-100 p-2 rounded-lg">
                <ShoppingBag size={20} className="text-brand-600" />
            </div>
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
              
              {viewMode === 'ADMIN' && (
                  <div className="mt-6 p-4 bg-slate-900 text-slate-300 rounded-xl text-xs space-y-2 font-mono">
                      <p className="font-bold text-white uppercase border-b border-slate-700 pb-2 mb-2 tracking-wider">Admin Debug Info</p>
                      <div className="flex justify-between">
                          <span>Service ID:</span>
                          <span className="text-white">{currentService.id}</span>
                      </div>
                      <div className="flex justify-between">
                          <span>Type:</span>
                          <span className="text-white">{currentService.type}</span>
                      </div>
                      <div className="flex justify-between">
                          <span>Category:</span>
                          <span className="text-white text-right max-w-[150px] truncate">{currentService.category}</span>
                      </div>
                  </div>
              )}
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
