import { Dish, RestaurantInfo, WaiterCall, ReviewItem } from '../types';
import { 
  INITIAL_DISHES, INITIAL_RESTAURANT, INITIAL_CATEGORIES,
  INITIAL_RESTAURANT_DISHES, INITIAL_RESTAURANT_CATEGORIES,
  DEFAULT_STARTER_CATEGORIES, createStarterDishesForRestaurant
} from '../data/initialData';

const STORAGE_KEYS = {
  DISHES: 'menulab_dishes_v1',
  RESTAURANTS: 'menulab_restaurants_list_v3',
  CURRENT_RESTAURANT_ID: 'menulab_current_restaurant_id_v2',
  CATEGORIES: 'menulab_categories_v1',
  WAITER_CALLS: 'menulab_waiter_calls_v1',
  REVIEWS: 'menulab_reviews_v1',
};

export const INITIAL_RESTAURANTS_LIST: RestaurantInfo[] = [
  INITIAL_RESTAURANT,
  {
    id: 'pizzeriavesuvio',
    name: 'Pizzeria & Friggitoria Vesuvio',
    tagline: 'Pizza fritta napoletana e specialità di mare.',
    logo: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80',
    coverImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    address: 'Corso Umberto I 112, Napoli',
    phone: '+39 081 777 9988',
    email: 'vesuvio@menulab.it',
    adminEmail: 'admin@vesuvio.it',
    adminPassword: 'vesuvio123',
    isOpen: true,
    openingHours: 'Lun - Dom: 18:30 - 00:00',
    currency: '€',
    googleReviewUrl: 'https://g.page/r/example',
    tripAdvisorUrl: 'https://www.tripadvisor.it',
    tables: ['Tavolo 1', 'Tavolo 2', 'Tavolo 3', 'Tavolo 4', 'Tavolo 5', 'Terrazza Est'],
    subscription: {
      planName: 'Abbonamento Mensile Pro',
      status: 'Attivo',
      endDate: '2026-11-30',
      monthlyFee: 49,
    },
    promoPopup: {
      title: '🍕 Promo Vesuvio!',
      subtitle: 'Sconto 15% con codice VESUVIO15',
      couponCode: 'VESUVIO15',
      active: true,
    },
    coupons: [
      { id: 'cv1', code: 'VESUVIO15', discountPercent: 15, description: 'Sconto 15% pizze e fritti', active: true }
    ]
  },
  {
    id: 'trattoriabarchetta',
    name: 'Ristorante Barchetta sul Porto',
    tagline: 'Pesce fresco del pescato locale ogni giorno.',
    logo: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=300&q=80',
    coverImage: 'https://images.unsplash.com/photo-1507048331197-7d4acfa1f18c?auto=format&fit=crop&w=1200&q=80',
    address: 'Molo Luise 5, Napoli',
    phone: '+39 081 999 4321',
    email: 'barchetta@menulab.it',
    adminEmail: 'admin@barchetta.it',
    adminPassword: 'barchetta123',
    isOpen: true,
    openingHours: 'Mar - Dom: 12:30 - 15:30 | 20:00 - 23:30',
    currency: '€',
    googleReviewUrl: 'https://g.page/r/example',
    tripAdvisorUrl: 'https://www.tripadvisor.it',
    tables: ['Tavolo 1', 'Tavolo 2', 'Tavolo 3', 'Molo Vista Mare'],
    subscription: {
      planName: 'Abbonamento Mensile Base',
      status: 'In Scadenza',
      endDate: '2026-10-31',
      monthlyFee: 29,
    },
    promoPopup: {
      title: '🐟 Benvenuti al Porto!',
      subtitle: 'Usa PORTOPESCATO per il 10% di sconto sul crudo di mare',
      couponCode: 'PORTOPESCATO',
      active: true,
    },
    coupons: [
      { id: 'cp1', code: 'PORTOPESCATO', discountPercent: 10, description: 'Sconto 10% menu mare', active: true }
    ]
  },
  {
    id: 'bistrotsancarlo',
    name: 'Bistrot San Carlo (Test Scaduto)',
    tagline: 'Caffetteria gourmet e pranzi veloci.',
    logo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80',
    coverImage: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80',
    address: 'Piazza Trieste e Trento 1, Napoli',
    phone: '+39 081 222 3344',
    email: 'sancarlo@menulab.it',
    adminEmail: 'admin@sancarlo.it',
    adminPassword: 'sancarlo123',
    isOpen: false,
    openingHours: 'Lun - Ven: 08:00 - 18:00',
    currency: '€',
    googleReviewUrl: '',
    tripAdvisorUrl: '',
    tables: ['Tavolo 1', 'Tavolo 2'],
    subscription: {
      planName: 'Abbonamento Mensile Base',
      status: 'Scaduto',
      endDate: '2026-10-20',
      monthlyFee: 29,
    },
  }
];

export const getStoredRestaurantsList = (): RestaurantInfo[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
    if (!data) return INITIAL_RESTAURANTS_LIST;
    const parsed: RestaurantInfo[] = JSON.parse(data);
    
    // Auto-migrate in case old entries lacked adminEmail or subscription
    const migrated = parsed.map(r => {
      const match = INITIAL_RESTAURANTS_LIST.find(i => i.id === r.id);
      return {
        ...r,
        adminEmail: r.adminEmail || match?.adminEmail || `admin@${r.id}.it`,
        adminPassword: r.adminPassword || match?.adminPassword || 'password123',
        subscription: r.subscription || match?.subscription || {
          planName: 'Abbonamento Mensile',
          status: 'Attivo',
          endDate: '2026-12-31',
          monthlyFee: 49,
        },
      };
    });
    return migrated;
  } catch {
    return INITIAL_RESTAURANTS_LIST;
  }
};

export const saveStoredRestaurantsList = (list: RestaurantInfo[]) => {
  localStorage.setItem(STORAGE_KEYS.RESTAURANTS, JSON.stringify(list));
  window.dispatchEvent(new Event('menulab_data_updated'));
};

export const resetToDefaultRestaurants = (): RestaurantInfo[] => {
  localStorage.setItem(STORAGE_KEYS.RESTAURANTS, JSON.stringify(INITIAL_RESTAURANTS_LIST));
  localStorage.setItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID, INITIAL_RESTAURANTS_LIST[0].id);
  window.dispatchEvent(new Event('menulab_data_updated'));
  return INITIAL_RESTAURANTS_LIST;
};

export const getStoredRestaurant = (restaurantId?: string): RestaurantInfo => {
  try {
    const list = getStoredRestaurantsList();
    const currentId = restaurantId || localStorage.getItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID);
    if (currentId) {
      const found = list.find(r => r.id.toLowerCase() === currentId.toLowerCase());
      if (found) return found;
    }
    return list[0] || INITIAL_RESTAURANT;
  } catch {
    return INITIAL_RESTAURANT;
  }
};

export const saveStoredRestaurant = (info: RestaurantInfo) => {
  const list = getStoredRestaurantsList();
  const updatedList = list.map(r => r.id === info.id ? info : r);
  if (!updatedList.some(r => r.id === info.id)) {
    updatedList.push(info);
  }
  saveStoredRestaurantsList(updatedList);
  localStorage.setItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID, info.id);
  window.dispatchEvent(new Event('menulab_data_updated'));
};

export const setCurrentRestaurantId = (id: string) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID, id);
  window.dispatchEvent(new Event('menulab_data_updated'));
};

export const getStoredDishes = (restaurantId?: string): Dish[] => {
  try {
    const targetRestId = restaurantId || localStorage.getItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID) || 'bellanapoli';
    const restSpecificKey = `menulab_dishes_${targetRestId}`;
    const specificData = localStorage.getItem(restSpecificKey);
    
    if (specificData) {
      return JSON.parse(specificData);
    }
    
    // Check if initial curated dishes exist for this restaurant
    if (INITIAL_RESTAURANT_DISHES[targetRestId]) {
      const curated = INITIAL_RESTAURANT_DISHES[targetRestId];
      localStorage.setItem(restSpecificKey, JSON.stringify(curated));
      return curated;
    }
    
    // If it's the default Bella Napoli
    if (targetRestId === 'bellanapoli') {
      const globalData = localStorage.getItem(STORAGE_KEYS.DISHES);
      const res = globalData ? JSON.parse(globalData) : INITIAL_DISHES;
      localStorage.setItem(restSpecificKey, JSON.stringify(res));
      return res;
    }

    // For any custom or newly created restaurant: generate their own unique starter menu
    const allRests = getStoredRestaurantsList();
    const rest = allRests.find(r => r.id.toLowerCase() === targetRestId.toLowerCase());
    const restName = rest?.name || 'Ristorante';
    const starters = createStarterDishesForRestaurant(restName, targetRestId);
    localStorage.setItem(restSpecificKey, JSON.stringify(starters));
    return starters;
  } catch {
    return INITIAL_DISHES;
  }
};

