import React, { useState, useEffect } from 'react';
import { MOCK_SERVICES } from '../constants';
import { Search, RefreshCw, AlertCircle, Settings, ShoppingCart } from 'lucide-react';
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
      setError(err.message || "Failed to sync with SMMDevil.");
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.id.toString().includes(searchTerm)
  );

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Services List
            {isLive && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">Live API Data</span>}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isLive ? `Showing ${services.length} real-time services from SMMDevil.` : 'Showing default catalog (Mock Data).'}
          </p>
        </div>
        
        <div className="flex gap-2">
           {!hasApiKey && (
             <Link to="/settings" className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
               <Settings size={18} /> Configure API
             </Link>
           )}
           {hasApiKey && (
             <button 
              onClick={handleSync}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
             >
               <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
               {loading ? 'Syncing...' : 'Sync from Provider'}
             </button>
           )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold">
             <AlertCircle size={20} className="shrink-0" />
             <span>Connection Error</span>
          </div>
          <p className="ml-7">{error}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search by ID, Name or Platform..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none w-full"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Platform</th>
                <th className="px-6 py-4">Service Name</th>
                <th className="px-6 py-4 text-right">Client Price</th>
                {isLive && <th className="px-6 py-4 text-right bg-slate-100">Base Cost</th>}
                {isLive && <th className="px-6 py-4 text-right text-green-600">GST</th>}
                <th className="px-6 py-4 text-center">Min / Max</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500">{service.id}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border
                      ${service.platform === 'Instagram' ? 'bg-pink-50 text-pink-700 border-pink-200' : 
                        service.platform === 'Facebook' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'}
                    `}>
                      {service.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium max-w-md">
                    {service.name}
                    {service.category && <div className="text-xs text-slate-400 font-normal mt-0.5">{service.category}</div>}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-right">{formatINR(service.rate)}</td>
                  
                  {isLive && (
                    <>
                      <td className="px-6 py-4 text-slate-500 text-right bg-slate-50 font-mono text-xs">
                        {service.originalRate ? formatINR(service.originalRate) : '-'}
                      </td>
                      <td className="px-6 py-4 text-green-600 font-bold text-right text-xs">
                         {service.originalRate ? formatINR(service.rate - service.originalRate) : '-'}
                      </td>
                    </>
                  )}
                  
                  <td className="px-6 py-4 text-xs text-slate-500 text-center">
                    {service.min} / {service.max}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link 
                      to={`/calculator?serviceId=${service.id}`}
                      className="inline-flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-brand-700 transition-colors shadow-sm"
                    >
                      <ShoppingCart size={14} /> Buy Now
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredServices.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No services found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesList;