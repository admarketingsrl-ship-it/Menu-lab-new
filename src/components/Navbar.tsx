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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              MenuLab
            </span>
            <span className="block text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">
              {restaurantName}
            </span>
          </div>
        </div>

        {/* Navigation Switches */}
        <nav className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
          <button
            onClick={() => onNavigate('landing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'landing'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home SaaS</span>
          </button>

          <button
            onClick={() => onNavigate('menu')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'menu'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-500" />
            <span>Menu Cliente (QR)</span>
          </button>

          <button
            onClick={() => onNavigate('admin')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'admin'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-orange-500" />
            <span>Dashboard Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
