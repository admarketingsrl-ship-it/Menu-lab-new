import React, { useState, useEffect } from 'react';
import { Search, Bell, Star, Share2, Globe, Clock, MapPin, CheckCircle, Sparkles, Utensils, ChevronRight, Tag, Percent, Receipt, QrCode, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Dish, RestaurantInfo, WaiterCall, ReviewItem, CartItem, TableOrder } from '../types';
import { 
  getStoredDishes, getStoredRestaurant, getStoredCategories, 
  getStoredReviews, saveStoredReviews, setCurrentRestaurantId 
} from '../services/store';
import { realtimeManager } from '../services/realtime';
import { DishModal } from './DishModal';
import { WaiterCallModal } from './WaiterCallModal';
import { ReviewModal } from './ReviewModal';
import { PromoPopupModal } from './PromoPopupModal';
import { AiSommelierModal } from './AiSommelierModal';
import { OrderCartModal } from './OrderCartModal';
import { TableClosedModal } from './TableClosedModal';

export const PublicMenu: React.FC = () => {
  const getInitialRestaurant = (): RestaurantInfo => {
    try {
      const params = new URLSearchParams(window.location.search);
      const restParam = params.get('restaurant') || params.get('r') || params.get('rest');
      return getStoredRestaurant(restParam || undefined);
    } catch {
      return getStoredRestaurant();
    }
  };

  const initialRest = getInitialRestaurant();
  const [restaurant, setRestaurant] = useState<RestaurantInfo>(initialRest);
  const [dishes, setDishes] = useState<Dish[]>(() => getStoredDishes(initialRest.id));
  const [categories, setCategories] = useState<string[]>(() => getStoredCategories(initialRest.id));
  
  // Table state: auto-loaded and strictly locked from QR Code (no manual selection permitted)
  const [tableNumber, setTableNumber] = useState<string>('Tavolo 1');
  const [isTableLocked, setIsTableLocked] = useState<boolean>(true);

  // UI filters
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dietaryFilter, setDietaryFilter] = useState<string>('Tutti');
  const [lang, setLang] = useState<'IT' | 'EN'>('IT');

  // Coupon & Discount state
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState<number>(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Modals & Cart State
  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [waiterModalType, setWaiterModalType] = useState<'call_waiter' | 'request_bill'>('call_waiter');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Table Order Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [submittedOrders, setSubmittedOrders] = useState<TableOrder[]>([]);
  const [isTableClosedModalOpen, setIsTableClosedModalOpen] = useState(false);

  // 1. Parse restaurant and table query param from scanned QR Code on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      
      // Load specific restaurant derived from QR Code
      const restParam = params.get('restaurant') || params.get('r') || params.get('rest');
      if (restParam) {
        const targetRest = getStoredRestaurant(restParam);
        if (targetRest) {
          setRestaurant(targetRest);
          setDishes(getStoredDishes(targetRest.id));
          setCategories(getStoredCategories(targetRest.id));
          setCurrentRestaurantId(targetRest.id);
        }
      }

      // Load specific table derived from QR Code
      const tParam = params.get('table') || params.get('t') || params.get('tavolo');
      let identifiedTable = '';
      if (tParam) {
        let clean = decodeURIComponent(tParam).trim();
        if (/^\d+$/.test(clean)) {
          clean = `Tavolo ${clean}`;
        }
        identifiedTable = clean;
        setIsTableLocked(true);
        sessionStorage.setItem('menulab_scanned_table', identifiedTable);
      } else {
        const stored = sessionStorage.getItem('menulab_scanned_table');
        if (stored) {
          identifiedTable = stored;
          setIsTableLocked(true);
        }
      }

      if (identifiedTable) {
        setTableNumber(identifiedTable);
      }
    } catch (e) {
      console.warn('Error reading table or restaurant param:', e);
    }
  }, []);

  // 2. Real-time Subscription to Menu, Orders & Restaurant Updates scoped to this restaurant
  useEffect(() => {
    if (!restaurant?.id) return;

    const unsubDishes = realtimeManager.subscribeToDishes((liveDishes) => {
      setDishes(liveDishes);
    }, restaurant.id);

    const unsubRestaurant = realtimeManager.subscribeToRestaurant((liveRest) => {
      setRestaurant(liveRest);
    }, restaurant.id);

    const unsubOrders = realtimeManager.subscribeToOrders((liveOrders) => {
      const myTableOrders = liveOrders.filter(
        (o) => o.tableNumber.toLowerCase() === tableNumber.toLowerCase()
      );
      setSubmittedOrders(myTableOrders);
    }, restaurant.id);

    const unsubReset = realtimeManager.subscribeToTableReset((resetTbl) => {
      if (resetTbl.toLowerCase() === tableNumber.toLowerCase()) {
        setCartItems([]);
        setIsCartModalOpen(false);
        setIsTableClosedModalOpen(true);
      }
    }, restaurant.id);

    return () => {
      unsubDishes();
      unsubRestaurant();
      unsubOrders();
      unsubReset();
    };
  }, [restaurant?.id, tableNumber]);

  // Cart Helper Logic
  const getItemCartQty = (dishId: string) => {
    return cartItems.find((i) => i.dish.id === dishId)?.quantity || 0;
  };

  const handleAddToCart = (dish: Dish, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCartItems((prev) => {
      const existing = prev.find((i) => i.dish.id === dish.id);
      if (existing) {
        return prev.map((i) => i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { dish, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (dishId: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCartItems((prev) => {
      return prev.map((i) => {
        if (i.dish.id === dishId) {
          const nextQty = i.quantity + delta;
          return nextQty > 0 ? { ...i, quantity: nextQty } : null;
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleUpdateCartNotes = (dishId: string, notes: string) => {
    setCartItems((prev) => prev.map((i) => i.dish.id === dishId ? { ...i, notes } : i));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleCartSubmitOrder = async (generalNote: string) => {
    if (cartItems.length === 0) return;

    const orderItems = cartItems.map((i) => ({
      dishId: i.dish.id,
      dishName: i.dish.name,
      price: calculateDiscountedPrice(i.dish.price),
      quantity: i.quantity,
      notes: i.notes || '',
    }));

    const rawSum = cartItems.reduce((acc, i) => acc + i.dish.price * i.quantity, 0);
    const totalSum = calculateDiscountedPrice(rawSum);

    await realtimeManager.submitTableOrder({
      restaurantId: restaurant.id,
      tableNumber: tableNumber,
      items: orderItems,
      totalAmount: totalSum,
      note: generalNote,
    }, restaurant.id);

    setCartItems([]);
  };

  const handleApplyCouponCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = restaurant.coupons?.find((c) => c.code.toUpperCase() === cleanCode && c.active);

    if (found) {
      setAppliedDiscountPercent(found.discountPercent);
      setAppliedCouponCode(found.code);
      setCouponMessage(`Coupon "${found.code}" applicato: -${found.discountPercent}% di sconto!`);
      setTimeout(() => setCouponMessage(null), 4000);
    } else {
      setCouponMessage('Codice coupon non valido o scaduto.');
      setTimeout(() => setCouponMessage(null), 3000);
    }
  };

  const calculateDiscountedPrice = (price: number) => {
    if (appliedDiscountPercent <= 0) return price;
    return price * (1 - appliedDiscountPercent / 100);
  };

  // Filter logic
  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = selectedCategory === 'Tutti' || dish.category === selectedCategory;
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dish.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDietary = true;
    if (dietaryFilter !== 'Tutti') {
      matchesDietary = dish.dietary?.includes(dietaryFilter as any) || false;
    }

    return matchesCategory && matchesSearch && matchesDietary;
  });

  const specialDishes = dishes.filter((d) => d.isSpecial && d.isAvailable);

  // Directly submit Waiter Call or Bill Request in real time
  const handleWaiterCallSubmit = async (callData: Omit<WaiterCall, 'id' | 'timestamp' | 'status'>) => {
    await realtimeManager.submitWaiterCall({
      ...callData,
      restaurantId: restaurant.id,
      tableNumber: tableNumber, // Strictly use the locked QR table
    }, restaurant.id);
    
    const msg = callData.type === 'call_waiter' 
      ? `Richiesta inviata! Il cameriere sta arrivando al ${tableNumber}.` 
      : `Richiesta conto inviata per il ${tableNumber}.`;
    
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const handleOpenCallWaiter = () => {
    setWaiterModalType('call_waiter');
    setIsWaiterModalOpen(true);
  };

  const handleOpenRequestBill = () => {
    setWaiterModalType('request_bill');
    setIsWaiterModalOpen(true);
  };

  const handleReviewSubmit = (reviewData: Omit<ReviewItem, 'id' | 'timestamp'>) => {
    const existing = getStoredReviews();
    const newReview: ReviewItem = {
      ...reviewData,
      id: `rev_${Date.now()}`,
      timestamp: Date.now(),
    };
    saveStoredReviews([newReview, ...existing]);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };


  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-36">
      
      {/* Toast Notification for Share */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-fadeIn border border-white/20">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          Link del menu copiato negli appunti!
        </div>
      )}

      {/* Floating Success Alert after Call or Bill */}
      {actionSuccessToast && (
        <div className="fixed top-6 left-4 right-4 z-50 max-w-md mx-auto bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn border border-emerald-400/40">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black">{actionSuccessToast}</p>
            <p className="text-[11px] text-white/80 font-normal">Notifica ricevuta in tempo reale dalla cassa.</p>
          </div>
        </div>
      )}

      {/* Hero Cover Header */}
      <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-zinc-900">
        <img
          src={restaurant.coverImage}
          alt={restaurant.name}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
          
          {/* Table Badge strictly derived from Scanned QR Code - No dropdown or manual selection permitted */}
          <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-amber-500/40 text-white text-xs font-semibold shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-zinc-300">Tavolo:</span>
            <span className="text-amber-400 font-black">{tableNumber}</span>
            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold ml-1 border border-amber-500/30 truncate max-w-[140px]">
              <QrCode className="w-3 h-3 flex-shrink-0" /> {restaurant.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-lg shadow-amber-500/25 hover:opacity-95 transition-all animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Sommelier
            </button>
            <button
              onClick={() => setLang(lang === 'IT' ? 'EN' : 'IT')}
              className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 text-white text-xs font-semibold hover:bg-black/60 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang}
            </button>
            <button
              onClick={handleShare}
              className="p-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white hover:bg-black/60 transition-colors"
              title="Condividi Menu"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-4 right-4 max-w-7xl mx-auto flex items-end gap-4">
          <img
            src={restaurant.logo}
            alt="Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white dark:border-zinc-900 shadow-2xl flex-shrink-0"
          />
          <div className="text-white">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">{restaurant.name}</h1>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 line-clamp-1">{restaurant.tagline}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {restaurant.address}
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {restaurant.openingHours}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Banner */}
      {restaurant.activeBanner?.active && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 mb-8">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold">{restaurant.activeBanner.title}</h3>
                <p className="text-xs sm:text-sm text-white/90">{restaurant.activeBanner.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Table Confirmation Callout for Mobile Scanners */}
        {isTableLocked && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
                {tableNumber.replace(/[^0-9]/g, '') || 'QR'}
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900 dark:text-white">
                  Sei seduto al {tableNumber}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Le chiamate e il conto saranno inviati direttamente per questo tavolo.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCallWaiter}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 shadow-sm whitespace-nowrap"
              >
                Chiama
              </button>
              <button
                onClick={handleOpenRequestBill}
                className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm whitespace-nowrap"
              >
                Conto
              </button>
            </div>
          </div>
        )}

        {/* Coupon Code Input & Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder={lang === 'IT' ? 'Cerca un piatto, ingrediente, pizza...' : 'Search dish, ingredient, pizza...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="pl-2 text-amber-500">
              <Tag className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Codice Coupon (es. BENENVENUTO10)"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-zinc-900 dark:text-white focus:outline-none uppercase"
            />
            <button
              onClick={() => handleApplyCouponCode(couponInput)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm"
            >
              Applica
            </button>
          </div>
        </div>

        {couponMessage && (
          <div className={`p-3 rounded-xl text-xs font-bold text-center animate-fadeIn ${
            appliedDiscountPercent > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {couponMessage}
          </div>
        )}

        {appliedCouponCode && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              <span>Coupon attivo: <strong>{appliedCouponCode}</strong> (-{appliedDiscountPercent}%)</span>
            </div>
            <button
              onClick={() => {
                setAppliedDiscountPercent(0);
                setAppliedCouponCode(null);
              }}
              className="text-xs hover:underline"
            >
              Rimuovi sconto
            </button>
          </div>
        )}

        {/* Dietary Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['Tutti', 'Vegetariano', 'Vegano', 'Senza Glutine', 'Senza Lattosio'].map((diet) => (
            <button
              key={diet}
              onClick={() => setDietaryFilter(diet)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                dietaryFilter === diet
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              {diet}
            </button>
          ))}
        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('Tutti')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'Tutti'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            Tutti i Piatti
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Special Dishes Carousel */}
        {selectedCategory === 'Tutti' && !searchQuery && specialDishes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-extrabold tracking-tight">In Evidenza & Specialità</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialDishes.map((dish) => {
                const finalPrice = calculateDiscountedPrice(dish.price);
                return (
                  <div
                    key={`spec_${dish.id}`}
                    className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all group flex flex-col"
                  >
                    <div 
                      className="relative h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                      onClick={() => setActiveDish(dish)}
                    >
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                        Speciale
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-amber-400 font-black px-3 py-1 rounded-xl text-sm border border-white/10 flex items-center gap-2">
                        {appliedDiscountPercent > 0 && (
                          <span className="line-through text-xs text-zinc-400">{dish.price.toFixed(2)}</span>
                        )}
                        <span>{finalPrice.toFixed(2)} {restaurant.currency}</span>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="cursor-pointer" onClick={() => setActiveDish(dish)}>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors">
                          {dish.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {dish.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-xs font-semibold text-zinc-400">{dish.category}</span>
                        {/* Cart interaction for special dish */}
                        {restaurant.tableOrderingEnabled && dish.isAvailable && (
                          <div>
                            {getItemCartQty(dish.id) > 0 ? (
                              <div className="flex items-center gap-2 bg-amber-500 text-white rounded-xl px-2.5 py-1 shadow-md font-bold text-xs">
                                <button 
                                  onClick={(e) => handleUpdateCartQuantity(dish.id, -1, e)} 
                                  className="p-1 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-1 text-xs font-black">{getItemCartQty(dish.id)}</span>
                                <button 
                                  onClick={(e) => handleUpdateCartQuantity(dish.id, 1, e)} 
                                  className="p-1 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleAddToCart(dish, e)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Aggiungi</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Menu Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">
              {selectedCategory === 'Tutti' ? 'Tutto il Menu' : selectedCategory}
            </h2>
            <span className="text-xs text-zinc-400 font-semibold">{filteredDishes.length} piatti disponibili</span>
          </div>

          {filteredDishes.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
              <Utensils className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-lg font-bold">Nessun piatto trovato</h3>
              <p className="text-xs text-zinc-500">Prova a modificare i filtri di ricerca o seleziona un'altra categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDishes.map((dish) => {
                const finalPrice = calculateDiscountedPrice(dish.price);
                return (
                  <div
                    key={dish.id}
                    onClick={() => setActiveDish(dish)}
                    className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex gap-4 items-center"
                  >
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                          {dish.name}
                        </h3>
                        <div className="text-right flex-shrink-0">
                          {appliedDiscountPercent > 0 && (
                            <span className="block text-xs line-through text-zinc-400">{dish.price.toFixed(2)}</span>
                          )}
                          <span className="text-base font-black text-amber-600 dark:text-amber-400">
                            {finalPrice.toFixed(2)} {restaurant.currency}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {dish.description}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!dish.isAvailable && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-[10px] font-bold">
                              Esaurito
                            </span>
                          )}
                          {dish.dietary?.map((diet, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                              {diet}
                            </span>
                          ))}
                        </div>

                        {/* Add to Cart button when Table Ordering is enabled */}
                        {restaurant.tableOrderingEnabled && dish.isAvailable && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {getItemCartQty(dish.id) > 0 ? (
                              <div className="flex items-center gap-2 bg-amber-500 text-white rounded-xl px-2.5 py-1 shadow-md font-bold text-xs">
                                <button 
                                  onClick={(e) => handleUpdateCartQuantity(dish.id, -1, e)} 
                                  className="p-1 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-1 text-xs font-black">{getItemCartQty(dish.id)}</span>
                                <button 
                                  onClick={(e) => handleUpdateCartQuantity(dish.id, 1, e)} 
                                  className="p-1 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleAddToCart(dish, e)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Aggiungi</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Floating Action Bar (Bottom Fixed) */}
      <div className="fixed bottom-4 left-3 right-3 z-40 max-w-xl mx-auto">
        <div className="bg-zinc-900/95 dark:bg-zinc-900/95 backdrop-blur-xl text-white px-3 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-2">
          
          {/* Button: Order Cart (When Table Ordering Enabled) */}
          {restaurant.tableOrderingEnabled && (
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-95 relative cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="truncate">Carrello ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
              {cartItems.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 absolute top-1.5 right-1.5 animate-ping" />
              )}
            </button>
          )}

          {/* Button 1: Chiama Cameriere (Direct for scanned table) */}
          <button
            onClick={handleOpenCallWaiter}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span className="truncate">Chiama ({tableNumber})</span>
          </button>

          {/* Button 2: Chiedi il Conto (Direct for scanned table) */}
          <button
            onClick={handleOpenRequestBill}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition-all active:scale-95"
          >
            <Receipt className="w-4 h-4" />
            <span className="truncate">Conto ({tableNumber})</span>
          </button>

          {/* Button 3: AI Sommelier */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-amber-400 transition-all flex-shrink-0"
            title="AI Sommelier"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Button 4: Recensisci */}
          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex-shrink-0"
            title="Lascia una Recensione"
          >
            <Star className="w-4 h-4 text-amber-400" />
          </button>

        </div>
      </div>

      {/* Modals */}
      <DishModal
        dish={activeDish}
        currency={restaurant.currency}
        onClose={() => setActiveDish(null)}
      />

      <WaiterCallModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
        onSubmitCall={handleWaiterCallSubmit}
        tableNumber={tableNumber}
        isTableLocked={true}
        initialType={waiterModalType}
      />

      <OrderCartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        tableNumber={tableNumber}
        restaurant={restaurant}
        cartItems={cartItems}
        appliedDiscountPercent={appliedDiscountPercent}
        onUpdateQuantity={handleUpdateCartQuantity}
        onUpdateItemNotes={handleUpdateCartNotes}
        onClearCart={handleClearCart}
        onSubmitOrder={handleCartSubmitOrder}
        submittedOrders={submittedOrders}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitReview={handleReviewSubmit}
        googleReviewUrl={restaurant.googleReviewUrl}
      />

      <PromoPopupModal
        popup={restaurant.promoPopup}
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        onApplyCoupon={handleApplyCouponCode}
      />

      <AiSommelierModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        dishes={dishes}
      />

      <TableClosedModal
        isOpen={isTableClosedModalOpen}
        onClose={() => setIsTableClosedModalOpen(false)}
        tableNumber={tableNumber}
        restaurant={restaurant}
      />

    </div>
  );
};
