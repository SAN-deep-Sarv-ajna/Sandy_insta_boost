import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
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
  Activity,
  Wallet,
  ShieldAlert,
  LogOut,
  User,
  ListOrdered,
  Lock
} from 'lucide-react';
import { getStoredSettings, SETTINGS_UPDATED_EVENT } from '../services/smmProvider';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [settings, setSettings] = useState(getStoredSettings());
  const location = useLocation();
  const { user, signInWithGoogle, logout, isAdmin } = useAuth(); // Auth Hook

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings(getStoredSettings());
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    };
  }, []);

  const navItems = [
    { name: 'Services', path: '/', icon: List },
    { name: 'New Order', path: '/calculator', icon: Calculator },
    { name: 'Add Funds', path: '/add-funds', icon: Wallet }, // New Link
    { name: 'Track Order', path: '/track', icon: Activity },
    { name: 'AI Strategy', path: '/ai-strategy', icon: Bot },
  ];

  if (isAdmin) {
      navItems.push({ name: 'Order Queue', path: '/admin/orders', icon: ListOrdered });
      navItems.push({ name: 'Funds Approvals', path: '/admin/transactions', icon: ShieldAlert });
      navItems.push({ name: 'Settings', path: '/settings', icon: SettingsIcon });
  }
  // Client-side Settings link removed requested.
  // Access is now only via the secret lock button or direct URL.

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex relative font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-out shadow-2xl lg:shadow-none border-r border-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-20 flex items-center px-8 border-b border-slate-800/50 bg-slate-900/50 justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <span className="font-black text-lg tracking-tight">SocialBoost</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
             <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col h-[calc(100%-5rem)] overflow-y-auto">
          {/* User Profile / Login Section */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6 shrink-0 backdrop-blur-sm">
            {user ? (
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                       <img src={user.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-700" />
                       <div className="overflow-hidden">
                           <p className="text-white font-bold text-sm truncate">{user.displayName || 'Client'}</p>
                           <p className="text-slate-400 text-xs truncate">{user.email}</p>
                       </div>
                   </div>
                   <div className="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center border border-slate-700/50">
                       <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Balance</span>
                       <span className="text-emerald-400 font-bold font-mono">₹{user.balance.toFixed(2)}</span>
                   </div>
                   <button onClick={logout} className="w-full text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2 py-2 hover:bg-slate-700 rounded-lg transition-all">
                       <LogOut size={14} /> Sign Out
                   </button>
                </div>
            ) : (
                <button 
                  onClick={signInWithGoogle}
                  className="w-full bg-white text-slate-900 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                >
                   <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="G" />
                   Login with Google
                </button>
            )}
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
                  {(item.name === 'Funds Approvals' || item.name === 'Order Queue') && (
                     <span className="ml-auto w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>
          
          {/* Quick Action */}
          <div className="mb-4 pt-6 border-t border-slate-800/50">
              <Link to="/add-funds" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] ring-1 ring-white/10">
                  <Wallet size={18} />
                  <span className="tracking-tight">Add Funds</span>
              </Link>
          </div>

          <div className="pt-6 border-t border-slate-800/50">
            <div className="flex flex-col items-center text-center">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Engineered by</p>
                <p className="text-xs font-bold text-slate-300 mt-1">Sandeep (Chakia)</p>
                
                {/* SECRET ADMIN ACCESS BUTTON */}
                {!isAdmin && (
                  <Link to="/settings" title="Admin Login" className="mt-4 p-2 text-slate-700 hover:text-white transition-colors opacity-30 hover:opacity-100">
                    <Lock size={14} />
                  </Link>
                )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        <header className="h-20 bg-white/80 border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all">
                <Menu size={24} />
            </button>
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
             {user && (
                 <div className="hidden sm:flex flex-col items-end mr-2">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Balance</span>
                     <span className="font-mono font-bold text-emerald-600">₹{user.balance.toFixed(2)}</span>
                 </div>
             )}
             <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-4 py-2 rounded-full border border-brand-100 whitespace-nowrap shadow-sm tracking-wide uppercase">
                ✨ Official Price List
             </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;