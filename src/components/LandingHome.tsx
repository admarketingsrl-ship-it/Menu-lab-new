import React from 'react';
import { QrCode, LayoutDashboard, FileSpreadsheet, Bell, Smartphone, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { RestaurantInfo } from '../types';

interface LandingHomeProps {
  onNavigate: (view: 'landing' | 'menu' | 'admin' | 'superadmin') => void;
  restaurant: RestaurantInfo;
}

export const LandingHome: React.FC<LandingHomeProps> = ({ onNavigate, restaurant }) => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pt-16 pb-24 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold mb-6 border border-amber-500/20">
            <Sparkles className="w-4 h-4" />
            La Piattaforma SaaS n.1 per la Ristorazione Moderna
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-none mb-6">
            Rivoluziona il tuo locale con <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">MenuLab</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Menu digitale interattivo via QR Code al tavolo, gestione ordini in tempo reale, importazione istantanea da Excel e pannello di controllo per ristoranti, pizzerie e bar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('menu')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-base flex items-center justify-center gap-3 shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Smartphone className="w-5 h-5" />
              Menu Cliente (QR)
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('admin')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-extrabold text-base flex items-center justify-center gap-3 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard Ristoratore
            </button>
          </div>

          {/* Active Demo Restaurant Badge */}
          <div className="mt-12 inline-flex items-center gap-3 bg-white dark:bg-zinc-900 px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <img src={restaurant.logo} alt={restaurant.name} className="w-8 h-8 rounded-xl object-cover" />
            <div className="text-left">
              <p className="text-xs text-zinc-400 font-medium">Locale di Dimostrazione Attivo</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{restaurant.name}</p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ml-4" />
          </div>

        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black tracking-tight mb-4">Tutto ciò di cui hai bisogno per la sala e la cucina</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-base">
            Progettato per offrire un'esperienza utente impeccabile ai clienti e massima efficienza operativa allo staff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <QrCode className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Menu Digitale QR al Tavolo</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
              I clienti scansionano il QR code dal tavolo e sfogliano il menu con foto in alta definizione, filtri per allergeni e preferenze dietetiche (vegan, gluten-free).
            </p>
            <button 
              onClick={() => onNavigate('menu')}
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Apri menu cliente ➔
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Importazione Istantanea Excel</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
              Aggiorna l'intero menu, i prezzi e le disponibilità in un solo secondo caricando un file `.xlsx` formattato con SheetJS.
            </p>
            <button 
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Vai al pannello admin ➔
            </button>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Chiamata Cameriere & Conto</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
              I clienti possono chiamare il cameriere o chiedere il conto direttamente dallo smartphone, con notifiche in tempo reale sulla dashboard della cassa.
            </p>
            <button 
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Gestisci tavoli ➔
            </button>
          </div>

        </div>
      </div>

      {/* Highlights Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
              <Zap className="w-4 h-4" />
              Pronto per la produzione
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Porta il tuo ristorante nel futuro digitale</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Zero commissioni sugli ordini, massima velocità per i tuoi clienti e un pannello admin completo per gestire tutto in autonomia.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button
              onClick={() => onNavigate('menu')}
              className="px-8 py-4 rounded-2xl bg-white text-zinc-900 font-black text-sm hover:bg-zinc-100 transition-colors shadow-lg text-center"
            >
              Apri Menu Cliente
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className="px-8 py-4 rounded-2xl bg-black/30 hover:bg-black/50 text-white font-black text-sm border border-white/20 transition-colors text-center"
            >
              Accedi Admin
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
