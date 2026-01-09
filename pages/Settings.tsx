import React, { useState, useEffect } from 'react';
import { Save, Key, Globe, ShieldCheck, AlertTriangle, ToggleLeft, ToggleRight, ExternalLink, RefreshCw, Zap, Tag, Eye, EyeOff, Lock, QrCode } from 'lucide-react';
import { getStoredSettings, saveSettings, getBalance, fetchLiveRate } from '../services/smmProvider';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
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
  
  const navigate = useNavigate();

  useEffect(() => {
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
  }, []);

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

  const handleSave = () => {
    if (!apiKey.trim()) {
      setStatus({ type: 'error', msg: 'API Key cannot be empty.' });
      return;
    }
    if (exchangeRate <= 0) {
      setStatus({ type: 'error', msg: 'Exchange rate must be greater than 0.' });
      return;
    }
    
    // Save settings (this now dispatches an event to update Layout)
    saveSettings(apiKey, proxyUrl, useProxy, exchangeRate, autoExchangeRate, globalDiscount, hideSettings, upiId);
    
    setStatus({ type: 'success', msg: 'Settings saved successfully!' });
    
    // If user hid the settings, we should probably navigate them to the dashboard/catalog 
    // after a moment so they don't feel "stuck" on a hidden page.
    if (hideSettings) {
        setTimeout(() => {
            navigate('/');
        }, 1500);
    } else {
        // Just clear success message after a while
        setTimeout(() => {
             setStatus({ type: null, msg: '' });
        }, 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">API Configuration</h2>
        <p className="text-slate-500 mt-1">Connect your Sandyinsta account to enable real-time pricing and ordering.</p>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-lg border flex items-center gap-2 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {status.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          {status.msg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          
          {/* API KEY INPUT */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Key size={16} /> Sandyinsta API Key
            </label>
            <input 
              type="text" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. 673fa2ecabbe3f543230228aa..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-2">
              You can find this in your Sandyinsta Account {'>'} Settings {'>'} API Key.
            </p>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* PAYMENT UPI CONFIG */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
             <label className="block text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <QrCode size={16} /> Payment Setup (UPI QR)
             </label>
             <div className="space-y-2">
                 <input 
                  type="text" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. sandeep@okaxis"
                  className="w-full p-2 border border-blue-200 rounded text-blue-900 placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                />
                <div className="text-xs text-blue-700 leading-relaxed">
                   Enter your <strong>UPI ID</strong> (VPA). The app will automatically generate a QR code and show a "Payment Info" button in the sidebar for your clients to scan and pay.
                   <br/>
                   <span className="opacity-75">Leave empty to disable the payment button.</span>
                </div>
             </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>
          
          {/* STOREWIDE DISCOUNT */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
             <label className="block text-sm font-medium text-purple-900 mb-2 flex items-center gap-2">
                <Tag size={16} /> Storewide Sale / Global Discount (%)
             </label>
             <div className="flex gap-4">
                 <input 
                  type="number" 
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value))}
                  min="0"
                  max="99"
                  className="w-24 p-2 border border-purple-200 rounded text-center font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-400"
                />
                <div className="text-xs text-purple-700 leading-relaxed">
                   Apply a percentage discount to all services in your catalog.<br/>
                   <span className="opacity-75">Useful for "Seasonal Sales" or when you want to lower your margins globally. Set to 0 to disable.</span>
                </div>
             </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* HIDE SETTINGS TOGGLE */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    {hideSettings ? <EyeOff size={16} className="text-slate-500"/> : <Eye size={16} className="text-slate-500"/>}
                    Hide 'Settings' from Sidebar (Client Mode)
                </label>
                <button 
                    onClick={() => setHideSettings(!hideSettings)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${hideSettings ? 'bg-slate-800' : 'bg-slate-300'}`}
                >
                    <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${hideSettings ? 'left-6' : 'left-1'}`} />
                </button>
            </div>
            <div className="text-xs text-slate-500">
                <p>If enabled, the "API Settings" link will vanish from the menu after saving.</p>
                <p className="mt-1 font-bold text-slate-600 flex items-center gap-1">
                    <Lock size={12}/> To access this page again, you must type <code className="bg-slate-200 px-1 rounded">/settings</code> in your browser URL.
                </p>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* EXCHANGE RATE */}
          <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <RefreshCw size={16} /> Currency Exchange Rate
                </label>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${autoExchangeRate ? 'text-green-600' : 'text-slate-400'}`}>
                        {autoExchangeRate ? 'Auto Live Rate' : 'Manual Mode'}
                    </span>
                    <button 
                        onClick={() => {
                            const newVal = !autoExchangeRate;
                            setAutoExchangeRate(newVal);
                            if (newVal) handleUpdateRate();
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${autoExchangeRate ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                        <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoExchangeRate ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input 
                  type="number" 
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                  disabled={autoExchangeRate}
                  step="0.01"
                  min="0.01"
                  className={`w-full p-3 border rounded-lg outline-none font-mono text-sm ${
                      autoExchangeRate ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white border-slate-300 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {autoExchangeRate && (
                    <div className="absolute right-3 top-3.5">
                        {isRateLoading ? <RefreshCw size={16} className="animate-spin text-slate-400"/> : <Zap size={16} className="text-green-500" />}
                    </div>
                )}
              </div>
              <div className="text-sm text-slate-500 flex-1">
                <p>1 Provider Unit = <strong>{exchangeRate}</strong> Your Currency</p>
                {autoExchangeRate ? (
                    <p className="text-xs mt-1 text-green-600">Rate is automatically synced from global markets.</p>
                ) : (
                    <p className="text-xs mt-1 text-slate-400">If Provider is USD and you use INR, set to <strong>87</strong>.</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* CONNECTION MODE TOGGLE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Globe size={16} /> Connection Mode
              </label>
              <button 
                onClick={() => setUseProxy(!useProxy)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${useProxy ? 'bg-slate-200 text-slate-700' : 'bg-green-100 text-green-700'}`}
              >
                {useProxy ? <ToggleLeft size={24} className="text-slate-500" /> : <ToggleRight size={24} />}
                {useProxy ? 'Using Proxy' : 'Direct Connection'}
              </button>
            </div>
            
            {!useProxy && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
                <p className="font-bold mb-1">✅ Recommended Setup (Fixes 99% of errors):</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Keep this switch on <strong>Direct Connection</strong>.</li>
                  <li>Install the <a href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700 inline-flex items-center gap-0.5">Allow CORS <ExternalLink size={10} /></a> extension.</li>
                  <li>Click the extension icon in your browser to turn it ON.</li>
                  <li>Save this configuration.</li>
                </ol>
              </div>
            )}
            
            {useProxy && (
               <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
                  <strong>Warning:</strong> Public proxies are often blocked by SMM providers (Cloudflare). If you cannot order, switch to "Direct Connection" above.
               </div>
            )}

            {useProxy && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Proxy URL (Advanced)
                </label>
                <input 
                  type="text" 
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="https://corsproxy.io/?"
                  className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-slate-600 font-mono text-xs outline-none"
                />
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
             <div className="text-sm">
                {isLoading && <span className="text-slate-500">Checking connection...</span>}
                {!isLoading && balanceData && (
                   <span className="text-green-600 font-medium flex items-center gap-1">
                      <ShieldCheck size={16} /> Connected! Balance: {balanceData.balance} {balanceData.currency}
                   </span>
                )}
                {!isLoading && !balanceData && apiKey && (
                    <span className="text-red-500 font-medium">
                        Not connected. Check Extension?
                    </span>
                )}
             </div>
             
             <button 
              onClick={handleSave}
              className="bg-brand-600 text-white px-6 py-2.5 rounded-lg hover:bg-brand-700 transition-colors font-medium flex items-center gap-2"
             >
               <Save size={18} /> Save Configuration
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;