
import React, { useState, useEffect } from 'react';
import { MOCK_SERVICES } from '../constants';
import { Search, RefreshCw, AlertCircle, Settings, ShoppingCart, Info, FileText } from 'lucide-react';
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
      handleSync(); // Auto sync if key exists
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            Service Catalog
            {isLive && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 tracking-wide uppercase">
                    Live API
                </span>
            )}
          </h2>
          <p className="text-slate-500 text-base mt-2 max-w-2xl leading-relaxed font-medium">
            {isLive 
                ? `Browsing ${services.length} real-time services from the provider.` 
                : 'Browsing default catalog (Mock Data). Switch to Admin to see live prices.'}
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0">
           {!hasApiKey && (
             <Link to="/settings" className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-200 font-bold text-xs uppercase tracking-wide">
               <Settings size={16} /> Configure API
             </Link>
           )}
           {hasApiKey && (
             <button 
              onClick={handleSync}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-70 transition-all shadow-md shadow-slate-200 font-bold text-xs uppercase tracking-wide"
             >
               <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
               {loading ? 'Syncing...' : 'Sync Data'}
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
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
        </div>
        <input 
          type="text"
          placeholder="Search by Service ID, Name or Platform..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm font-medium"
        />
      </div>

      {/* Service Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] w-24">ID</th>
                <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Service Details</th>
                <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right whitespace-nowrap">Price / 1K</th>
                {isLive && <th className="px-6 py-5 font-bold text-emerald-600 uppercase tracking-widest text-[10px] text-right whitespace-nowrap">GST & Taxes</th>}
                <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Min / Max</th>
                <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-5 font-mono text-slate-400 font-medium align-top group-hover:text-slate-600 text-xs">{service.id}</td>
                  
                  {/* SERVICE & DESCRIPTION */}
                  <td className="px-6 py-5 max-w-xl align-top">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-start gap-2.5">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border tracking-wide mt-0.5
                                ${service.platform === 'Instagram' ? 'bg-pink-50 text-pink-700 border-pink-200' : 
                                service.platform === 'Facebook' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                service.platform === 'YouTube' ? 'bg-red-50 text-red-700 border-red-200' :
                                service.platform === 'TikTok' ? 'bg-slate-100 text-slate-900 border-slate-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'}
                             `}>
                                {service.platform}
                             </span>
                             <span className="font-semibold text-slate-800 text-sm leading-snug">{service.name}</span>
                        </div>
                        {/* DESCRIPTION BLOCK */}
                        {service.description && (
                            <div className="flex gap-2.5 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-500 group-hover:bg-white group-hover:border-slate-200 transition-colors">
                                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                <p className="text-xs leading-relaxed opacity-90 font-medium">
                                    {service.description}
                                </p>
                            </div>
                        )}
                    </div>
                  </td>

                  <td className="px-6 py-5 font-bold text-slate-900 text-right align-top text-base font-mono tracking-tight">
                    {formatINR(service.rate)}
                  </td>
                  
                  {isLive && (
                    <td className="px-6 py-5 text-emerald-600 font-mono font-bold text-right text-xs align-top tracking-tight">
                         {service.originalRate ? formatINR(service.rate - service.originalRate) : '-'}
                    </td>
                  )}
                  
                  <td className="px-6 py-5 text-xs font-medium text-slate-500 text-center align-top whitespace-nowrap">
                    <div className="bg-slate-100 inline-block px-2 py-1 rounded border border-slate-200 font-mono text-[10px]">
                        {service.min} - {service.max}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center align-top">
                    <Link 
                      to={`/calculator?serviceId=${service.id}`}
                      className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 hover:shadow-brand-500/40 active:scale-95 uppercase tracking-wide"
                    >
                      <ShoppingCart size={12} /> Buy
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredServices.length === 0 && (
            <div className="p-12 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-slate-300" size={32} />
              </div>
              <h3 className="text-slate-900 font-bold mb-1">No services found</h3>
              <p className="text-slate-500 text-sm font-medium">We couldn't find anything matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesList;
