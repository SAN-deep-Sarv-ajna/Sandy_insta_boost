import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  Calculator, 
  List, 
  Menu, 
  Zap,
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
  Lock,
  Package,
  Crown,
  MapPin,
  ChevronRight
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
  const { user, signInWithGoogle, logout, isAdmin } = useAuth();

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
  ];

  if (user) {
    navItems.push({ name: 'My Orders', path: '/my-orders', icon: Package });
    navItems.push({ name: 'Add Funds', path: '/add-funds', icon: Wallet });
  }

  navItems.push({ name: 'Track Order', path: '/track', icon: Activity });

  if (isAdmin) {
      navItems.push({ name: 'Order Queue', path: '/admin/orders', icon: ListOrdered });
      navItems.push({ name: 'Funds Approvals', path: '/admin/transactions', icon: ShieldAlert });
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex relative font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900 overflow-hidden">
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] text-slate-300 transform transition-transform duration-300 ease-out shadow-2xl lg:shadow-none border-r border-slate-800 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800/80 bg-[#0f172a] justify-between shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10 text-white">
              <Zap size={20} className="fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight">SocialBoost</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors p-1 bg-slate-800/50 rounded-lg">
             <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          
          {/* User Profile Card */}
          <div className={`rounded-xl p-4 transition-all duration-300 relative overflow-hidden group ${isAdmin ? 'bg-indigo-950/30 border border-indigo-500/20' : 'bg-slate-800/40 border border-slate-700/50'}`}>
            {user ? (
                <div className="space-y-4 relative z-10">
                   <div className="flex items-center gap-3">
                       <img src={user.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-sm" />
                       <div className="overflow-hidden">
                           <p className="text-white font-bold text-sm truncate flex items-center gap-2">
                             {user.displayName?.split(' ')[0] || 'Client'}
                             {isAdmin && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm flex items-center gap-1"><Crown size={8} fill="currentColor" /> Admin</span>}
                           </p>
                           <p className="text-slate-400 text-xs truncate">{user.email}</p>
                       </div>
                   </div>
                   
                   <div className="bg-slate-950/60 rounded-lg p-3 flex justify-between items-center border border-slate-800/50">
                       <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Balance</span>
                       <span className="text-emerald-400 font-bold font-mono tracking-tight">₹{user.balance.toFixed(2)}</span>
                   </div>

                   <button onClick={logout} className="w-full text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2 py-2 hover:bg-slate-800 rounded-lg transition-all font-medium border border-transparent hover:border-slate-700">
                       <LogOut size={14} /> Sign Out
                   </button>
                </div>
            ) : (
                <div className="text-center py-2">
                    <p className="text-xs text-slate-400 mb-3 font-medium">Access your dashboard</p>
                    <button 
                      onClick={signInWithGoogle}
                      className="w-full bg-white text-slate-900 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
                    >
                       <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="G" />
                       Login / Signup
                    </button>
                </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                    ${isActive 
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                  `}
                >
                  <Icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`} />
                  <span className="flex-1">{item.name}</span>
                  {(item.name === 'Funds Approvals' || item.name === 'Order Queue') && (
                     <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                  )}
                  {isActive && <ChevronRight size={14} className="opacity-50" />}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/50 bg-[#0f172a] shrink-0">
          <Link to="/add-funds" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] ring-1 ring-white/10 group">
              <Wallet size={18} className="group-hover:scale-110 transition-transform" />
              <span className="tracking-tight text-sm">Add Funds</span>
          </Link>
          
          <div className="mt-4 flex items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-300">
             <MapPin size={10} className="text-brand-400" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">East Champaran (Bihar)</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        <header className="h-20 bg-white/90 border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-200">
                <Menu size={24} />
            </button>
            <div className={`flex-1 font-bold text-slate-800 transition-opacity duration-300 ${isSidebarOpen ? 'lg:opacity-0 lg:pointer-events-none block' : 'opacity-100'}`}>
                <span className="lg:hidden text-lg tracking-tight">SocialBoost</span>
                <span className="hidden lg:inline-flex items-center gap-2 text-xl tracking-tight">
                    SocialBoost IN
                </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
             {user && (
                 <div className="hidden sm:flex flex-col items-end mr-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Balance</span>
                     <span className="font-mono font-bold text-emerald-600">₹{user.balance.toFixed(2)}</span>
                 </div>
             )}
             <span className="hidden md:inline-flex text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 whitespace-nowrap tracking-wide uppercase items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Official Provider
             </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;