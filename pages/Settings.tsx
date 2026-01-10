import React, { useState, useEffect } from 'react';
import { Save, Key, Globe, ShieldCheck, AlertTriangle, ToggleLeft, ToggleRight, ExternalLink, RefreshCw, Zap, Tag, Eye, EyeOff, Lock, QrCode, Copy, Check, LogOut, Unlock, FileJson } from 'lucide-react';
import { getStoredSettings, saveSettings, getBalance, fetchLiveRate, isAdminUnlocked, setAdminUnlocked, fetchProviderServices } from '../services/smmProvider';
import { APP_CONFIG } from '../constants';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  // AUTH STATE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  // SETTINGS STATE
  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [autoExchangeRate, setAutoExchangeRate] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [hideSettings, setHideSettings] = useState(false);
  const [upiId, setUpiId] = useState('');
  
  const [status, setStatus] = useState<{type: 'success' | 'error' | null, msg: string}>({ type: null, msg: '' });
  const [balanceData, setBalanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // EXPORT STATE
  const [exportData, setExportData] = useState('');
  const [copiedExport, setCopiedExport] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const isUnlocked = isAdminUnlocked();
    setIsAuthenticated(isUnlocked);
    
    if (isUnlocked) {
        loadSettings();
    }
  }, []);

  const loadSettings = () => {
    const settings = getStoredSettings();
    setApiKey(settings.apiKey);
    setProxyUrl(settings.proxyUrl);
    setUseProxy(settings.useProxy);
    setExchangeRate(settings.exchangeRate);
    setAutoExchangeRate(settings.autoExchangeRate);
    setGlobalDiscount(settings.globalDiscount);
    setHideSettings(settings.hideSettings);
    setUpiId(settings.upiId);
    if(settings.apiKey) {
      checkConnection();
    }
  }

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // Compare raw pin directly as requested
      if (pinInput === APP_CONFIG.ADMIN_PIN) {
          setAdminUnlocked(true);
          setIsAuthenticated(true);
          loadSettings();
          setAuthError('');
      } else {
          setAuthError('Incorrect PIN');
          setPinInput('');
      }
  };

  const handleLogout = () => {
      setAdminUnlocked(false);
      setIsAuthenticated(false);
      navigate('/');
  };

  const checkConnection = async () => {
    setIsLoading(true);
    const data = await getBalance();
    if (data && data.balance) {
      setBalanceData(data);
    } else {
      setBalanceData(null);
    }
    setIsLoading(false);
  }

  const handleUpdateRate = async () => {
    setIsRateLoading(true);
    const rate = await fetchLiveRate();
    if (rate) {
        setExchangeRate(rate);
        setStatus({ type: 'success', msg: `Rate updated to ${rate}` });
        setTimeout(() => setStatus({ type: null, msg: '' }), 2000);
    } else {
        setStatus({ type: 'error', msg: 'Could not fetch live rate.' });
    }
    setIsRateLoading(false);
  }

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      setStatus({ type: 'error', msg: 'API Key cannot be empty.' });
      return;
    }
    
    saveSettings(apiKey, proxyUrl, useProxy, exchangeRate, autoExchangeRate, globalDiscount, hideSettings, upiId);
    
    setStatus({ type: 'success', msg: 'Settings saved successfully!' });
    setTimeout(() => {
         setStatus({ type: null, msg: '' });
    }, 2000);
  };

  const handleGenerateCatalog = async () => {
      if (!apiKey) return setStatus({ type: 'error', msg: 'API Key required to generate catalog.' });
      
      setIsLoading(true);
      try {
          // fetchProviderServices already applies the 1.5x Margin and Exchange Rate
          const services = await fetchProviderServices();
          
          // We remove 'originalRate' so clients cannot see the provider cost in the source code
          const safeServices = services.map(s => ({
              id: s.id,
              platform: s.platform,
              type: s.type,
              name: s.name,
              rate: s.rate, // This is the Selling Price (Cost * 1.5)
              min: s.min,
              max: s.max,
              description: s.description,
              category: s.category
          }));

          const jsonString = JSON.stringify(safeServices, null, 2);
          const exportString = `// Paste this into constants.ts replacing MOCK_SERVICES\nexport const MOCK_SERVICES: Service[] = ${jsonString};`;
          
          setExportData(exportString);
          setStatus({ type: 'success', msg: 'Catalog Generated! It includes your 50% Margin/Tax.' });
      } catch (e: any) {
          setStatus({ type: 'error', msg: 'Failed to fetch services: ' + e.message });
      } finally {
          setIsLoading(false);
      }
  };

  const handleCopyExport = () => {
      navigator.clipboard.writeText(exportData);
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2000);
  };

  // 🔒 LOCKED VIEW (PIN REQUIRED)
  if (!isAuthenticated) {
      return (
          <div className="max-w-md mx-auto mt-20 px-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 text-center">
                  <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-slate-900/20">
                      <Lock size={36} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Configuration Access</h2>
                  <p className="text-slate-500 text-sm mb-8 font-medium">Enter the security PIN to configure API Keys.</p>
                  
                  <form onSubmit={handleLogin} className="space-y-6">
                      <input 
                        type="password" 
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="Enter PIN"
                        className="w-full text-center text-3xl tracking-[0.5em] font-bold p-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all placeholder:tracking-normal placeholder:text-lg placeholder:font-normal placeholder:text-slate-300"
                        autoFocus
                      />
                      {authError && <p className="text-rose-500 text-sm font-bold animate-pulse flex items-center justify-center gap-1"><AlertTriangle size={14}/> {authError}</p>}
                      <button 
                        type="submit"
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-brand-600 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                      >
                          <Unlock size={18} /> Unlock Settings
                      </button>
                  </form>
                  <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      This only unlocks local settings. It does <span className="text-rose-500">NOT</span> grant Admin Access to funds.
                  </p>
              </div>
          </div>
      );
  }

  // 🔓 UNLOCKED VIEW (SETTINGS)
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                Configuration
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 tracking-wide uppercase">Local Config</span>
            </h2>
            <p className="text-slate-500 mt-2 text-lg font-medium">Connect provider API and manage store settings.</p>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-rose-600 flex items-center gap-2 hover:bg-rose-50 px-4 py-2.5 rounded-xl transition-colors uppercase tracking-wide">
              <LogOut size={16} /> Lock & Exit
          </button>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 font-bold text-sm ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {status.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          {status.msg}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-8">
          
          {/* API KEY INPUT */}
          <section>
            <label className="block text-xs font-extrabold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <Key size={14} className="text-brand-500" /> Provider API Key
            </label>
            <div className="relative">
                <input 
                type="text" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="e.g. 673fa2ecabbe3f543230228aa..."
                className="w-full p-4 pl-5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-mono text-xs font-medium text-slate-700 transition-all"
                />
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 ml-1 uppercase tracking-wide">Key from Sandyinsta / SMMDevil (Settings &gt; API)</p>
          </section>

          <hr className="border-slate-100" />

          {/* PAYMENT UPI CONFIG */}
          <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
             <label className="block text-xs font-extrabold text-blue-900 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <QrCode size={14} /> Payment Setup (UPI QR)
             </label>
             <div className="flex gap-3">
                <input 
                    type="text" 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. sandeep@okaxis"
                    className="flex-1 p-3 border border-blue-200 rounded-xl text-blue-900 placeholder-blue-300 outline-none focus:ring-4 focus:ring-blue-500/20 font-mono font-medium text-sm"
                />
                <button
                    onClick={handleCopyUpi}
                    className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 p-3 rounded-xl transition-colors shadow-sm"
                >
                    {copiedUpi ? <Check size={20} /> : <Copy size={20} />}
                </button>
             </div>
             <p className="text-[10px] font-bold text-blue-400 mt-2 uppercase tracking-wide">This ID will generate the QR code shown to clients.</p>
          </section>

          <hr className="border-slate-100" />
          
          {/* STOREWIDE DISCOUNT & RATE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* DISCOUNT */}
              <section>
                 <label className="block text-xs font-extrabold text-purple-900 mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <Tag size={14} className="text-purple-500" /> Global Markup/Discount
                 </label>
                 <div className="flex items-center gap-3">
                     <div className="relative w-full">
                        <input 
                            type="number" 
                            value={globalDiscount}
                            onChange={(e) => setGlobalDiscount(parseFloat(e.target.value))}
                            min="0"
                            max="99"
                            className="w-full p-4 border border-purple-100 rounded-xl font-bold text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-300 bg-purple-50/30 text-lg"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 font-black text-sm uppercase tracking-wide">% OFF</span>
                     </div>
                 </div>
              </section>

              {/* EXCHANGE RATE */}
              <section>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-extrabold text-slate-700 flex items-center gap-2 uppercase tracking-widest">
                        <RefreshCw size={14} className="text-brand-500" /> Currency Rate (INR)
                    </label>
                    <button 
                        onClick={() => {
                            const newVal = !autoExchangeRate;
                            setAutoExchangeRate(newVal);
                            if (newVal) handleUpdateRate();
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide transition-colors ${autoExchangeRate ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                        {autoExchangeRate ? 'Auto Update On' : 'Manual Mode'}
                    </button>
                </div>
                
                <div className="relative">
                    <input 
                      type="number" 
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                      disabled={autoExchangeRate}
                      step="0.01"
                      min="0.01"
                      className={`w-full p-4 border rounded-xl outline-none font-mono text-lg font-bold transition-all ${
                          autoExchangeRate ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-900'
                      }`}
                    />
                    {autoExchangeRate && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isRateLoading ? <RefreshCw size={16} className="animate-spin text-slate-400"/> : <Zap size={16} className="text-emerald-500" />}
                        </div>
                    )}
                </div>
              </section>
          </div>

          <hr className="border-slate-100" />

          {/* CONNECTION MODE TOGGLE */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-2 uppercase tracking-widest">
                <Globe size={14} className="text-slate-400" /> Proxy Settings
              </label>
              <button 
                onClick={() => setUseProxy(!useProxy)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wide ${useProxy ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}
              >
                {useProxy ? <ToggleLeft size={20} className="text-slate-400" /> : <ToggleRight size={20} />}
                {useProxy ? 'Enabled' : 'Disabled (Direct)'}
              </button>
            </div>
            
            {useProxy && (
              <div className="mt-2 animate-in slide-in-from-top-2">
                <input 
                  type="text" 
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="https://corsproxy.io/?"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-600 font-mono text-xs outline-none focus:border-slate-400 transition-colors"
                />
              </div>
            )}
          </section>

           <hr className="border-slate-100" />

           {/* EXPORT CATALOG FOR CLIENT DISTRIBUTION */}
           <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
               <div className="flex items-start gap-4">
                   <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                       <FileJson className="text-amber-600" size={24} />
                   </div>
                   <div className="flex-1">
                       <h3 className="font-bold text-amber-900 text-lg tracking-tight">Catalog Generator</h3>
                       <p className="text-sm text-amber-800/80 mt-1 leading-relaxed font-medium">
                           Create a safe, client-facing version of your service list. This removes your provider costs and applies your configured markup automatically.
                       </p>
                       
                       <button 
                           onClick={handleGenerateCatalog}
                           disabled={isLoading}
                           className="mt-4 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-600 transition-all shadow-md shadow-amber-200 flex items-center gap-2 active:scale-95 uppercase tracking-wide"
                       >
                           {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <FileJson size={16} />}
                           Generate Public JSON
                       </button>

                       {exportData && (
                           <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                               <div className="relative group">
                                   <textarea 
                                       value={exportData}
                                       readOnly
                                       className="w-full h-40 p-4 text-[10px] font-mono bg-white border border-amber-200 rounded-xl outline-none text-slate-600 resize-none shadow-inner"
                                       onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                   />
                                   <button 
                                       onClick={handleCopyExport}
                                       className="absolute top-3 right-3 bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 shadow-md uppercase tracking-wide"
                                   >
                                       {copiedExport ? <Check size={12} /> : <Copy size={12} />}
                                       {copiedExport ? 'Copied' : 'Copy'}
                                   </button>
                               </div>
                               <p className="text-[10px] text-amber-700 mt-3 font-bold flex items-center gap-2 uppercase tracking-wide">
                                   <span className="w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-[10px] font-bold">!</span>
                                   Paste this code into <code>constants.ts</code> to update the public catalog.
                               </p>
                           </div>
                       )}
                   </div>
               </div>
           </div>
          
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
             <div className="text-sm font-medium">
                {isLoading && <span className="text-slate-400 flex items-center gap-2 font-bold uppercase tracking-wide text-xs"><RefreshCw size={14} className="animate-spin"/> Checking...</span>}
                {!isLoading && balanceData && (
                   <span className="text-emerald-600 flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold uppercase tracking-wide">
                      <ShieldCheck size={16} /> Connected! Balance: <span className="font-mono text-sm">{balanceData.balance} {balanceData.currency}</span>
                   </span>
                )}
             </div>
             
             <button 
              onClick={handleSave}
              className="bg-brand-600 text-white px-8 py-3.5 rounded-xl hover:bg-brand-700 transition-all font-bold flex items-center gap-2 shadow-lg shadow-brand-500/30 active:scale-[0.98] uppercase tracking-wide text-xs"
             >
               <Save size={18} /> Save Settings
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;