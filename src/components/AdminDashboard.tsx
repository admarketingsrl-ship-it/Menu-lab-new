import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, UtensilsCrossed, FileSpreadsheet, Bell, QrCode, Settings, 
  Plus, Edit3, Trash2, CheckCircle, AlertCircle, LogOut, Search, Sparkles, 
  Check, Save, RefreshCw, Printer, ShieldCheck, ShieldAlert, HardDrive, CloudUpload, DownloadCloud, Tag, Percent, Copy, ExternalLink,
  Volume2, VolumeX, Radio, CheckSquare, BellRing, Receipt, ShoppingBag, Utensils
} from 'lucide-react';
import { Dish, RestaurantInfo, WaiterCall, ReviewItem, CouponCode, TableOrder } from '../types';
import { 
  getStoredDishes, saveStoredDishes, 
  getStoredRestaurant, saveStoredRestaurant, 
  getStoredCategories, saveStoredCategories,
  getStoredWaiterCalls, saveStoredWaiterCalls,
  getStoredTableOrders, saveStoredTableOrders,
  getStoredReviews, getStoredRestaurantsList, setCurrentRestaurantId 
} from '../services/store';
import { ExcelImportModal } from './ExcelImportModal';
import { googleSignInWithDrive, getAccessToken, logoutUser, initAuth } from '../services/firebase';
import { exportMenuToGoogleDrive, listMenuBackupsFromGoogleDrive, downloadMenuFromGoogleDrive, DriveFileItem } from '../services/drive';
import { soundService } from '../services/sound';
import { realtimeManager } from '../services/realtime';
import { User } from 'firebase/auth';

