
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Calculator, 
  List, 
  Menu, 
  Zap,
  Bot,
  Settings as SettingsIcon,
  QrCode,
  X,
  Copy,
  Check,
  Activity
} from 'lucide-react';
import { getStoredSettings, SETTINGS_UPDATED_EVENT } from '../services/smmProvider';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Default open on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Use state for settings so we can trigger re-renders
  const [settings, setSettings] = useState(getStoredSettings());
  
  const location = useLocation();

  // Handle initial screen size
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings(getStoredSettings());
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    };
  }, []);

  const hideSettings = settings.hideSettings;
  const upiId = settings.upiId;

  const navItems = [
    { name: 'Services (Chakia)', path: '/', icon: List },
    { name: 'New Order', path: '/calculator', icon: Calculator },
    { name: 'Track Order', path: '/track', icon: Activity },
    { name: 'AI Strategy', path: '/ai-strategy', icon: Bot },
  ];

  // Only add Settings if it's not hidden
  if (!hideSettings) {
      navItems.push({ name: 'API Settings', path: '/settings', icon: SettingsIcon });
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavClick = () => {
    // Only close sidebar automatically on mobile
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex relative font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`
          fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden
          ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-out shadow-2xl lg:shadow-none border-r border-slate-800
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-20 flex items-center px-8 border-b border-slate-800/50 bg-slate-900/50 justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <span className="font-black text-lg tracking-tight">SocialBoost</span>
          </div>
          {/* Close button for mobile within sidebar */}
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
             <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col h-[calc(100%-5rem)] overflow-y-auto">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-8 shrink-0 backdrop-blur-sm">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">System Status</p>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <p className="text-sm font-bold text-slate-200 tracking-tight">Systems Operational</p>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group
                    ${isActive 
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20 ring-1 ring-white/10' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white hover:pl-5'}
                  `}
                >
                  <Icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
          
          {/* Payment Button (Only if UPI ID is set) */}
          {upiId && (
              <div className="mb-4 pt-6 border-t border-slate-800/50">
                  <button 
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] ring-1 ring-white/10"
                  >
                      <QrCode size={18} />
                      <span className="tracking-tight">Payment Info</span>
                  </button>
              </div>
          )}

          <div className="pt-6 border-t border-slate-800/50">
            <div className="flex flex-col items-center text-center">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Engineered by</p>
                <p className="text-xs font-bold text-slate-300 mt-1">Sandeep (Chakia)</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div 
        className={`
            flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}
        `}
      >
        {/* Top Header */}
        <header className="h-20 bg-white/80 border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
                onClick={toggleSidebar}
                className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
            >
                <Menu size={24} />
            </button>
            
            {/* Show title on mobile OR on desktop if sidebar is closed for context */}
            <div className={`flex-1 font-bold text-slate-800 transition-opacity duration-300 ${isSidebarOpen ? 'lg:opacity-0 lg:pointer-events-none block' : 'opacity-100'}`}>
                <span className="lg:hidden text-lg tracking-tight">SocialBoost IN</span>
                <span className="hidden lg:inline-flex items-center gap-2 text-xl tracking-tight">
                    <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shadow-sm">
                        <Zap size={16} className="text-white fill-white" />
                    </div>
                    SocialBoost IN
                </span>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
             <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-4 py-2 rounded-full border border-brand-100 whitespace-nowrap shadow-sm tracking-wide uppercase">
                ✨ Official Price List
             </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative animate-in fade-in zoom-in duration-300 border border-slate-100">
                <button 
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
                
                <div className="p-10 text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-emerald-100">
                        <QrCode size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Scan to Pay</h3>
                    <p className="text-slate-500 text-sm mb-8 font-medium">Use any UPI App (GPay, PhonePe, Paytm)</p>
                    
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm mb-8 inline-block">
                        {/* Dynamic QR Code Generation using QRServer API */}
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=SocialBoost`)}`}
                            alt="UPI QR Code" 
                            className="w-48 h-48 mix-blend-multiply"
                        />
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-100 mb-6 group hover:border-slate-200 transition-colors">
                        <span className="font-mono text-sm font-semibold text-slate-700 truncate mr-2 select-all">{upiId}</span>
                        <button 
                            onClick={handleCopyUpi}
                            className="text-slate-400 hover:text-emerald-600 transition-colors p-2 hover:bg-white rounded-lg"
                        >
                            {copied ? <Check size={18} className="text-emerald-500"/> : <Copy size={18} />}
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                        <span className="uppercase tracking-wide">Verified Merchant</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div> 
                        <span className="font-bold text-slate-600">Sandeep (Chakia)</span>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
