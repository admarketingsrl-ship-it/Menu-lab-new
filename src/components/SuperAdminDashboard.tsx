import React, { useState } from 'react';
import { 
  ShieldAlert, Building2, Calendar, DollarSign, Plus, Edit3, CheckCircle, 
  AlertTriangle, ArrowLeft, KeyRound, Copy, Eye, EyeOff, Lock, Unlock, 
  Trash2, RefreshCw, Clock, Check, AlertCircle, Sparkles, ExternalLink, QrCode, ShoppingBag
} from 'lucide-react';
import { RestaurantInfo, SubscriptionInfo } from '../types';
import { 
  getStoredRestaurantsList, saveStoredRestaurantsList, 
  setCurrentRestaurantId, resetToDefaultRestaurants,
  saveStoredDishes, saveStoredCategories
} from '../services/store';
import { createStarterDishesForRestaurant, DEFAULT_STARTER_CATEGORIES } from '../data/initialData';
import { realtimeManager } from '../services/realtime';

interface SuperAdminDashboardProps {
  onBackToApp: () => void;
  onSelectRestaurant: (restaurantId: string) => void;
  onNavigateView?: (view: 'landing' | 'menu' | 'admin' | 'superadmin') => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onBackToApp, onSelectRestaurant, onNavigateView }) => {
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const [restaurants, setRestaurants] = useState<RestaurantInfo[]>(getStoredRestaurantsList());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Password visibility map (restaurant id -> boolean)
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<RestaurantInfo | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234' || pin === 'superadmin' || pin === 'agency' || pin === '') {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('PIN non valido. Usa "1234" o clicca su Accesso Rapido.');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copiata negli appunti!`);
    }
  };

  // Quick toggle access state (Attivo <-> Scaduto/Sospeso)
  const handleToggleAccess = (restId: string) => {
    const updated = restaurants.map(r => {
      if (r.id === restId) {
        const isCurrentlyActive = r.subscription?.status === 'Attivo' && new Date(r.subscription.endDate) >= new Date();
        const newStatus = isCurrentlyActive ? 'Scaduto' : 'Attivo';
        
        // If reactivating, ensure endDate is at least 30 days in the future
        let newEndDate = r.subscription?.endDate || new Date().toISOString().split('T')[0];
        if (newStatus === 'Attivo' && new Date(newEndDate) < new Date()) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 30);
          newEndDate = futureDate.toISOString().split('T')[0];
        }

        return {
          ...r,
          subscription: {
            planName: r.subscription?.planName || 'Abbonamento Mensile Pro',
            monthlyFee: r.subscription?.monthlyFee || 49,
            endDate: newEndDate,
            status: newStatus as any,
          }
        };
      }
      return r;
    });

    setRestaurants(updated);
    saveStoredRestaurantsList(updated);
    showToast('Stato accesso e abbonamento aggiornato!');
  };

  // Toggle Table Ordering Mode
  const handleToggleTableOrdering = (restId: string) => {
    const updated = restaurants.map(r => {
      if (r.id === restId) {
        const nextVal = !r.tableOrderingEnabled;
        const updatedRest = {
          ...r,
          tableOrderingEnabled: nextVal,
          subscription: {
            ...r.subscription!,
            tableOrderingEnabled: nextVal,
          }
        };
        realtimeManager.broadcastRestaurant(updatedRest);
        return updatedRest;
      }
      return r;
    });

    setRestaurants(updated);
    saveStoredRestaurantsList(updated);
    showToast('Modalità ordine dal tavolo aggiornata per il locale!');
  };

  // Quick +30 days extension
  const handleAdd30Days = (restId: string) => {
    const updated = restaurants.map(r => {
      if (r.id === restId) {
        const baseDate = (r.subscription?.endDate && new Date(r.subscription.endDate) > new Date())
          ? new Date(r.subscription.endDate)
          : new Date();
        baseDate.setDate(baseDate.getDate() + 30);
        const newEndDate = baseDate.toISOString().split('T')[0];

        return {
          ...r,
          subscription: {
            planName: r.subscription?.planName || 'Abbonamento Mensile Pro',
            monthlyFee: r.subscription?.monthlyFee || 49,
            endDate: newEndDate,
            status: 'Attivo' as const,
          }
        };
      }
      return r;
    });

    setRestaurants(updated);
    saveStoredRestaurantsList(updated);
    showToast('Abbonamento esteso di +30 giorni!');
  };

  // Delete restaurant
  const handleDeleteClient = (restId: string, name: string) => {
    if (confirm(`Sei sicuro di voler eliminare il cliente "${name}"? Questa operazione cancellerà anche i relativi menu.`)) {
      const updated = restaurants.filter(r => r.id !== restId);
      setRestaurants(updated);
      saveStoredRestaurantsList(updated);
      showToast(`Cliente "${name}" eliminato.`);
    }
  };

  // Create new client form submit
  const handleCreateClientSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    if (!name) return;

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString().slice(-4);
    const adminEmail = (formData.get('adminEmail') as string).trim() || `admin@${id}.it`;
    const adminPassword = (formData.get('adminPassword') as string).trim() || 'pass123';
    const planName = formData.get('planName') as string || 'Abbonamento Mensile Pro';
    const monthlyFee = Number(formData.get('monthlyFee')) || 49;
    const endDate = formData.get('endDate') as string || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const address = (formData.get('address') as string).trim() || 'Via Roma 1, Centro';
    const phone = (formData.get('phone') as string).trim() || '+39 081 000 0000';
    const menuTheme = (formData.get('menuTheme') as 'standard' | 'casual' | 'luxury') || 'standard';
    const menuThemeBackground = (formData.get('menuThemeBackground') as 'white' | 'black') || 'white';

    const newRest: RestaurantInfo = {
      id,
      name,
      tagline: 'Tradizione e passione culinaria.',
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80',
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      address,
      phone,
      email: adminEmail,
      adminEmail,
      adminPassword,
      isOpen: true,
      openingHours: '12:00 - 15:00 | 19:30 - 23:30',
      currency: '€',
      googleReviewUrl: '',
      tripAdvisorUrl: '',
      tables: ['Tavolo 1'],
      menuTheme,
      menuThemeBackground,
      subscription: {
        planName,
        monthlyFee,
        endDate,
        status: 'Attivo',
      },
      promoPopup: {
        title: `Benvenuto da ${name}!`,
        subtitle: 'Approfitta del 10% di sconto sul primo ordine al tavolo.',
        couponCode: 'BENVENUTO10',
        active: true,
      },
      coupons: [
        { id: `c_${Date.now()}`, code: 'BENVENUTO10', discountPercent: 10, description: 'Sconto di benvenuto', active: true }
      ]
    };

    const updated = [newRest, ...restaurants];
    setRestaurants(updated);
    saveStoredRestaurantsList(updated);

    // Initialize empty dishes menu and clean initial categories for this new client
    saveStoredDishes([], id);
    saveStoredCategories(['Antipasti', 'Primi', 'Secondi', 'Pizze', 'Dessert', 'Bevande'], id);
    realtimeManager.broadcastRestaurant(newRest);
    realtimeManager.broadcastDishes([], id);

    setIsCreateModalOpen(false);
    showToast(`Nuovo ristorante "${name}" creato con successo! Il suo menu è pronto e vuoto.`);
  };

  // Edit client modal submit
  const handleEditClientSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient) return;

    const formData = new FormData(e.currentTarget);
    const adminEmail = (formData.get('adminEmail') as string).trim();
    const adminPassword = (formData.get('adminPassword') as string).trim();
    const planName = formData.get('planName') as string;
    const monthlyFee = Number(formData.get('monthlyFee')) || 49;
    const endDate = formData.get('endDate') as string;
    const status = formData.get('status') as 'Attivo' | 'In Scadenza' | 'Scaduto';
    const menuTheme = (formData.get('menuTheme') as 'standard' | 'casual' | 'luxury') || 'standard';
    const menuThemeBackground = (formData.get('menuThemeBackground') as 'white' | 'black') || 'white';

    const updated = restaurants.map(r => {
      if (r.id === editingClient.id) {
        const updatedRest = {
          ...r,
          adminEmail,
          adminPassword,
          menuTheme,
          menuThemeBackground,
          subscription: {
            planName,
            monthlyFee,
            endDate,
            status,
          }
        };
        realtimeManager.broadcastRestaurant(updatedRest);
        return updatedRest;
      }
      return r;
    });

    setRestaurants(updated);
    saveStoredRestaurantsList(updated);
    setEditingClient(null);
    showToast(`Credenziali e abbonamento di "${editingClient.name}" aggiornati!`);
  };

  const handleResetDemoData = () => {
    if (confirm('Vuoi ripristinare i clienti demo dell\'agenzia con le relative credenziali e abbonamenti?')) {
      const resetList = resetToDefaultRestaurants();
      setRestaurants(resetList);
      showToast('Dati demo agenzia ripristinati con successo!');
    }
  };

  // Filter calculations
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (r.adminEmail && r.adminEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          r.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isExpired = r.subscription?.status === 'Scaduto' || (r.subscription && new Date(r.subscription.endDate) < new Date());
    
    if (statusFilter === 'active') return matchesSearch && !isExpired;
    if (statusFilter === 'expired') return matchesSearch && isExpired;
    return matchesSearch;
  });

  const totalClients = restaurants.length;
  const activeClients = restaurants.filter(r => r.subscription?.status === 'Attivo' && new Date(r.subscription.endDate) >= new Date()).length;
  const expiredClients = totalClients - activeClients;
  const totalMRR = restaurants.reduce((acc, r) => {
    const isActive = r.subscription?.status === 'Attivo' && new Date(r.subscription.endDate) >= new Date();
    return acc + (isActive ? (r.subscription?.monthlyFee || 49) : 0);
  }, 0);

  // If locked, render PIN screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-white">
        <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-zinc-800 space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold border border-amber-500/30">
              MenuLab Agency Suite
            </div>
            <h2 className="text-2xl font-black">Area Riservata SuperAdmin</h2>
            <p className="text-xs text-zinc-400">
              Pannello agenzia per la gestione dei ristoranti clienti, credenziali di accesso e scadenze abbonamenti mensili.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              placeholder="Inserisci PIN (es. 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-center text-lg tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
            
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Accedi al Pannello Agenzia
            </button>

            <button
              type="button"
              onClick={() => { setPin('1234'); setIsUnlocked(true); }}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              ⚡ Accesso Rapido Demo (PIN: 1234)
            </button>
          </form>

          <button
            onClick={onBackToApp}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-block"
          >
            ← Torna al Menu / Sito Ristorante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-zinc-950 px-6 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* SuperAdmin Top Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 sm:px-8 sticky top-0 z-30 backdrop-blur-md bg-zinc-900/95">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/25">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">MenuLab Agency Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-zinc-950">
                  SUPERADMIN
                </span>
              </div>
              <p className="text-xs text-zinc-400">Controllo centralizzato clienti, credenziali e blocco/sblocco abbonamenti mensili</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuovo Cliente Ristorante
            </button>

            <button
              onClick={handleResetDemoData}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              title="Reimposta i dati di esempio"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Demo
            </button>

            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Torna al Sito Pubblico
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* Dedicated Secret Agency URL Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-zinc-900/40 p-5 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-zinc-950 uppercase tracking-wide">
                Link Segreto Riservato Agenzia
              </span>
              <span className="text-xs text-amber-400 font-bold">Invisibile sul sito pubblico</span>
            </div>
            <p className="text-xs text-zinc-300">
              Salva questo URL nei segnalibri del browser per accedere alla gestione clienti, credenziali e scadenze mensili in qualsiasi momento.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <code className="text-xs font-mono text-amber-300 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800 break-all select-all">
                {typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?view=superadmin` : '?view=superadmin'}
              </code>
            </div>
          </div>

          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?view=superadmin`;
              copyToClipboard(url, 'Link Riservato Agenzia');
            }}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            Copia Link Agenzia
          </button>
        </div>
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Clienti Totali</p>
              <Building2 className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-3xl font-black mt-2 text-white">{totalClients}</h3>
            <p className="text-xs text-zinc-400 mt-1">Locali registrati nella piattaforma</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Abbonamenti Attivi</p>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black mt-2 text-emerald-400">{activeClients}</h3>
            <p className="text-xs text-emerald-500/80 mt-1">Accesso al portale autorizzato</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Scaduti o Sospesi</p>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-3xl font-black mt-2 text-red-400">{expiredClients}</h3>
            <p className="text-xs text-red-500/80 mt-1">Accesso admin bloccato</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fatturato MRR</p>
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-3xl font-black mt-2 text-amber-400">€{totalMRR}/mese</h3>
            <p className="text-xs text-zinc-400 mt-1">Ricavi ricorrenti dai canoni</p>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <input
            type="text"
            placeholder="Cerca cliente per nome, email o indirizzo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-400 hidden sm:inline">Filtra:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Tutti ({restaurants.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Attivi ({activeClients})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'expired' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Scaduti / Bloccati ({expiredClients})
            </button>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/60 text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                  <th className="p-4">Ristorante / Cliente</th>
                  <th className="p-4">Credenziali Accesso Admin</th>
                  <th className="p-4">Piano & Canone</th>
                  <th className="p-4">Data Fine Abbonamento</th>
                  <th className="p-4 text-center">Stato Portale</th>
                  <th className="p-4 text-center">Ordine dal Tavolo</th>
                  <th className="p-4 text-right">Azioni Agenzia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs">
                {filteredRestaurants.map((rest) => {
                  const isPasswordVisible = !!showPasswordMap[rest.id];
                  const endDateObj = rest.subscription ? new Date(rest.subscription.endDate) : new Date();
                  const isExpired = (rest.subscription?.status === 'Scaduto') || (endDateObj < new Date());
                  
                  // Calculate days remaining
                  const diffTime = endDateObj.getTime() - new Date().getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={rest.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* Ristorante */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={rest.logo} alt="" className="w-12 h-12 rounded-xl object-cover border border-zinc-700 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-white text-sm">{rest.name}</p>
                            <p className="text-[11px] text-zinc-400 line-clamp-1">{rest.address}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-zinc-500 font-mono">ID: {rest.id}</span>
                              {rest.menuTheme === 'casual' && (
                                <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-bold border border-red-500/30">
                                  🍕 Casual
                                </span>
                              )}
                              {rest.menuTheme === 'luxury' && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30 font-serif">
                                  ✨ Lusso
                                </span>
                              )}
                              {(!rest.menuTheme || rest.menuTheme === 'standard') && (
                                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[9px] font-bold border border-zinc-700">
                                  Standard
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Credenziali Admin */}
                      <td className="p-4">
                        <div className="space-y-1.5 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800 max-w-[220px]">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-zinc-400 font-semibold">User:</span>
                            <span className="font-mono text-[11px] text-zinc-200 truncate">{rest.adminEmail || 'admin@menulab.it'}</span>
                            <button
                              onClick={() => copyToClipboard(rest.adminEmail || 'admin@menulab.it', 'Email')}
                              className="text-zinc-400 hover:text-amber-400 p-0.5"
                              title="Copia Email"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 font-semibold">Pass:</span>
                            <span className="font-mono text-[11px] text-amber-400">
                              {isPasswordVisible ? (rest.adminPassword || 'admin123') : '••••••••'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => togglePasswordVisibility(rest.id)}
                                className="text-zinc-400 hover:text-white p-0.5"
                                title={isPasswordVisible ? 'Nascondi' : 'Mostra'}
                              >
                                {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(rest.adminPassword || 'admin123', 'Password')}
                                className="text-zinc-400 hover:text-amber-400 p-0.5"
                                title="Copia Password"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Piano & Canone */}
                      <td className="p-4">
                        <p className="font-bold text-zinc-200">{rest.subscription?.planName || 'Mensile Pro'}</p>
                        <p className="text-amber-400 font-black text-sm">€{rest.subscription?.monthlyFee || 49}/mese</p>
                      </td>

                      {/* Scadenza & Giorni */}
                      <td className="p-4 font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>{rest.subscription?.endDate || '2026-12-31'}</span>
                          </div>

                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-950 text-red-400 border border-red-800 animate-pulse">
                              <AlertCircle className="w-3 h-3" />
                              SCADUTO ({Math.abs(diffDays)} gg fa)
                            </span>
                          ) : diffDays <= 7 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-800">
                              <Clock className="w-3 h-3" />
                              In scadenza ({diffDays} gg)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              <Check className="w-3 h-3" />
                              Attivo ({diffDays} gg)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stato Portale (Toggle) */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleAccess(rest.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            !isExpired
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                          }`}
                          title="Clicca per invertire lo stato dell'accesso"
                        >
                          {!isExpired ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {!isExpired ? 'Accesso Attivo' : 'Accesso Bloccato'}
                        </button>
                      </td>

                      {/* Ordine dal Tavolo (Toggle) */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleTableOrdering(rest.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            rest.tableOrderingEnabled
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                          }`}
                          title="Sblocca l'invio ordini diretto dal QR code tavolo per questo cliente"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {rest.tableOrderingEnabled ? 'Sbloccato' : 'Disattivato'}
                        </button>
                      </td>

                      {/* Azioni */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAdd30Days(rest.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-bold border border-zinc-700 transition-colors"
                            title="Aggiungi 30 giorni all'abbonamento"
                          >
                            +30gg
                          </button>

                          <button
                            onClick={() => setEditingClient(rest)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                            title="Modifica Credenziali e Abbonamento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              const adminUrl = `${window.location.origin}${window.location.pathname}?view=admin&restaurant=${encodeURIComponent(rest.id)}`;
                              copyToClipboard(adminUrl, `Link Dashboard ${rest.name}`);
                            }}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 border border-zinc-700 transition-colors"
                            title="Copia Link Diretto Gestionale per questo Cliente"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              sessionStorage.setItem('menulab_admin_authed_rest', rest.id);
                              setCurrentRestaurantId(rest.id);
                              onSelectRestaurant(rest.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                            title="Entra e gestisci come questo ristorante"
                          >
                            <span>Dashboard</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>

                          <a
                            href={`${window.location.origin}${window.location.pathname}?view=menu&restaurant=${encodeURIComponent(rest.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 border border-zinc-700 transition-colors"
                            title="Apri Menu Digitale e QR del Ristorante"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleDeleteClient(rest.id, rest.name)}
                            className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors"
                            title="Elimina Cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: NUOVO CLIENTE RISTORANTE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div 
            className="bg-zinc-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-zinc-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Nuovo Ristorante Cliente</h3>
                <p className="text-xs text-zinc-400">Crea il locale, genera le credenziali di accesso e imposta la scadenza dell'abbonamento</p>
              </div>
            </div>

            <form onSubmit={handleCreateClientSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Nome del Locale / Ristorante *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Es. Trattoria Da Mario"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Indirizzo</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Es. Via Toledo 45, Napoli"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Telefono</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Es. +39 081 1234567"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Credenziali di Accesso */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <p className="text-xs font-black uppercase text-amber-400 tracking-wider">Credenziali di Accesso Admin</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Email di Accesso *</label>
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      placeholder="admin@damario.it"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Password di Accesso *</label>
                    <input
                      type="text"
                      name="adminPassword"
                      required
                      defaultValue="mario2026"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Layout Grafico Menu per il Cliente */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <p className="text-xs font-black uppercase text-amber-400 tracking-wider">Layout Grafico & Colore Sfondo</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Layout Grafico</label>
                    <select
                      name="menuTheme"
                      defaultValue="standard"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="standard">Standard (Design Pulito con Riquadri)</option>
                      <option value="casual">Casual / Pizzeria & Paninoteca (Pop & Colorato)</option>
                      <option value="luxury">Ristorante di Lusso (Dark & Dettagli Oro)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Sfondo Layout (Standard)</label>
                    <select
                      name="menuThemeBackground"
                      defaultValue="white"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="white">⚪ White (Sfondo Chiaro / Bianco)</option>
                      <option value="black">🌑 Black (Sfondo Scuro / Nero)</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">I testi e le schede dei piatti si adattano automaticamente al colore dello sfondo scelto.</p>
              </div>

              {/* Abbonamento Mensile */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <p className="text-xs font-black uppercase text-amber-400 tracking-wider">Configurazione Abbonamento</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Piano</label>
                    <select
                      name="planName"
                      defaultValue="Abbonamento Mensile Pro"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Abbonamento Mensile Base">Mensile Base</option>
                      <option value="Abbonamento Mensile Pro">Mensile Pro</option>
                      <option value="Abbonamento Annuale VIP">Annuale VIP</option>
                      <option value="Trial Gratuito 14gg">Trial Gratuito</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Canone (€/mese)</label>
                    <input
                      type="number"
                      name="monthlyFee"
                      defaultValue={49}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Data Fine Abbonamento *</label>
                    <input
                      type="date"
                      name="endDate"
                      required
                      defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/25"
                >
                  Crea Ristorante & Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFICA CLIENTE & CREDENZIALI */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div 
            className="bg-zinc-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-zinc-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <img src={editingClient.logo} alt="" className="w-12 h-12 rounded-xl object-cover border border-zinc-700" />
              <div>
                <h3 className="text-xl font-black text-white">Modifica Cliente</h3>
                <p className="text-xs text-zinc-400">{editingClient.name}</p>
              </div>
            </div>

            <form onSubmit={handleEditClientSubmit} className="space-y-4">
              
              {/* Credenziali */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <p className="text-xs font-black uppercase text-amber-400 tracking-wider">Credenziali di Accesso</p>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">Email Admin</label>
                  <input
                    type="email"
                    name="adminEmail"
                    required
                    defaultValue={editingClient.adminEmail || 'admin@menulab.it'}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">Password Admin</label>
                  <input
                    type="text"
                    name="adminPassword"
                    required
                    defaultValue={editingClient.adminPassword || 'admin123'}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Abbonamento */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <p className="text-xs font-black uppercase text-amber-400 tracking-wider">Gestione Abbonamento & Scadenza</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Piano</label>
                    <input
                      type="text"
                      name="planName"
                      defaultValue={editingClient.subscription?.planName || 'Abbonamento Mensile Pro'}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Canone Mensile (€)</label>
                    <input
                      type="number"
                      name="monthlyFee"
                      defaultValue={editingClient.subscription?.monthlyFee || 49}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">Data Fine Abbonamento</label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    defaultValue={editingClient.subscription?.endDate || '2026-12-31'}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Layout Menu Digitale</label>
                    <select
                      name="menuTheme"
                      defaultValue={editingClient.menuTheme || 'standard'}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="standard">Standard (Design Pulito con Riquadri)</option>
                      <option value="casual">Casual / Pizzeria & Paninoteca (Pop & Colorato)</option>
                      <option value="luxury">Ristorante di Lusso (Dark & Dettagli Oro)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Sfondo Menu (Standard)</label>
                    <select
                      name="menuThemeBackground"
                      defaultValue={editingClient.menuThemeBackground || 'white'}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="white">⚪ White (Sfondo Chiaro / Bianco)</option>
                      <option value="black">`🌑` Black (Sfondo Scuro / Nero)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">Stato Accesso</label>
                  <select
                    name="status"
                    defaultValue={editingClient.subscription?.status || 'Attivo'}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Attivo">Attivo (Accesso Abilitato)</option>
                    <option value="In Scadenza">In Scadenza</option>
                    <option value="Scaduto">Scaduto (Accesso Bloccato)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/25"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
