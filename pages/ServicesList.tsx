import React, { useState, useEffect } from 'react';
import { MOCK_SERVICES } from '../constants';
import { Search, RefreshCw, AlertCircle, Settings, ShoppingCart, Info, FileText, ArrowRight } from 'lucide-react';
import { fetchProviderServices, getStoredSettings } from '../services/smmProvider';
import { Service } from '../types';
import { Link } from 'react-router-dom';

const ServicesList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const { apiKey } = getStoredSettings();
    if (apiKey) {
      setHasApiKey(true);
      handleSync(); 
    } else {
      setHasApiKey(false);
    }
  }, []);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const liveServices = await fetchProviderServices();
      setServices(liveServices);
      setIsLive(true);
    } catch (err: any) {
      setError(err.message || "Failed to sync with Sandyinsta.");
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const term = searchTerm.toLowerCase();
    const name = (service.name || '').toLowerCase();
    const platform = (service.platform || '').toLowerCase();
    const id = (service.id || '').toString();
    
    return name.includes(term) || platform.includes(term) || id.includes(term);
  });

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getPlatformBadge = (platform: string) => {
      let styles = 'bg-slate-100 text-slate-700 border-slate-200';
      if (platform === 'Instagram') styles = 'bg-pink-50 text-pink-700 border-pink-200';
      if (platform === 'Facebook') styles = 'bg-blue-50 text-blue-700 border-blue-200';
      if (platform === 'YouTube') styles = 'bg-red-50 text-red-700 border-red-200';
      if (platform === 'TikTok') styles = 'bg-zinc-100 text-zinc-800 border-zinc-200';
      
      return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border tracking-wide ${styles}`}>
              {platform}
          </span>
      );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Services List
            {isLive && (
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 tracking-wide uppercase shadow-sm">
                    Live API Connected
                </span>
            )}
          </h2>
          <p className="text-slate-500 text-base mt-2 max-w-2xl font-medium">
            {isLive 
                ? `Browsing ${services.length} real-time services from the provider.` 
                : 'Browsing default catalog. Switch to Admin Settings to sync live prices.'}
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0">
           {hasApiKey && (
             <button 
              onClick={handleSync}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-70 transition-all shadow-sm font-bold text-xs uppercase tracking-wide"
             >
               <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
               {loading ? 'Syncing...' : 'Refresh Data'}
             </button>
           )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 text-sm flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
             <span className="font-bold block uppercase tracking-wide text-xs">Connection Error</span>
             <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative group max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
        </div>
        <input 
          type="text"
          placeholder="Search by Service ID, Name or Platform..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm font-medium"
        />
      </div>

      {/* Service List Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        
        {/* --- MOBILE VIEW: Cards (Visible on screens smaller than 'md') --- */}
        <div className="md:hidden divide-y divide-slate-100">
            {filteredServices.map((service) => (
                <div key={service.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                    {/* Card Header */}
                    <div className="flex justify-between items-start">
                        <span className="font-mono text-slate-400 font-bold text-[10px] bg-slate-100 px-2 py-1 rounded border border-slate-200">ID: {service.id}</span>
                        {getPlatformBadge(service.platform)}
                    </div>

                    {/* Service Name & Desc */}
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{service.name}</h3>
                        {service.description && (
                            <div className="mt-3 flex gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <Info size={14} className="shrink-0 mt-0.5 text-brand-500" />
                                <p className="leading-relaxed font-medium">{service.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white border border-slate-200 p-3 rounded-xl">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 block">Price / 1K</span>
                            <span className="font-bold text-slate-900 font-mono text-base">{formatINR(service.rate)}</span>
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-xl">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 block">Min / Max</span>
                            <span className="font-medium text-slate-700 font-mono">{service.min} - {service.max}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Link 
                      to={`/calculator?serviceId=${service.id}`}
                      className="flex items-center justify-center gap-2 bg-slate-900 text-white w-full py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 uppercase tracking-wide"
                    >
                      <ShoppingCart size={14} /> Buy Now
                    </Link>
                </div>
            ))}
        </div>

        {/* --- DESKTOP VIEW: Table (Visible on 'md' and larger) --- */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] w-20">ID</th>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Service</th>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right whitespace-nowrap">Price / 1K</th>
                {isLive && <th className="px-6 py-4 font-bold text-emerald-600 uppercase tracking-widest text-[10px] text-right whitespace-nowrap">Profit</th>}
                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Limits</th>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-5 align-top">
                      <span className="font-mono text-slate-400 font-medium text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">#{service.id}</span>
                  </td>
                  
                  {/* SERVICE & DESCRIPTION */}
                  <td className="px-6 py-5 max-w-xl align-top">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-start gap-3">
                             {getPlatformBadge(service.platform)}
                             <span className="font-bold text-slate-800 text-sm leading-snug pt-0.5">{service.name}</span>
                        </div>
                        {/* DESCRIPTION BLOCK */}
                        {service.description && (
                            <p className="text-xs leading-relaxed text-slate-500 font-medium mt-1 pl-1 border-l-2 border-slate-200 ml-1">
                                {service.description}
                            </p>
                        )}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-right align-top">
                    <span className="font-bold text-slate-900 text-base font-mono tracking-tight">{formatINR(service.rate)}</span>
                  </td>
                  
                  {isLive && (
                    <td className="px-6 py-5 text-emerald-600 font-mono font-bold text-right text-xs align-top tracking-tight">
                         {service.originalRate ? formatINR(service.rate - service.originalRate) : '-'}
                    </td>
                  )}
                  
                  <td className="px-6 py-5 text-center align-top">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] font-medium text-slate-500">
                        {service.min} - {service.max}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center align-top">
                    <Link 
                      to={`/calculator?serviceId=${service.id}`}
                      className="inline-flex items-center gap-1 bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-brand-600 transition-all shadow-md shadow-slate-900/10 hover:shadow-brand-600/20 active:scale-95 uppercase tracking-wide group"
                    >
                      Buy <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredServices.length === 0 && (
            <div className="p-16 text-center border-t border-slate-100 md:border-t-0">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <Search className="text-slate-300" size={32} />
              </div>
              <h3 className="text-slate-900 font-bold mb-2 text-lg">No services found</h3>
              <p className="text-slate-500 text-sm font-medium">Try searching for a different keyword or ID.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ServicesList;