export const saveStoredDishes = (dishes: Dish[], restaurantId?: string) => {
  const targetRestId = restaurantId || localStorage.getItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID) || 'bellanapoli';
  localStorage.setItem(`menulab_dishes_${targetRestId}`, JSON.stringify(dishes));
  if (targetRestId === 'bellanapoli') {
    localStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
  }
  window.dispatchEvent(new Event('menulab_data_updated'));
};

export const getStoredCategories = (restaurantId?: string): string[] => {
  try {
    const targetRestId = restaurantId || localStorage.getItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID) || 'bellanapoli';
    const restSpecificKey = `menulab_categories_${targetRestId}`;
    const specificData = localStorage.getItem(restSpecificKey);
    
    if (specificData) {
      return JSON.parse(specificData);
    }

    if (INITIAL_RESTAURANT_CATEGORIES[targetRestId]) {
      const cats = INITIAL_RESTAURANT_CATEGORIES[targetRestId];
      localStorage.setItem(restSpecificKey, JSON.stringify(cats));
      return cats;
    }

    if (targetRestId === 'bellanapoli') {
      const globalData = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return globalData ? JSON.parse(globalData) : INITIAL_CATEGORIES;
    }

    localStorage.setItem(restSpecificKey, JSON.stringify(DEFAULT_STARTER_CATEGORIES));
    return DEFAULT_STARTER_CATEGORIES;
  } catch {
    return DEFAULT_STARTER_CATEGORIES;
  }
};

export const saveStoredCategories = (categories: string[], restaurantId?: string) => {
  const targetRestId = restaurantId || localStorage.getItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID) || 'bellanapoli';
  localStorage.setItem(`menulab_categories_${targetRestId}`, JSON.stringify(categories));
  if (targetRestId === 'bellanapoli') {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }
  window.dispatchEvent(new Event('menulab_data_updated'));
};

export const getStoredWaiterCalls = (restaurantId?: string): WaiterCall[] => {
  try {
    const targetRestId = restaurantId || localStorage.getItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID) || 'bellanapoli';
    const specificData = localStorage.getItem(`menulab_waiter_calls_${targetRestId}`);
    if (specificData) {
      return JSON.parse(specificData);
    }

    // Default starter calls only for bellanapoli demo
    if (targetRestId === 'bellanapoli') {
      const data = localStorage.getItem(STORAGE_KEYS.WAITER_CALLS);
      return data ? JSON.parse(data) : [
        { id: 'w1', restaurantId: 'bellanapoli', tableNumber: 'Tavolo 4', type: 'call_waiter', timestamp: Date.now() - 120000, status: 'pending' },
        { id: 'w2', restaurantId: 'bellanapoli', tableNumber: 'Tavolo 2', type: 'request_bill', timestamp: Date.now() - 300000, status: 'resolved' },
      ];
    }
    return [];
  } catch {
    return [];
  }
};

export const saveStoredWaiterCalls = (calls: WaiterCall[], restaurantId?: string) => {
  const targetRestId = restaurantId || localStorage.getItem(STORAGE_KEYS.CURRENT_RESTAURANT_ID) || 'bellanapoli';
  localStorage.setItem(`menulab_waiter_calls_${targetRestId}`, JSON.stringify(calls));
  if (targetRestId === 'bellanapoli') {
    localStorage.setItem(STORAGE_KEYS.WAITER_CALLS, JSON.stringify(calls));
  }
  window.dispatchEvent(new Event('menulab_calls_updated'));
};

export const getStoredReviews = (): ReviewItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    return data ? JSON.parse(data) : [
      { id: 'r1', rating: 5, comment: 'Pizza straordinaria, impasto leggerissimo e servizio impeccabile!', name: 'Marco R.', timestamp: Date.now() - 86400000 },
      { id: 'r2', rating: 5, comment: 'I paccheri alla Nerano sono divini. Torneremo sicuramente!', name: 'Elena B.', timestamp: Date.now() - 172800000 },
    ];
  } catch {
    return [];
  }
};

export const saveStoredReviews = (reviews: ReviewItem[]) => {
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  window.dispatchEvent(new Event('menulab_reviews_updated'));
};
