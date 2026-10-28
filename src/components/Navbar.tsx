import React from 'react';
import { UtensilsCrossed, LayoutDashboard, Home, QrCode } from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'menu' | 'admin' | 'superadmin';
  onNavigate: (view: 'landing' | 'menu' | 'admin' | 'superadmin') => void;
  restaurantName: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, restaurantName }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent block leading-tight">
              MenuLab
            </span>
            <span className="block text-[9px] sm:text-[10px] font-semibold text-zinc-400 tracking-wider uppercase truncate max-w-[90px] sm:max-w-[160px]">
              {restaurantName}
            </span>
          </div>
        </div>

        {/* Navigation Switches */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 sm:p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 flex-shrink-0">
          <button
            onClick={() => onNavigate('landing')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'landing'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Home SaaS"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">Home</span>
          </button>

          <button
            onClick={() => onNavigate('menu')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'menu'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Menu Cliente"
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            <span className="hidden sm:inline">Menu (QR)</span>
            <span className="sm:hidden">Menu</span>
          </button>

          <button
            onClick={() => onNavigate('admin')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'admin'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Dashboard Admin"
          >
            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
            <span className="hidden sm:inline">Dashboard Admin</span>
            <span className="sm:hidden">Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
