import React, { useState, useEffect } from 'react';
import { Save, Key, Globe, ShieldCheck, AlertTriangle, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import { getStoredSettings, saveSettings, getBalance } from '../services/smmProvider';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [useProxy, setUseProxy] = useState(false); // Default to FALSE (Direct) for better success rate
  const [status, setStatus] = useState<{type: 'success' | 'error' | null, msg: string}>({ type: null, msg: '' });
  const [balanceData, setBalanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const settings = getStoredSettings();
    setApiKey(settings.apiKey);
    setProxyUrl(settings.proxyUrl);
    setUseProxy(settings.useProxy);
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

  const handleSave = () => {
    if (!apiKey.trim()) {
      setStatus({ type: 'error', msg: 'API Key cannot be empty.' });
      return;
    }
    
    saveSettings(apiKey, proxyUrl, useProxy);
    setStatus({ type: 'success', msg: 'Settings saved successfully!' });
    checkConnection();
    
    // Clear success message after 3 seconds
    setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">API Configuration</h2>
        <p className="text-slate-500 mt-1">Connect your SMMDevil account to enable real-time pricing and ordering.</p>
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
              <Key size={16} /> SMMDevil API Key
            </label>
            <input 
              type="text" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. 673fa2ecabbe3f543230228aa..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-2">
              You can find this in your SMMDevil Account {'>'} Settings {'>'} API Key.
            </p>
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