interface AdminDashboardProps {
  onNavigateToSuperAdmin?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToSuperAdmin }) => {
  const getInitialAdminRest = (): RestaurantInfo => {
    try {
      const params = new URLSearchParams(window.location.search);
      const restParam = params.get('restaurant') || params.get('r') || params.get('rest');
      return getStoredRestaurant(restParam || undefined);
    } catch {
      return getStoredRestaurant();
    }
  };

  const initialRest = getInitialAdminRest();
  const allRestaurants = getStoredRestaurantsList();

  // Data states dynamically scoped to this restaurant
  const [restaurant, setRestaurant] = useState<RestaurantInfo>(initialRest);
  const [dishes, setDishes] = useState<Dish[]>(() => getStoredDishes(initialRest.id));
  const [categories, setCategories] = useState<string[]>(() => getStoredCategories(initialRest.id));
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>(() => getStoredWaiterCalls(initialRest.id));
  const [tableOrders, setTableOrders] = useState<TableOrder[]>(() => getStoredTableOrders(initialRest.id));
  const [reviews] = useState<ReviewItem[]>(getStoredReviews());

  // Check if session has active admin token for this restaurant
  const isAutoAuthed = typeof window !== 'undefined' && sessionStorage.getItem('menulab_admin_authed_rest') === initialRest.id;
  const [isLoggedIn, setIsLoggedIn] = useState(isAutoAuthed);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Google Drive & Firebase Auth user state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState<string | null>(null);
  const [driveErrorMsg, setDriveErrorMsg] = useState<string | null>(null);

  // Active admin tab
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'calls' | 'qr' | 'drive' | 'coupons' | 'settings'>('overview');

  // Category addition & filter state
  const [filterCategory, setFilterCategory] = useState<string>('Tutte');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // New Table Input State
  const [newTableName, setNewTableName] = useState('');
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Modal for Excel Import
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Dish Editor Modal / Form state
  const [editingDish, setEditingDish] = useState<Partial<Dish> | null>(null);
  const [isDishFormOpen, setIsDishFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Coupon Form state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newDiscountPercent, setNewDiscountPercent] = useState(10);
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // Audio and Realtime Alert State
  const [isSoundMuted, setIsSoundMuted] = useState(soundService.getIsMuted());
  const [activeCallAlert, setActiveCallAlert] = useState<WaiterCall | null>(null);
  const [activeOrderAlert, setActiveOrderAlert] = useState<TableOrder | null>(null);
  const [soundTestToast, setSoundTestToast] = useState(false);

  // Switch restaurant helper
  const handleSwitchRestaurant = (targetRestId: string) => {
    const found = allRestaurants.find(r => r.id === targetRestId) || getStoredRestaurant(targetRestId);
    if (!found) return;

    setCurrentRestaurantId(found.id);
    sessionStorage.setItem('menulab_admin_authed_rest', found.id);
    setRestaurant(found);
    setDishes(getStoredDishes(found.id));
    setCategories(getStoredCategories(found.id));
    setWaiterCalls(getStoredWaiterCalls(found.id));
    setTableOrders(getStoredTableOrders(found.id));
    setEmail(found.adminEmail || '');
    setPassword(found.adminPassword || '');
    setIsLoggedIn(true);

    const url = new URL(window.location.href);
    url.searchParams.set('view', 'admin');
    url.searchParams.set('restaurant', found.id);
    window.history.replaceState({}, '', url.toString());
  };

  // Sync auth and waiter calls
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time synchronization for Waiter Calls, Table Orders & Menu updates strictly scoped to this restaurant
  useEffect(() => {
    if (!restaurant?.id) return;

    const unsubCalls = realtimeManager.subscribeToCalls((calls, newCall) => {
      setWaiterCalls(calls);
      if (newCall && newCall.status === 'pending') {
        if (newCall.type === 'call_waiter') {
          soundService.playWaiterCallSound();
        } else {
          soundService.playBillRequestSound();
        }
        setActiveCallAlert(newCall);
      }
    }, restaurant.id);

    const unsubOrders = realtimeManager.subscribeToOrders((orders, newOrder) => {
      setTableOrders(orders);
      if (newOrder && newOrder.status === 'pending') {
        soundService.playWaiterCallSound();
        setActiveOrderAlert(newOrder);
      }
    }, restaurant.id);

    const unsubDishes = realtimeManager.subscribeToDishes((liveDishes) => {
      setDishes(liveDishes);
    }, restaurant.id);

    const unsubRest = realtimeManager.subscribeToRestaurant((liveRest) => {
      setRestaurant(liveRest);
    }, restaurant.id);

    return () => {
      unsubCalls();
      unsubOrders();
      unsubDishes();
      unsubRest();
    };
  }, [restaurant?.id]);

  const handleResetTable = (tableNumber: string) => {
    if (confirm(`Vuoi chiudere il conto e resettare il ${tableNumber}? Questo azzererà tutti gli ordini e le chiamate attive per questo tavolo.`)) {
      realtimeManager.resetTable(tableNumber, restaurant.id);
      setTableOrders((prev) => prev.filter((o) => o.tableNumber.toLowerCase() !== tableNumber.toLowerCase()));
      setWaiterCalls((prev) => prev.filter((c) => c.tableNumber.toLowerCase() !== tableNumber.toLowerCase()));
      if (activeOrderAlert?.tableNumber === tableNumber) {
        setActiveOrderAlert(null);
      }
      if (activeCallAlert?.tableNumber === tableNumber) {
        setActiveCallAlert(null);
      }
      setCopyToast(`Conto chiuso e ${tableNumber} resettato con successo!`);
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check credentials across all registered clients
    const matched = allRestaurants.find(
      (r) => (r.adminEmail?.toLowerCase() === cleanEmail && r.adminPassword === cleanPass)
    ) || (cleanEmail === (restaurant.adminEmail?.toLowerCase() || 'admin@bellanapoli.it') && cleanPass === (restaurant.adminPassword || 'admin123') ? restaurant : null);

    if (!matched) {
      setLoginError('Credenziali non valide. Verifica email e password del tuo locale.');
      return;
    }

    // Check subscription expiration
    const isExpired = (matched.subscription?.status === 'Scaduto') || 
      (matched.subscription?.endDate && new Date(matched.subscription.endDate) < new Date());

    if (isExpired) {
      setLoginError(`❌ Accesso Sospeso: L'abbonamento per "${matched.name}" è scaduto il ${matched.subscription?.endDate}. Contatta l'agenzia per rinnovare l'accesso.`);
      return;
    }

    // Authenticate and load matched restaurant data
    sessionStorage.setItem('menulab_admin_authed_rest', matched.id);
    setCurrentRestaurantId(matched.id);
    setRestaurant(matched);
    setDishes(getStoredDishes(matched.id));
    setCategories(getStoredCategories(matched.id));
    setWaiterCalls(getStoredWaiterCalls(matched.id));
    setIsLoggedIn(true);
    setLoginError('');

    const url = new URL(window.location.href);
    url.searchParams.set('view', 'admin');
    url.searchParams.set('restaurant', matched.id);
    window.history.replaceState({}, '', url.toString());
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setDriveErrorMsg(null);
    try {
      const res = await googleSignInWithDrive();
      setGoogleUser(res.user);
      setDriveSuccessMsg('Autenticazione Google Drive riuscita!');
      fetchDriveBackups();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDriveErrorMsg(err.message || 'Errore durante il login con Google.');
      } else {
        setDriveErrorMsg('Errore durante il login con Google.');
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const fetchDriveBackups = async () => {
    setDriveLoading(true);
    setDriveErrorMsg(null);
    try {
      const files = await listMenuBackupsFromGoogleDrive();
      setDriveFiles(files);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDriveErrorMsg(err.message || 'Impossibile recuperare i file da Google Drive.');
      } else {
        setDriveErrorMsg('Impossibile recuperare i file da Google Drive.');
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const handleExportToDrive = async () => {
    setDriveLoading(true);
    setDriveErrorMsg(null);
    setDriveSuccessMsg(null);
    try {
      const fileId = await exportMenuToGoogleDrive(restaurant, dishes);
      setDriveSuccessMsg(`Menu salvato con successo su Google Drive! (ID: ${fileId})`);
      fetchDriveBackups();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDriveErrorMsg(err.message || 'Errore durante l\'esportazione su Google Drive.');
      } else {
        setDriveErrorMsg('Errore durante l\'esportazione su Google Drive.');
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const handleRestoreFromDrive = async (fileId: string) => {
    if (!confirm('Vuoi ripristinare il menu da questo backup di Google Drive? I dati attuali verranno aggiornati.')) return;
    setDriveLoading(true);
    setDriveErrorMsg(null);
    try {
      const data = await downloadMenuFromGoogleDrive(fileId);
      if (data.restaurant) {
        setRestaurant(data.restaurant);
        saveStoredRestaurant(data.restaurant);
      }
      if (data.dishes && Array.isArray(data.dishes)) {
        setDishes(data.dishes);
        saveStoredDishes(data.dishes, restaurant.id);
      }
      setDriveSuccessMsg('Menu ripristinato con successo da Google Drive!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDriveErrorMsg(err.message || 'Errore durante il ripristino da Google Drive.');
      } else {
        setDriveErrorMsg('Errore durante il ripristino da Google Drive.');
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish || !editingDish.name || !editingDish.price) return;

    let updated: Dish[];
    if (editingDish.id) {
      updated = dishes.map((d) => (d.id === editingDish.id ? (editingDish as Dish) : d));
    } else {
      const newDish: Dish = {
        id: `${restaurant.id}_dish_${Date.now()}`,
        name: editingDish.name,
        description: editingDish.description || '',
        price: Number(editingDish.price),
        category: editingDish.category || categories[0] || 'Antipasti',
        image: editingDish.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        allergens: editingDish.allergens || [],
        isAvailable: editingDish.isAvailable ?? true,
        isSpecial: editingDish.isSpecial ?? false,
        badges: editingDish.badges || [],
        dietary: editingDish.dietary || [],
      };
      updated = [newDish, ...dishes];
    }

    setDishes(updated);
    saveStoredDishes(updated, restaurant.id);
    realtimeManager.broadcastDishes(updated, restaurant.id);

    setIsDishFormOpen(false);
    setEditingDish(null);
  };

  const handleDeleteDish = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo piatto dal menu di ' + restaurant.name + '?')) {
      const updated = dishes.filter((d) => d.id !== id);
      setDishes(updated);
      saveStoredDishes(updated, restaurant.id);
      realtimeManager.broadcastDishes(updated, restaurant.id);
    }
  };

  const handleToggleAvailability = (id: string) => {
    const updated = dishes.map((d) => (d.id === id ? { ...d, isAvailable: !d.isAvailable } : d));
    setDishes(updated);
    saveStoredDishes(updated, restaurant.id);
    realtimeManager.broadcastDishes(updated, restaurant.id);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCat = newCategoryName.trim();
    if (!cleanCat) return;
    if (categories.some(c => c.toLowerCase() === cleanCat.toLowerCase())) {
      alert('Questa categoria esiste già nel tuo menu.');
      return;
    }
    const updated = [...categories, cleanCat];
    setCategories(updated);
    saveStoredCategories(updated, restaurant.id);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleResolveCall = (id: string) => {
    realtimeManager.resolveWaiterCall(id, restaurant.id);
    if (activeCallAlert?.id === id) {
      setActiveCallAlert(null);
    }
  };

  const handleSaveRestaurantSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredRestaurant(restaurant);
    realtimeManager.broadcastRestaurant(restaurant);
    alert('Impostazioni del locale e layout salvati con successo!');
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    const currentTables = restaurant.tables || ['Tavolo 1', 'Tavolo 2'];
    const formattedName = newTableName.trim().startsWith('Tavolo') || newTableName.trim().startsWith('Terrazza') || newTableName.trim().startsWith('VIP') 
      ? newTableName.trim() 
      : `Tavolo ${newTableName.trim()}`;

    if (currentTables.includes(formattedName)) {
      alert('Questo tavolo esiste già.');
      return;
    }

    const updatedTables = [...currentTables, formattedName];
    const updatedRest = { ...restaurant, tables: updatedTables };
    setRestaurant(updatedRest);
    saveStoredRestaurant(updatedRest);
    setNewTableName('');
  };

  const handleDeleteTable = (tableName: string) => {
    if (confirm(`Vuoi rimuovere il ${tableName}?`)) {
      const updatedTables = (restaurant.tables || []).filter((t) => t !== tableName);
      const updatedRest = { ...restaurant, tables: updatedTables };
      setRestaurant(updatedRest);
      saveStoredRestaurant(updatedRest);
    }
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    const newCoupon: CouponCode = {
      id: `coup_${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountPercent: Number(newDiscountPercent),
      description: newCouponDesc.trim() || `Sconto del ${newDiscountPercent}%`,
      active: true,
    };

    const updatedCoupons = [...(restaurant.coupons || []), newCoupon];
    const updatedRest = { ...restaurant, coupons: updatedCoupons };
    setRestaurant(updatedRest);
    saveStoredRestaurant(updatedRest);
    setNewCouponCode('');
    setNewCouponDesc('');
    alert('Nuovo coupon creato con successo!');
  };

  const handleDeleteCoupon = (id: string) => {
    const updatedCoupons = (restaurant.coupons || []).filter((c) => c.id !== id);
    const updatedRest = { ...restaurant, coupons: updatedCoupons };
    setRestaurant(updatedRest);
    saveStoredRestaurant(updatedRest);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                MenuLab Gestione
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Inserisci le credenziali del tuo locale per accedere al pannello
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-xs text-center font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Email Locale
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="es. admin@tuoristorante.it"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Accedi al Portale</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-zinc-400">
              Accesso riservato e protetto. I dati del tuo locale sono isolati e confidenziali.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingCallsCount = waiterCalls.filter((c) => c.status === 'pending').length;
  const tableList = restaurant.tables || ['Tavolo 1', 'Tavolo 2', 'Tavolo 3', 'Tavolo 4', 'Tavolo 5'];
  const clientAdminUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?view=admin&restaurant=${encodeURIComponent(restaurant.id)}` : '';
  const clientMenuUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?view=menu&restaurant=${encodeURIComponent(restaurant.id)}` : '';

  return (
    <div 
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-20"
      onClick={() => soundService.unlockAudio()}
    >
      
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-zinc-950 px-6 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4" />
          {copyToast}
        </div>
      )}

      {/* Admin Top Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-6 px-4 sm:px-8 sticky top-0 z-30 backdrop-blur-md bg-white/95 dark:bg-zinc-900/95">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <img src={restaurant.logo} alt="Logo" className="w-12 h-12 rounded-2xl object-cover shadow-md border border-zinc-200 dark:border-zinc-700" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black">{restaurant.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  ID: {restaurant.id}
                </span>
                {restaurant.subscription && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    {restaurant.subscription.planName}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Dashboard personalizzata • Menu univoco ({dishes.length} piatti) • {tableList.length} Tavoli configurati
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Copy Direct Dashboard Link */}
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(clientAdminUrl);
                  setCopyToast(`Link Dashboard per ${restaurant.name} copiato negli appunti!`);
                  setTimeout(() => setCopyToast(null), 3000);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              title="Copia link per accedere direttamente a questo gestionale"
            >
              <Copy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Link Gestionale</span>
            </button>

            {/* View Public Menu */}
            <a
              href={clientMenuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="Apri il menu digitale pubblico come lo vedono i clienti"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Menu Pubblico</span>
            </a>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                soundService.unlockAudio();
                const next = !isSoundMuted;
                soundService.setMuted(next);
                setIsSoundMuted(next);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                isSoundMuted 
                  ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 hover:bg-zinc-200' 
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
              title={isSoundMuted ? 'Attiva Suono Notifiche' : 'Silenzia Suono Notifiche'}
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />}
              <span className="hidden md:inline">{isSoundMuted ? 'Muto' : 'Audio Live'}</span>
            </button>

            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="Importa o esporta menu da file Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Excel</span>
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem('menulab_admin_authed_rest');
                setIsLoggedIn(false);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              title="Disconnetti dalla sessione gestionale"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Esci</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Panoramica
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Gestione Menu ({dishes.length})
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
              activeTab === 'calls'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            Chiamate Tavoli
            {pendingCallsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingCallsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            QR Code Tavoli ({tableList.length})
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'drive'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-500" />
            Google Drive Sync
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-500" />
            Coupon & Promo Pop-up
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Impostazioni & Banner
          </button>
        </div>
      </div>

      {/* Sound Test Toast */}
      {soundTestToast && (
        <div className="fixed top-20 right-8 z-50 bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-fadeIn text-xs">
          <Volume2 className="w-4 h-4" />
          Chime di notifica riprodotto con successo!
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        
        {/* Prominent Visual Alert for Incoming Table Orders */}
        {activeOrderAlert && activeOrderAlert.status === 'pending' && (
          <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-pulse border-2 border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
                <ShoppingBag className="w-7 h-7 text-white animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-white/30 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider">
                    🛒 Nuovo Ordine da Tavolo
                  </span>
                  <span className="text-xs text-white/80 font-medium">Inviato dal cliente</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black">
                  {activeOrderAlert.tableNumber}: {activeOrderAlert.items.reduce((a, b) => a + b.quantity, 0)} prodotti • Totale: {activeOrderAlert.totalAmount.toFixed(2)} {restaurant.currency}
                </h3>
                {activeOrderAlert.note && (
                  <p className="text-xs text-amber-200 italic font-medium">
                    Note: "{activeOrderAlert.note}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => {
                  realtimeManager.updateTableOrderStatus(activeOrderAlert.id, 'accepted', restaurant.id);
                  setActiveOrderAlert(null);
                }}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 font-black text-xs shadow-xl transition-all cursor-pointer"
              >
                ✓ Accetta in Cucina
              </button>
              <button
                onClick={() => {
                  setActiveTab('calls');
                  setActiveOrderAlert(null);
                }}
                className="px-4 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Vedi Dettaglio Tavolo
              </button>
              <button
                onClick={() => setActiveOrderAlert(null)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Chiudi Avviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Prominent Visual Alert for Incoming Waiter Calls & Bill Requests */}
        {activeCallAlert && activeCallAlert.status === 'pending' && (
          <div className={`mb-8 p-5 sm:p-6 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-pulse border-2 border-white/20 ${
            activeCallAlert.type === 'call_waiter'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
                {activeCallAlert.type === 'call_waiter' ? (
                  <Bell className="w-7 h-7 text-white animate-bounce" />
                ) : (
                  <Receipt className="w-7 h-7 text-white animate-bounce" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-white/30 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider">
                    {activeCallAlert.type === 'call_waiter' ? '🔔 Nuova Chiamata Cameriere' : '🧾 Nuova Richiesta Conto'}
                  </span>
                  <span className="text-xs text-white/80 font-medium">In arrivo adesso</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black">
                  {activeCallAlert.tableNumber}: {activeCallAlert.message || (activeCallAlert.type === 'call_waiter' ? 'Assistenza al tavolo' : 'Richiesta conto')}
                </h3>
                {activeCallAlert.message && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-white border border-white/30">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                    <span>Da portare subito: "{activeCallAlert.message}"</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => handleResolveCall(activeCallAlert.id)}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 font-black text-xs shadow-xl transition-all"
              >
                ✓ Segna come Risolto
              </button>
              <button
                onClick={() => {
                  setActiveTab('calls');
                  setActiveCallAlert(null);
                }}
                className="px-4 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors"
              >
                Vedi Tutti
              </button>
              <button
                onClick={() => setActiveCallAlert(null)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Chiudi Avviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Piatti nel Menu</p>
                <h3 className="text-3xl font-black mt-2 text-zinc-900 dark:text-white">{dishes.length}</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">Sincronizzati con Firebase</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tavoli Attivi</p>
                <h3 className="text-3xl font-black mt-2 text-amber-600">{tableList.length}</h3>
                <p className="text-xs text-zinc-500 mt-1">QR code configurati</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chiamate Tavoli</p>
                <h3 className="text-3xl font-black mt-2 text-red-500">{pendingCallsCount}</h3>
                <p className="text-xs text-zinc-500 mt-1">In attesa di gestione</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Google Drive Backup</p>
                <h3 className="text-3xl font-black mt-2 text-blue-500">{googleUser ? 'Connesso' : 'Non Connesso'}</h3>
                <p className="text-xs text-zinc-500 mt-1">{googleUser ? googleUser.email : 'Accedi in Drive Sync'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Ultime Chiamate dai Tavoli</h3>
                  <button onClick={() => setActiveTab('calls')} className="text-xs font-bold text-amber-600 hover:underline">
                    Vedi tutte ➔
                  </button>
                </div>

                <div className="space-y-3">
                  {waiterCalls.slice(0, 3).map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${call.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                          {call.tableNumber.replace('Tavolo ', 'T')}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{call.tableNumber} - {call.type === 'call_waiter' ? 'Chiamata Cameriere' : 'Richiesta Conto'}</p>
                          {call.message ? (
                            <span className="mt-0.5 inline-block px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-500/30">
                              Portare: "{call.message}"
                            </span>
                          ) : (
                            <p className="text-xs text-zinc-500">Nessuna richiesta specifica</p>
                          )}
                        </div>
                      </div>
                      {call.status === 'pending' ? (
                        <button
                          onClick={() => handleResolveCall(call.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
                        >
                          Segna come gestito
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold">Risolto</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl space-y-4">
                <h3 className="text-xl font-black">QR Code Funzionanti</h3>
                <p className="text-xs text-white/90 leading-relaxed">
                  Crea nuovi tavoli (es. salette, terrazze) e genera QR code dinamici che collegano direttamente i clienti al menu con il numero di tavolo preimpostato.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('qr')}
                    className="w-full py-3 rounded-xl bg-white text-zinc-900 font-bold text-xs shadow-md hover:bg-zinc-100 transition-colors"
                  >
                    Gestisci Tavoli e QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MENU CRUD */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Search and Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={`Cerca nel menu di ${restaurant.name}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  + Categoria
                </button>

                <button
                  onClick={() => {
                    setEditingDish({ category: categories[0] || 'Antipasti', isAvailable: true, price: 10 });
                    setIsDishFormOpen(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Nuovo Piatto
                </button>
              </div>
            </div>

            {/* Inline Add Category Form */}
            {isAddingCategory && (
              <form onSubmit={handleAddCategory} className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center gap-3 animate-fadeIn">
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1">
                    Nuova Categoria per {restaurant.name}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es. Pizze Gourmet, Dolci Tipici, Menù Bambini, Vini Locali..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto sm:self-end">
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Salva Categoria
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            )}

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterCategory('Tutte')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterCategory === 'Tutte'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                Tutte ({dishes.length})
              </button>
              {categories.map((cat) => {
                const count = dishes.filter((d) => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      filterCategory === cat
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Dishes Table or Empty State */}
            {(() => {
              const filtered = dishes.filter((d) => {
                const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  d.description.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = filterCategory === 'Tutte' || d.category === filterCategory;
                return matchesSearch && matchesCategory;
              });

              if (filtered.length === 0) {
                return (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
                    <UtensilsCrossed className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700" />
                    <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                      Nessun piatto trovato in {filterCategory === 'Tutte' ? 'questo menu' : `categoria "${filterCategory}"`}
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Aggiungi subito il primo piatto per <strong>{restaurant.name}</strong> oppure importa l'intero menù con un file Excel.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setEditingDish({ category: filterCategory !== 'Tutte' ? filterCategory : (categories[0] || 'Antipasti'), isAvailable: true, price: 10 });
                          setIsDishFormOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm cursor-pointer"
                      >
                        + Aggiungi Piatto
                      </button>
                      <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                      >
                        Importa Excel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold text-zinc-400 uppercase">
                          <th className="p-4">Piatto</th>
                          <th className="p-4">Categoria</th>
                          <th className="p-4">Prezzo</th>
                          <th className="p-4">Stato</th>
                          <th className="p-4 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                        {filtered.map((dish) => (
                          <tr key={dish.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img src={dish.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                                <div>
                                  <p className="font-bold text-zinc-900 dark:text-white">{dish.name}</p>
                                  <p className="text-xs text-zinc-400 line-clamp-1">{dish.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {dish.category}
                              </span>
                            </td>
                            <td className="p-4 font-black text-amber-600 dark:text-amber-400">
                              {dish.price.toFixed(2)} {restaurant.currency}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleAvailability(dish.id)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                  dish.isAvailable
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                                }`}
                              >
                                {dish.isAvailable ? 'Disponibile' : 'Esaurito'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingDish(dish);
                                    setIsDishFormOpen(true);
                                  }}
                                  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer"
                                  title="Modifica Piatto"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDish(dish.id)}
                                  className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                                  title="Elimina Piatto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: WAITER CALLS LIVE */}
        {activeTab === 'calls' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black">Chiamate e Richieste dai Tavoli</h3>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 font-bold">Tempo Reale Attivo</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Notifica visiva e sonora immediata per cameriere e conto</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => soundService.playWaiterCallSound()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition-all"
                  title="Ascolta Chime Cameriere"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Suono Cameriere
                </button>
                <button
                  onClick={() => soundService.playBillRequestSound()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold hover:bg-purple-500/20 transition-all"
                  title="Ascolta Chime Conto"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Suono Conto
                </button>
                <button
                  onClick={() => {
                    if (confirm('Vuoi ripulire lo storico delle chiamate già servite e ripartire da una schermata pulita?')) {
                      realtimeManager.clearAllResolvedCalls(restaurant.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all cursor-pointer"
                  title="Ripulisci tutte le chiamate servite e riparti da una schermata vuota"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ripulisci Storico</span>
                </button>
                <button
                  onClick={() => setWaiterCalls(getStoredWaiterCalls())}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ricarica
                </button>
              </div>
            </div>

            {/* ORDINI RICEVUTI DAI TAVOLI */}
            {restaurant.tableOrderingEnabled && (
              <div className="space-y-4 pt-2 border-b border-zinc-200 dark:border-zinc-800 pb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-500" />
                    <h4 className="text-lg font-black text-zinc-900 dark:text-white">Ordini Inviati dai Tavoli ({tableOrders.length})</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      Modalità Tavolo Sbloccata
                    </span>
                  </div>
                </div>

                {tableOrders.length === 0 ? (
                  <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 space-y-1">
                    <Utensils className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">Nessun ordine attivo al momento</p>
                    <p>Gli ordini inviati direttamente dai clienti via QR code tavolo appariranno qui divisi per tavolo con il riepilogo prodotti e totale.</p>
                  </div>
                ) : (
                  /* Group orders by tableNumber */
                  (() => {
                    const groupedByTable = tableOrders.reduce((acc, order) => {
                      const t = order.tableNumber;
                      if (!acc[t]) acc[t] = [];
                      acc[t].push(order);
                      return acc;
                    }, {} as Record<string, TableOrder[]>);

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {Object.entries(groupedByTable).map(([tblName, ordersList]) => {
                          const tableSum = ordersList.reduce((a, b) => a + b.totalAmount, 0);

                          return (
                            <div key={tblName} className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-amber-500/40 shadow-xl space-y-4">
                              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/30">
                                    {tblName.replace(/[^0-9A-Za-z]/g, '') || 'T'}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-base text-zinc-900 dark:text-white">{tblName}</h5>
                                    <p className="text-xs text-zinc-400 font-semibold">{ordersList.length} ordini inviati per questo tavolo</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Totale Conto</span>
                                  <span className="text-lg font-black text-amber-500">
                                    {tableSum.toFixed(2)} {restaurant.currency}
                                  </span>
                                </div>
                              </div>

                              {/* Orders list breakdown */}
                              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {ordersList.map((ord, oIdx) => (
                                  <div key={ord.id} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2 text-xs">
                                    <div className="flex items-center justify-between font-bold">
                                      <span className="text-zinc-500">
                                        Ordine #{ordersList.length - oIdx} • Ore {new Date(ord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                                        ord.status === 'pending' ? 'bg-amber-500 text-white font-black animate-pulse' : 'bg-emerald-500/20 text-emerald-400 font-bold'
                                      }`}>
                                        {ord.status === 'pending' ? 'NUOVO ORDINE' : 'In Cucina'}
                                      </span>
                                    </div>

                                    <div className="space-y-1 pt-1">
                                      {ord.items.map((it, iIdx) => (
                                        <div key={iIdx} className="flex justify-between items-center text-zinc-800 dark:text-zinc-200">
                                          <span>
                                            <strong className="text-amber-500">{it.quantity}x</strong> {it.dishName}
                                            {it.notes && <em className="text-zinc-400 text-[11px] font-medium ml-1">({it.notes})</em>}
                                          </span>
                                          <span className="font-bold">{(it.price * it.quantity).toFixed(2)} {restaurant.currency}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {ord.note && (
                                      <p className="text-[11px] text-amber-600 dark:text-amber-400 italic bg-amber-500/10 p-2 rounded-xl">
                                        Note Tavolo: "{ord.note}"
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Reset / Close Table Bill Button */}
                              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => handleResetTable(tblName)}
                                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Chiudi Conto & Resetta {tblName}</span>
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            <div className="space-y-4">
              {waiterCalls.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 space-y-2">
                  <Bell className="w-10 h-10 text-zinc-400 mx-auto" />
                  <h4 className="font-bold">Nessuna chiamata attiva</h4>
                  <p className="text-xs text-zinc-500">I clienti dal menu digitale possono chiamare il cameriere o chiedere il conto.</p>
                </div>
              ) : (
                waiterCalls.map((call) => (
                  <div key={call.id} className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    call.status === 'pending'
                      ? call.type === 'call_waiter'
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700/60 shadow-lg shadow-amber-500/10'
                        : 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-400 dark:border-purple-700/60 shadow-lg shadow-purple-500/10'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-75'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                        call.status === 'pending' 
                          ? call.type === 'call_waiter'
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse'
                            : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 animate-pulse'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {call.tableNumber.replace(/[^0-9]/g, '') || 'T'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black">{call.tableNumber}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            call.type === 'call_waiter' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          }`}>
                            {call.type === 'call_waiter' ? '🔔 Chiamata Cameriere' : '🧾 Richiesta Conto'}
                          </span>
                        </div>
                        {call.message ? (
                          <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-black text-xs inline-flex items-center gap-1.5 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 animate-pulse" />
                            <span>Da portare al tavolo: <strong>"{call.message}"</strong></span>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 mt-1 italic">Nessuna richiesta specifica inserita</p>
                        )}
                        <p className="text-[10px] text-zinc-400 mt-1">Ricevuto alle {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    {call.status === 'pending' ? (
                      <button
                        onClick={() => handleResolveCall(call.id)}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-lg transition-all ${
                          call.type === 'call_waiter'
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                            : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25'
                        }`}
                      >
                        {call.type === 'call_waiter' ? '✓ Segna come Servito' : '✓ Segna Conto Portato'}
                      </button>
                    ) : (
                      <span className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        ✓ Servito
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: QR CODE DINAMICI PER IL MENU DEL RISTORANTE SPECIFICO */}
        {activeTab === 'qr' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">QR Code Specifici per {restaurant.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    ID: {restaurant.id}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Tutti i QR Code generati indirizzano <strong>esclusivamente al menu di {restaurant.name}</strong> e associano automaticamente il tavolo corretto.
                </p>
              </div>

              {/* Add Table Form */}
              <form onSubmit={handleAddTable} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Nome Tavolo (es. Tavolo 13, Terrazza 2)"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Tavolo
                </button>
              </form>
            </div>

            {copyToast && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold text-center animate-fadeIn">
                {copyToast}
              </div>
            )}

            {/* SEZIONE 1: QR CODE GENERALE DEL RISTORANTE (INGRESSO / CASSA / SOCIAL) */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR Code Ufficiale del Locale</span>
                  </div>
                  <h4 className="text-xl font-black text-zinc-900 dark:text-white">
                    Menu Digitale Generale di {restaurant.name}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Questo QR Code è ideale per il cartello all'ingresso, in vetrina, per il take-away o per i canali social. Indirizza direttamente al catalogo dei vostri piatti senza pre-selezionare un tavolo specifico.
                  </p>
                  
                  {(() => {
                    const generalMenuUrl = `${window.location.origin}${window.location.pathname}?view=menu&restaurant=${encodeURIComponent(restaurant.id)}`;
                    return (
                      <div className="space-y-2 pt-2">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-500 truncate flex items-center justify-between gap-2">
                          <span className="truncate">{generalMenuUrl}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                            Menu {restaurant.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={generalMenuUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Apri & Testa Menu Generale
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generalMenuUrl);
                              setCopyToast(`Link al menu generale di ${restaurant.name} copiato negli appunti!`);
                              setTimeout(() => setCopyToast(null), 3000);
                            }}
                            className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copia Link Menu
                          </button>
                          <button
                            onClick={() => alert(`Stampa cartello vetrina per ${restaurant.name} avviata!`)}
                            className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Stampa Cartello Vetrina
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* QR Image Box */}
                {(() => {
                  const generalMenuUrl = `${window.location.origin}${window.location.pathname}?view=menu&restaurant=${encodeURIComponent(restaurant.id)}`;
                  const generalQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(generalMenuUrl)}`;
                  return (
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-center flex-shrink-0">
                      <img src={generalQrSrc} alt={`QR Code ${restaurant.name}`} className="w-40 h-40 mx-auto rounded-xl" />
                      <p className="text-[11px] font-bold text-zinc-500 mt-2">Menu Ufficiale Locale</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* SEZIONE 2: QR CODE TAVOLI INDIVIDUALI */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold">QR Code Specifici per Singolo Tavolo ({tableList.length} tavoli)</h4>
                  <p className="text-xs text-zinc-500">
                    Ciascun QR Code contiene sia l'identificativo del locale (<code>restaurant={restaurant.id}</code>) che il numero del tavolo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tableList.map((tableName) => {
                  // Explicitly bind to this specific restaurant and this specific table
                  const tableUrl = `${window.location.origin}${window.location.pathname}?view=menu&restaurant=${encodeURIComponent(restaurant.id)}&table=${encodeURIComponent(tableName)}`;
                  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tableUrl)}`;

                  return (
                    <div key={tableName} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm text-center space-y-4 relative group hover:border-amber-500/50 transition-all">
                      <button
                        onClick={() => handleDeleteTable(tableName)}
                        className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                        title="Elimina Tavolo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                          {tableName.replace(/[^0-9A-Za-z]/g, '').slice(0, 4) || 'QR'}
                        </div>
                        <div className="text-left">
                          <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">{tableName}</h4>
                          <span className="text-[10px] font-semibold text-zinc-400 block truncate max-w-[150px]">
                            {restaurant.name}
                          </span>
                        </div>
                      </div>

                      {/* Functional QR Code Image */}
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl inline-block border border-zinc-200 dark:border-zinc-700">
                        <img src={qrImageSrc} alt={`QR Code ${tableName}`} className="w-36 h-36 mx-auto rounded-lg" />
                      </div>

                      <div className="space-y-1.5 text-left bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                        <p className="text-[10px] text-zinc-500 font-semibold">Parametri QR Inclusi:</p>
                        <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 truncate">
                          restaurant={restaurant.id}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">
                          table={tableName}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <a
                          href={tableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Apri & Testa ({tableName})
                        </a>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tableUrl);
                            setCopyToast(`Link specifico per ${tableName} (${restaurant.name}) copiato!`);
                            setTimeout(() => setCopyToast(null), 3000);
                          }}
                          className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copia Link Tavolo
                        </button>

                        <button
                          onClick={() => alert(`Stampa cartello ufficiale per ${tableName} (${restaurant.name}) avviata!`)}
                          className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Stampa Cartello Tavolo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: GOOGLE DRIVE SYNC */}
        {activeTab === 'drive' && (
          <div className="space-y-6 animate-fadeIn max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Integrazione Google Drive</h3>
                <p className="text-xs text-zinc-500">Esporta e sincronizza i backup del menu sul tuo Google Drive</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              {!googleUser ? (
                <div className="text-center py-6 space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Effettua l'accesso con il tuo account Google per abilitare la sincronizzazione con Google Drive.
                  </p>
                  
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleSigningIn}
                    className="gsi-material-button mx-auto flex items-center justify-center gap-3 px-6 py-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 transition-all shadow-sm cursor-pointer font-medium text-sm"
                  >
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    </div>
                    <span>{isGoogleSigningIn ? 'Accesso in corso...' : 'Sign in with Google'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                        {googleUser.email?.[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{googleUser.displayName || googleUser.email}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Connesso a Google Drive</p>
                      </div>
                    </div>
                    <button
                      onClick={logoutUser}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 text-xs font-semibold shadow-sm"
                    >
                      Disconnetti
                    </button>
                  </div>

                  {driveSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{driveSuccessMsg}</span>
                    </div>
                  )}

                  {driveErrorMsg && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{driveErrorMsg}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleExportToDrive}
                      disabled={driveLoading}
                      className="flex-1 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
                    >
                      <CloudUpload className="w-4 h-4" />
                      {driveLoading ? 'Caricamento...' : 'Salva Backup Menu su Drive'}
                    </button>

                    <button
                      onClick={fetchDriveBackups}
                      disabled={driveLoading}
                      className="py-3.5 px-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Aggiorna Lista Backup
                    </button>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <h4 className="text-sm font-bold">Backup Disponibili su Google Drive</h4>
                    {driveFiles.length === 0 ? (
                      <p className="text-xs text-zinc-400">Nessun backup trovato su Google Drive. Clicca "Salva Backup Menu su Drive" per crearne uno.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {driveFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                            <div>
                              <p className="text-xs font-bold">{file.name}</p>
                              <p className="text-[10px] text-zinc-400">ID: {file.id}</p>
                            </div>
                            <button
                              onClick={() => handleRestoreFromDrive(file.id)}
                              disabled={driveLoading}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                            >
                              <DownloadCloud className="w-3.5 h-3.5" />
                              Ripristina
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: COUPONS & PROMO POPUP MANAGEMENT */}
        {activeTab === 'coupons' && (
          <div className="space-y-8 animate-fadeIn max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Gestione Coupon Sconto & Pop-up Promozionale</h3>
                <p className="text-xs text-zinc-500">Crea codici sconto e personalizza il pop-up iniziale per i clienti</p>
              </div>
            </div>

            <form onSubmit={handleSaveRestaurantSettings} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <h4 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Configurazione Pop-up di Benvenuto
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Titolo del Pop-up</label>
                <input
                  type="text"
                  value={restaurant.promoPopup?.title || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    promoPopup: { ...(restaurant.promoPopup || { subtitle: '', active: true }), title: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Testo / Sottotitolo</label>
                <textarea
                  rows={2}
                  value={restaurant.promoPopup?.subtitle || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    promoPopup: { ...(restaurant.promoPopup || { title: '', active: true }), subtitle: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Codice Coupon da Mostrare nel Pop-up</label>
                  <input
                    type="text"
                    value={restaurant.promoPopup?.couponCode || ''}
                    onChange={(e) => setRestaurant({
                      ...restaurant,
                      promoPopup: { ...(restaurant.promoPopup || { title: '', subtitle: '', active: true }), couponCode: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm uppercase"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restaurant.promoPopup?.active ?? true}
                      onChange={(e) => setRestaurant({
                        ...restaurant,
                        promoPopup: { ...(restaurant.promoPopup || { title: '', subtitle: '' }), active: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    Attiva Pop-up all'apertura del menu
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs"
              >
                Salva Impostazioni Pop-up
              </button>
            </form>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <h4 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-500" />
                Crea Nuovo Codice Sconto Coupon
              </h4>

              <form onSubmit={handleAddCoupon} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Codice (es. SUMMER20)</label>
                  <input
                    type="text"
                    required
                    placeholder="ES. SCONTO15"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Percentuale Sconto (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newDiscountPercent}
                    onChange={(e) => setNewDiscountPercent(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md"
                >
                  Crea Coupon
                </button>
              </form>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Coupon Attivi nel Sistema</h5>
                <div className="space-y-2">
                  {restaurant.coupons?.map((coup) => (
                    <div key={coup.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs rounded-lg border border-amber-500/20">
                          {coup.code}
                        </span>
                        <div>
                          <p className="text-xs font-bold">-{coup.discountPercent}% di sconto sul totale</p>
                          <p className="text-[10px] text-zinc-400">{coup.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCoupon(coup.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & BANNER */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn max-w-2xl">
            <div>
              <h3 className="text-xl font-bold">Impostazioni Locale & Banner Marketing</h3>
              <p className="text-xs text-zinc-500">Personalizza le informazioni del ristorante e l'offerta in primo piano</p>
            </div>

            <form onSubmit={handleSaveRestaurantSettings} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nome del Ristorante</label>
                <input
                  type="text"
                  value={restaurant.name}
                  onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Slogan / Descrizione Breve</label>
                <input
                  type="text"
                  value={restaurant.tagline}
                  onChange={(e) => setRestaurant({ ...restaurant, tagline: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Indirizzo</label>
                  <input
                    type="text"
                    value={restaurant.address}
                    onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Orari di Apertura</label>
                  <input
                    type="text"
                    value={restaurant.openingHours}
                    onChange={(e) => setRestaurant({ ...restaurant, openingHours: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider block">
                  🎨 Layout Grafico del Menu Digitale per i Clienti
                </label>
                <select
                  value={restaurant.menuTheme || 'standard'}
                  onChange={(e) => setRestaurant({ ...restaurant, menuTheme: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="standard">Standard (Design Pulito, Moderno e Neutro)</option>
                  <option value="casual">Casual / Pizzeria & Paninoteca (Commerciale, Pop e Colorato)</option>
                  <option value="luxury">Ristorante di Lusso (Minimalista, Dark Elegante e Dettagli Oro)</option>
                </select>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Scegli lo stile grafico più adatto al tuo locale. I cambi sono visibili immediatamente sul menu dei clienti in tempo reale.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Banner Promozionale in cima al Menu</h4>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Titolo Banner</label>
                  <input
                    type="text"
                    value={restaurant.activeBanner?.title || ''}
                    onChange={(e) => setRestaurant({
                      ...restaurant,
                      activeBanner: { ...(restaurant.activeBanner || { subtitle: '', active: true }), title: e.target.value }
                    })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Sottotitolo Banner</label>
                  <input
                    type="text"
                    value={restaurant.activeBanner?.subtitle || ''}
                    onChange={(e) => setRestaurant({
                      ...restaurant,
                      activeBanner: { ...(restaurant.activeBanner || { title: '', active: true }), subtitle: e.target.value }
                    })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salva Modifiche
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportDishes={(imported) => {
          const combined = [...imported, ...dishes];
          setDishes(combined);
          saveStoredDishes(combined, restaurant.id);
          realtimeManager.broadcastDishes(combined, restaurant.id);
        }}
        existingCategories={categories}
      />

      {/* Dish Add/Edit Modal */}
      {isDishFormOpen && editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingDish.id ? 'Modifica Piatto' : 'Nuovo Piatto'}</h3>
            
            <form onSubmit={handleSaveDish} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Nome Piatto</label>
                <input
                  type="text"
                  required
                  value={editingDish.name || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Prezzo (€)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={editingDish.price || 10}
                    onChange={(e) => setEditingDish({ ...editingDish, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Categoria</label>
                  <select
                    value={editingDish.category || categories[0]}
                    onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">URL Immagine (Unsplash)</label>
                <input
                  type="url"
                  value={editingDish.image || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, image: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Descrizione</label>
                <textarea
                  rows={3}
                  value={editingDish.description || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.isAvailable ?? true}
                    onChange={(e) => setEditingDish({ ...editingDish, isAvailable: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Disponibile al tavolo
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.isSpecial ?? false}
                    onChange={(e) => setEditingDish({ ...editingDish, isSpecial: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Offerta / In Evidenza
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsDishFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-650 text-white text-xs font-bold shadow-md"
                >
                  Salva Piatto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
