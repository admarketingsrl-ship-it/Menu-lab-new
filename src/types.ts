export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  allergens: string[];
  isAvailable: boolean;
  isSpecial?: boolean;
  badges?: string[];
  dietary?: ('Vegetariano' | 'Vegano' | 'Senza Glutine' | 'Senza Lattosio')[];
}

export interface CouponCode {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  active: boolean;
}

export interface PromoPopup {
  title: string;
  subtitle: string;
  couponCode?: string;
  active: boolean;
}

export interface SubscriptionInfo {
  planName: string;
  status: 'Attivo' | 'In Scadenza' | 'Scaduto';
  endDate: string;
  monthlyFee: number;
  tableOrderingEnabled?: boolean;
}

export interface RestaurantInfo {
  id: string;
  name: string;
  tagline: string;
  logo: string;
  coverImage: string;
  address: string;
  phone: string;
  email: string;
  adminEmail?: string;
  adminPassword?: string;
  isOpen: boolean;
  openingHours: string;
  currency: string;
  googleReviewUrl: string;
  tripAdvisorUrl: string;
  activeBanner?: {
    title: string;
    subtitle: string;
    active: boolean;
  };
  promoPopup?: PromoPopup;
  coupons?: CouponCode[];
  subscription?: SubscriptionInfo;
  tables?: string[]; // e.g. ['Tavolo 1', 'Tavolo 2', ...]
  tableOrderingEnabled?: boolean; // Feature flag for ordering directly from table QR
  menuTheme?: 'standard' | 'casual' | 'luxury'; // Visual theme for customer menu layout
  menuThemeBackground?: 'white' | 'black'; // Background color choice for standard layout
}

export interface WaiterCall {
  id: string;
  restaurantId?: string;
  tableNumber: string;
  type: 'call_waiter' | 'request_bill' | 'custom';
  message?: string;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  notes?: string;
}

export interface TableOrderItem {
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface TableOrder {
  id: string;
  restaurantId: string;
  tableNumber: string;
  items: TableOrderItem[];
  totalAmount: number;
  note?: string; // Overall order note from customer (e.g., "Invia insieme al bere", "Senza glutine")
  timestamp: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  name?: string;
  timestamp: number;
}
