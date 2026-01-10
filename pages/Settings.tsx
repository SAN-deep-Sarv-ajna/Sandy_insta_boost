import React, { useState, useEffect } from 'react';
import { Save, Key, Globe, ShieldCheck, AlertTriangle, ToggleLeft, ToggleRight, RefreshCw, Zap, Tag, QrCode, Copy, Check, Lock, Unlock, FileJson, Server } from 'lucide-react';
import { fetchLiveRate, fetchProviderServices, fetchPublicSettings, fetchPrivateSettings, saveSystemSettings, getBalance } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // STATE
  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [autoExchangeRate, setAutoExchangeRate] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [upiId, setUpiId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{type: 'success' | 'error' | null, msg: string}>({ type: null, msg: '' });
  const [balanceData, setBalanceData] = useState<any>(null);
  
  // EXPORT STATE
  const [exportData, setExportData] = useState('');
  const [copiedExport, setCopiedExport] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
        // Redirect or show access denied
        return;
    }
    loadData();
  }, [isAdmin, authLoading]);

  const loadData = async () => {
      setLoading(true);
      const pub = await fetchPublicSettings();
      const priv = await fetchPrivateSettings();

      if (pub) {
          setUpiId(pub.upiId || '');
          setExchangeRate(pub.exchangeRate || 1);
          setGlobalDiscount(pub.globalDiscount || 0);
          setAutoExchangeRate(pub.autoExchangeRate || false);
      }
      if (priv) {
          setApiKey(priv.apiKey || '');
          setProxyUrl(priv.proxyUrl || '');
          setUseProxy(priv.useProxy || false);
      }
      
      // Check Balance
      if (priv?.apiKey) {
          const bal = await getBalance();
          setBalanceData(bal);
      }
      setLoading(false);
  };

  const handleUpdateRate = async () => {
    const rate = await fetchLiveRate();
    if (rate) {
        setExchangeRate(rate);
        setStatus({ type: 'success', msg: `Rate updated to ${rate}` });
    } else {
        setStatus({ type: 'error', msg: 'Could not fetch live rate.' });
    }
  };

  const handleSave = async () => {
    if (!upiId) return setStatus({ type: 'error', msg: 'UPI ID is required' });
    
    setLoading(true);
    try {
        await saveSystemSettings(
            { upiId, exchangeRate, globalDiscount, autoExchangeRate },
            { apiKey, proxyUrl, useProxy, apiUrl: 'https://smmdevil.com/api/v2' }
        );
        setStatus({ type: 'success', msg: 'Settings Saved Globally to Database!' });
        
        // Refresh balance if key changed
        const bal = await getBalance();
        setBalanceData(bal);
        
    } catch (e: any) {
        setStatus({ type: 'error', msg: 'Save failed: ' + e.message });
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateCatalog = async () => {
      if (!apiKey) return setStatus({ type: 'error', msg: 'API Key required.' });
      
      setLoading(true);
      try {
          // Pass current settings explicitly to the fetcher
          const services = await fetchProviderServices(apiKey, proxyUrl, useProxy, exchangeRate, globalDiscount);
          
          const safeServices = services.map(s => ({
              id: s.id,
              platform: s.platform,
              type: s.type,
              name: s.name,
              rate: s.rate, 
              min: s.min,
              max: s.max,
              description: s.description,
              category: s.category
          }));

          const jsonString = JSON.stringify(safeServices, null, 2);
          const exportString = `// Paste this into constants.ts\nexport const MOCK_SERVICES: Service[] = ${jsonString};`;
          
          setExportData(exportString);
          setStatus({ type: 'success', msg: 'Catalog Generated!' });
      } catch (e: any) {
          setStatus({ type: 'error', msg: 'Fetch failed: ' + e.message });
      } finally {
          setLoading(false);
      }
  };

  if (!isAdmin) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                  <Lock className="text-slate-400" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
              <p className="text-slate-500 max-w-md">
                  This page is for the Owner (Admin) only. Your account does not have the required permissions.
              </p>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                <Server className="text-brand-600" /> System Config
            </h2>
            <p className="text-slate-500 mt-2 text-lg font-medium">Global database settings for all users.</p>
          </div>
          {balanceData && (
               <span className="text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 text-xs font-bold uppercase tracking-wide">
                  <ShieldCheck size={16} /> API Balance: <span className="font-mono text-sm">{balanceData.balance} {balanceData.currency}</span>
               </span>
          )}
      </div>

      {status.msg && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 font-bold text-sm ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {status.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
          {status.msg}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden p-8 space-y-8">
          
          {/* PRIVATE SETTINGS */}
          <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative">
             <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                 <Lock size={10} /> Private (Admin Only)
             </div>
             
             <label className="block text-xs font-extrabold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <Key size={14} className="text-brand-500" /> Provider API Key
             </label>
             <input 
                type="text" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter SMMDevil API Key"
                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-mono text-xs font-medium text-slate-700 bg-white"
             />

             <div className="mt-6 flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                    <Globe size={14} /> Proxy
                </label>
                <button 
                    onClick={() => setUseProxy(!useProxy)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wide ${useProxy ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}
                >
                    {useProxy ? <ToggleLeft size={20} /> : <ToggleRight size={20} />}
                    {useProxy ? 'Proxy On' : 'Direct'}
                </button>
             </div>
             {useProxy && (
                 <input 
                    type="text" 
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    placeholder="Proxy URL"
                    className="w-full mt-3 p-3 border border-slate-200 rounded-xl bg-white text-xs"
                 />
             )}
          </section>

          {/* PUBLIC SETTINGS */}
          <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 relative">
             <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1">
                 <Globe size={10} /> Public (Visible to Clients)
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-extrabold text-blue-900 mb-3 flex items-center gap-2 uppercase tracking-widest">
                        <QrCode size={14} /> UPI ID (Payment)
                    </label>
                    <input 
                        type="text" 
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="sandeep@okaxis"
                        className="w-full p-3 border border-blue-200 rounded-xl text-blue-900 bg-white font-mono font-medium text-sm"
                    />
                 </div>
                 
                 <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-extrabold text-blue-900 flex items-center gap-2 uppercase tracking-widest">
                            <Zap size={14} /> INR Rate
                        </label>
                        <button onClick={handleUpdateRate} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200">
                            Fetch Live
                        </button>
                    </div>
                    <input 
                      type="number" 
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                      className="w-full p-3 border border-blue-200 rounded-xl text-blue-900 bg-white font-bold"
                    />
                 </div>
             </div>
             
             <div className="mt-6">
                 <label className="block text-xs font-extrabold text-blue-900 mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <Tag size={14} /> Global Discount (%)
                 </label>
                 <input 
                    type="number" 
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value))}
                    className="w-full p-3 border border-blue-200 rounded-xl text-blue-900 bg-white font-bold"
                 />
             </div>
          </section>
          
          <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
              {loading ? <RefreshCw className="animate-spin"/> : <Save size={18} />} Save All Settings
          </button>

          <hr className="border-slate-100" />
          
           {/* EXPORT CATALOG */}
           <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
               <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2 mb-2">
                   <FileJson size={16} /> Catalog Generator
               </h3>
               <button 
                   onClick={handleGenerateCatalog}
                   disabled={loading || !apiKey}
                   className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-amber-600 transition-all uppercase tracking-wide"
               >
                   Generate Public JSON
               </button>
               {exportData && (
                    <div className="mt-4 relative">
                        <textarea 
                            value={exportData}
                            readOnly
                            className="w-full h-32 p-3 text-[10px] font-mono bg-white border border-amber-200 rounded-xl"
                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                        <button 
                           onClick={() => {navigator.clipboard.writeText(exportData); setCopiedExport(true)}}
                           className="absolute top-2 right-2 bg-slate-800 text-white px-2 py-1 rounded text-[10px]"
                        >
                            {copiedExport ? 'Copied' : 'Copy'}
                        </button>
                    </div>
               )}
           </div>
      </div>
    </div>
  );
};

export default Settings;