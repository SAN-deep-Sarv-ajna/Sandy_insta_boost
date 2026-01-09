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
    { name: 'Service Catalog', path: '/', icon: List },
    { name: 'Price Calculator', path: '/calculator', icon: Calculator },
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
    <div className="min-h-screen bg-slate-50 flex relative">
      {/* Mobile Sidebar Overlay */}
      {/* Only show overlay on mobile when sidebar is open */}
      <div 
        className={`
          fixed inset-0 bg-black/50 z-20 transition-opacity duration-300 lg:hidden
          ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span>SocialBoost IN</span>
          </div>
          {/* Close button for mobile within sidebar */}
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
             <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col h-[calc(100%-4rem)]">
          <div className="bg-slate-800 rounded-lg p-4 mb-6 shrink-0">
            <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-sm font-bold text-white">Services Active</p>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-brand-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon size={18} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
          
          {/* Payment Button (Only if UPI ID is set) */}
          {upiId && (
              <div className="mb-4 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                      <QrCode size={18} />
                      Payment Info
                  </button>
              </div>
          )}

          <div className="pt-4 border-t border-slate-800">
            <div className="text-center text-xs text-slate-500 font-medium">
              Made with ❤️ by Sandeep (Chakia)
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div 
        className={`
            flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}
        `}
      >
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Menu size={24} />
          </button>
          
          {/* Show title on mobile OR on desktop if sidebar is closed for context */}
          <div className={`flex-1 text-center font-bold text-slate-800 transition-opacity duration-300 ${isSidebarOpen ? 'lg:opacity-0 lg:pointer-events-none block' : 'opacity-100'}`}>
            <span className="lg:hidden">SocialBoost IN</span>
            <span className="hidden lg:inline-flex items-center gap-2">
                <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center">
                    <Zap size={14} className="text-white" />
                </div>
                SocialBoost IN
            </span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
             <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 whitespace-nowrap">
                Official Price List
             </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative animate-in fade-in zoom-in duration-200">
                <button 
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
                
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <QrCode size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">Scan to Pay</h3>
                    <p className="text-slate-500 text-sm mb-6">Use any UPI App (GPay, PhonePe, Paytm)</p>
                    
                    <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-inner mb-6 inline-block">
                        {/* Dynamic QR Code Generation using QRServer API */}
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=SocialBoost`)}`}
                            alt="UPI QR Code" 
                            className="w-48 h-48"
                        />
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between border border-slate-200 mb-4">
                        <span className="font-mono text-sm font-medium text-slate-700 truncate mr-2">{upiId}</span>
                        <button 
                            onClick={handleCopyUpi}
                            className="text-slate-400 hover:text-brand-600 transition-colors p-1"
                        >
                            {copied ? <Check size={18} className="text-green-500"/> : <Copy size={18} />}
                        </button>
                    </div>
                    
                    <p className="text-xs text-slate-400">
                        Verified Merchant: <span className="font-bold text-slate-600">Sandeep (Chakia)</span>
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;