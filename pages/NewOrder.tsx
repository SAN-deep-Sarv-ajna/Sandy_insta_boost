import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_SERVICES } from '../constants';
import { Platform, Service } from '../types';
import { TrendingUp, Info, Copy, Check, RefreshCw, Server, DollarSign, ExternalLink, Settings, AlertTriangle, HelpCircle, XCircle, ShieldCheck, Tag } from 'lucide-react';
import { fetchProviderServices, placeProviderOrder, getStoredSettings } from '../services/smmProvider';
import { Link, useSearchParams } from 'react-router-dom';

const NewOrder: React.FC = () => {
  // Services State
  const [allServices, setAllServices] = useState<Service[]>(MOCK_SERVICES);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [useProxy, setUseProxy] = useState(true);
  const [globalDiscount, setGlobalDiscount] = useState(0);

  // Form State
  const [selectedPlatform, setSelectedPlatform] = useState<string>(Platform.INSTAGRAM);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  
  // UI State
  const [charge, setCharge] = useState(0); // Client Charge (Final)
  const [baseCharge, setBaseCharge] = useState(0); // Charge before manual discount
  const [providerCost, setProviderCost] = useState(0); // Standard cost
  
  const [copied, setCopied] = useState(false);
  const [orderResult, setOrderResult] = useState<{success: boolean, message: string} | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  // URL Params
  const [searchParams] = useSearchParams();

  // Check API Key on mount
  useEffect(() => {
    refreshSettings();
    if(getStoredSettings().apiKey) {
      loadApiServices();
    }
  }, []);

  const refreshSettings = () => {
      const settings = getStoredSettings();
      setHasApiKey(!!settings.apiKey);
      setUseProxy(settings.useProxy);
      setExchangeRate(settings.exchangeRate);
      setGlobalDiscount(settings.globalDiscount || 0);
  }

  // Load API Services Handler
  const loadApiServices = async () => {
    setIsLoading(true);
    setOrderResult(null); // Clear previous errors on reload
    try {
      const data = await fetchProviderServices();
      // After fetch, rate might have auto-updated in storage, so refresh our local state for the UI
      refreshSettings();
      
      if(data && data.length > 0) {
        setAllServices(data);
        setIsLive(true);
      }
    } catch (e: any) {
      console.error("Failed to load services", e);
      // Show error but don't crash
      setOrderResult({
          success: false,
          message: `Connection Failed: ${e.message || "Could not fetch services."} Check Settings.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle URL Params for deep linking
  useEffect(() => {
    const sidParam = searchParams.get('serviceId');
    if (sidParam && allServices.length > 0) {
      const serviceId = parseInt(sidParam);
      const service = allServices.find(s => s.id === serviceId);
      
      if (service) {
        setSelectedPlatform(service.platform);
        setSelectedServiceId(serviceId);
      }
    } else if (allServices.length > 0 && selectedServiceId === 0) {
        // Initial fallback if no URL param
        const first = allServices.find(s => s.platform === Platform.INSTAGRAM);
        if (first) setSelectedServiceId(first.id);
    }
  }, [searchParams, allServices]);

  // Filter services by platform
  const availableServices = useMemo(() => {
    return allServices.filter(s => s.platform === selectedPlatform);
  }, [selectedPlatform, allServices]);

  // Set default service when platform changes
  useEffect(() => {
    if (availableServices.length > 0) {
        const currentServiceExistsInNewPlatform = availableServices.find(s => s.id === selectedServiceId);
        if (!currentServiceExistsInNewPlatform) {
             setSelectedServiceId(availableServices[0].id);
        }
    } else {
       if (selectedServiceId !== 0) setSelectedServiceId(0);
    }
  }, [selectedPlatform, availableServices]);

  // Get current service object
  const currentService = useMemo(() => {
    return allServices.find(s => s.id === selectedServiceId);
  }, [selectedServiceId, allServices]);

  // Calculate charge
  useEffect(() => {
    if (currentService && quantity) {
      const rawPrice = (quantity / 1000) * currentService.rate;
      setBaseCharge(rawPrice);
      
      // Apply Manual Discount
      const finalPrice = manualDiscount > 0 
         ? rawPrice * (1 - manualDiscount / 100)
         : rawPrice;
      
      setCharge(finalPrice);

      if (currentService.originalRate) {
        const standardCost = (quantity / 1000) * currentService.originalRate;
        setProviderCost(standardCost);
      }
    } else {
      setCharge(0);
      setBaseCharge(0);
      setProviderCost(0);
    }
  }, [quantity, currentService, manualDiscount]);

  const handleCopy = () => {
    if (!currentService || !quantity) return;
    
    const text = `
SERVICE: ${currentService.name}
LINK: ${link || 'N/A'}
QUANTITY: ${quantity}
PRICE: ${formatINR(charge)} ${manualDiscount > 0 ? `(Inc. ${manualDiscount}% Off)` : ''}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlaceOrder = async () => {
    // 1. Validation Checks
    if (!currentService) {
        alert("Please select a valid service.");
        return;
    }
    if (!quantity || quantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
    }
    if (!link) {
        alert("Please enter the target link (URL).");
        return;
    }

    // 2. Environment Check
    if (!hasApiKey) {
        alert("Action Required: Please go to 'API Settings' and enter your Sandyinsta API Key first.");
        return;
    }

    if (!isLive) {
        // User has key but services failed to load (Mock Data is shown)
        alert("Connection Error: Services are not synced with the provider. Please click 'Refresh' or check your Connection Mode in Settings.");
        loadApiServices(); // Try to reconnect
        return;
    }

    // 3. Confirmation
    const confirmMsg = `
CONFIRM ORDER?

Service: ${currentService.name}
Quantity: ${quantity}
${manualDiscount > 0 ? `Discount Applied: ${manualDiscount}%` : ''}

--- CLIENT PAYS: ${formatINR(charge)} ---

Proceed?
    `.trim();

    if (!window.confirm(confirmMsg)) return;

    setPlacingOrder(true);
    setOrderResult(null);

    try {
      const result = await placeProviderOrder(currentService.id, link, quantity);
      
      if (result.order) {
        setOrderResult({ 
          success: true, 
          message: `SUCCESS! Order ID: ${result.order}` 
        });
        setQuantity(0);
        setLink('');
        setManualDiscount(0); // Reset discount
      } else if (result.error) {
         setOrderResult({ 
          success: false, 
          message: `Provider Error: ${result.error}` 
        });
      } else {
         setOrderResult({ 
          success: false, 
          message: `Unknown response: ${JSON.stringify(result)}` 
        });
      }
    } catch (e: any) {
      console.error("Order Error:", e);
      setOrderResult({ 
        success: false, 
        message: e.message || "Network Error"
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        
        {/* Source Control */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
             <Server size={20} className="text-brand-400" />
             <div>
               <p className="font-bold text-sm">Data Source: {isLive ? 'Sandyinsta API (Live)' : 'Mock Data (Simulation)'}</p>
               {isLive && <p className="text-xs text-brand-300">Connected & Ready to Order</p>}
               {!isLive && hasApiKey && <p className="text-xs text-red-300">Connection Failed - Check Settings</p>}
             </div>
          </div>
          <div className="flex gap-2">
            {!hasApiKey && (
              <Link to="/settings" className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <Settings size={16} /> Setup API
              </Link>
            )}
            {hasApiKey && (
              <button 
                onClick={loadApiServices}
                disabled={isLoading}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                {isLive ? 'Refresh' : 'Retry Sync'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-500" />
            Price Calculator & Order
          </h2>
          
          <div className="space-y-6">
            
            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Platform</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.values(Platform).filter(p => p !== 'Other').map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setSelectedPlatform(platform)}
                    className={`
                      py-3 px-4 rounded-lg border text-sm font-medium transition-all
                      ${selectedPlatform === platform 
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}
                    `}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Selector (VISIBILITY IMPROVED) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Service</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                className="w-full rounded-lg border-slate-300 border-2 p-3 text-slate-900 font-bold bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow text-base shadow-sm"
              >
                {availableServices.length === 0 && <option value="0">No services found for {selectedPlatform}</option>}
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id} className="text-slate-900 font-semibold py-2">
                    {service.id} - {service.name} - {formatINR(service.rate)}
                  </option>
                ))}
              </select>
            </div>

            {/* Link Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Target Link</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
              <input
                type="number"
                min={currentService?.min}
                max={currentService?.max}
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder={`Min: ${currentService?.min || 0} - Max: ${currentService?.max || 0}`}
                className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Manual Discount Input (New) */}
            <div>
                <label className="block text-sm font-medium text-purple-700 mb-2 flex items-center gap-1">
                    <Tag size={14} /> Manual Discount (%) <span className="text-slate-400 font-normal ml-2 text-xs">- Optional, use for negotiation</span>
                </label>
                <div className="relative">
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={manualDiscount || ''}
                        onChange={(e) => setManualDiscount(parseFloat(e.target.value))}
                        placeholder="0"
                        className="w-full rounded-lg border-purple-200 bg-purple-50 border p-3 pl-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-purple-900 font-semibold"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold">%</div>
                </div>
            </div>

            {/* Quote & Profit Display */}
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-slate-500 text-sm uppercase font-semibold">Client Price (Total)</span>
                <div className="mt-1">
                    {manualDiscount > 0 ? (
                        <>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg text-slate-400 line-through">{formatINR(baseCharge)}</span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                    {manualDiscount}% OFF
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-purple-700">{formatINR(charge)}</p>
                        </>
                    ) : (
                        <p className="text-3xl font-bold text-slate-900">{formatINR(charge)}</p>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    {globalDiscount > 0 && <span className="text-purple-600 font-bold mr-1">Global Sale Active!</span>}
                    Includes GST/Margin
                </p>
              </div>
              
              {isLive && currentService?.originalRate && (
                 <div>
                    <span className="text-slate-500 text-sm uppercase font-semibold">Base Cost (Provider)</span>
                    <p className="text-xl font-bold text-slate-600 mt-1">{formatINR(providerCost)}</p>
                    <span className={`text-xs font-bold block mt-1 ${charge < providerCost ? 'text-red-500' : 'text-green-600'}`}>
                      {charge < providerCost ? 'WARNING: LOSS DEAL' : `GST/Fees: ${formatINR(charge - providerCost)}`}
                    </span>
                 </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!quantity || quantity <= 0}
                  className={`
                    flex-1 flex justify-center items-center gap-2 font-semibold py-3 px-6 rounded-lg shadow-sm border transition-all
                    ${!quantity || quantity <= 0 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}
                  `}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy Quote'}
                </button>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className={`
                    flex-1 flex justify-center items-center gap-2 font-semibold py-3 px-6 rounded-lg shadow-md transition-all
                    ${placingOrder 
                        ? 'bg-brand-800 text-white cursor-wait'
                        : 'bg-brand-600 hover:bg-brand-700 text-white'}
                  `}
                >
                  {placingOrder ? 'Processing...' : 'Order on Provider'}
                  <ExternalLink size={16} />
                </button>
            </div>
            
            {/* Order Result Message */}
            {orderResult && (
              <div className={`p-4 rounded-lg text-sm font-medium flex flex-col gap-1 ${orderResult.success ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                 <div className="flex items-center gap-2">
                    {orderResult.success ? <Check size={18} /> : <XCircle size={18} />}
                    <span className="font-bold">{orderResult.success ? 'Order Success' : 'Order Failed'}</span>
                 </div>
                 <div className="ml-6">
                    {orderResult.message}
                 </div>
                 
                 {!orderResult.success && (
                    <div className="bg-white p-3 rounded mt-2 border border-red-100 text-xs text-slate-700">
                       <p className="font-bold text-red-600 mb-1">Troubleshooting:</p>
                       <ul className="list-disc list-inside space-y-1">
                          <li>Check if your <strong>API Key</strong> is correct in Settings.</li>
                          <li>If you see a "Cloudflare" or "HTML" error, the Proxy is blocked.</li>
                          <li><strong>Fix:</strong> Go to Settings &rarr; Select <strong>Direct Connection</strong> &rarr; Install the CORS Extension.</li>
                       </ul>
                       <div className="mt-2 text-center">
                          <Link to="/settings" className="inline-block bg-slate-100 border border-slate-300 px-3 py-1 rounded text-slate-700 font-bold hover:bg-slate-200">
                             Go to Settings
                          </Link>
                       </div>
                    </div>
                 )}
              </div>
            )}
            
            {!isLive && (
                <div className="flex gap-2 items-start bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <HelpCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800">
                        <strong>Simulation Mode Active</strong><br/>
                        You are viewing Mock Data (Placeholders). The 50% dynamic margin calculation only activates when you connect a Live API Key in Settings.<br/>
                        To place real orders, go to <Link to="/settings" className="underline font-bold">Settings</Link> and connect your API.
                    </div>
                </div>
            )}

          </div>
        </div>
      </div>

      <div className="lg:col-span-1 space-y-6">
        {/* Service Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Info size={18} className="text-brand-500" />
            Service Info
          </h3>
          {currentService ? (
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-500 block mb-1">Service Name</span>
                <span className="font-medium text-slate-900">{currentService.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <span className="text-slate-500 block mb-1">Client Rate (Unit)</span>
                  <span className="font-bold text-brand-600">{formatINR(currentService.rate)}</span>
                </div>
                 <div>
                  <span className="text-slate-500 block mb-1">Platform</span>
                  <span className="font-medium text-slate-900">{currentService.platform}</span>
                </div>
              </div>
              {currentService.originalRate && (
                 <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 text-xs">Base Cost (Std)</span>
                        <span className="font-mono text-slate-600">{formatINR(currentService.originalRate)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-green-600">
                        <span className="text-xs uppercase">GST (50%)</span>
                        <span>{formatINR(currentService.rate - currentService.originalRate)}</span>
                    </div>
                    {globalDiscount > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-purple-600 font-bold text-center">
                            Includes {globalDiscount}% Global Sale Discount
                        </div>
                    )}
                 </div>
              )}
              <div>
                <span className="text-slate-500 block mb-1">Description/Category</span>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-100">
                  {currentService.description || currentService.category || 'No description available'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Select a service to view details.</p>
          )}
        </div>
        
        {/* Business Safety Check Widget */}
        <div className="bg-brand-50 rounded-xl p-6 border border-brand-100">
           <h4 className="font-bold text-brand-800 mb-2 flex items-center gap-2">
              <ShieldCheck size={16} /> Business Safety Check
           </h4>
           <div className="space-y-3 text-sm text-brand-900">
               {exchangeRate !== 1 && (
                  <div className="flex justify-between border-b border-brand-200 pb-2 bg-yellow-50 p-1 rounded">
                      <span className="text-xs">Currency Conversion:</span>
                      <span className="font-mono text-xs font-bold">Rate x {exchangeRate}</span>
                  </div>
               )}
              <div className="flex justify-between border-b border-brand-200 pb-2">
                  <span>Provider Rate (Std):</span>
                  <span className="font-mono">{currentService?.originalRate ? formatINR(currentService.originalRate) : '0.00'}</span>
              </div>
              <div className="flex justify-between border-b border-brand-200 pb-2">
                  <span>Selling Multiplier:</span>
                  <span className="font-bold">x 1.5 (Standard)</span>
              </div>
              {globalDiscount > 0 && (
                  <div className="flex justify-between border-b border-brand-200 pb-2 text-purple-700">
                    <span>Global Discount:</span>
                    <span className="font-bold">-{globalDiscount}%</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                  <span className="font-bold">Your Unit Price:</span>
                  <span className="font-bold">{currentService?.rate ? formatINR(currentService.rate) : '0.00'}</span>
              </div>
           </div>
            <p className="text-xs text-brand-700 mt-3 italic">
                * The difference is collected as GST & Service Taxes.
            </p>
        </div>
      </div>
    </div>
  );
};

export default NewOrder;