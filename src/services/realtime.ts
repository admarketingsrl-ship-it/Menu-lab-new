import { Dish, RestaurantInfo, WaiterCall } from '../types';
import { 
  getStoredDishes, saveStoredDishes, 
  getStoredWaiterCalls, saveStoredWaiterCalls, 
  getStoredRestaurant, saveStoredRestaurant 
} from './store';
import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

type RealtimeMessageType = 
  | { type: 'NEW_CALL'; restaurantId: string; call: WaiterCall }
  | { type: 'RESOLVE_CALL'; restaurantId: string; callId: string }
  | { type: 'DISHES_UPDATED'; restaurantId: string; dishes: Dish[] }
  | { type: 'RESTAURANT_UPDATED'; restaurantId: string; restaurant: RestaurantInfo };

interface ScopedListener<T> {
  restaurantId?: string;
  fn: T;
}

class RealtimeManager {
  private channel: BroadcastChannel | null = null;
  private callsListeners: Set<ScopedListener<(calls: WaiterCall[], newCall?: WaiterCall) => void>> = new Set();
  private dishesListeners: Set<ScopedListener<(dishes: Dish[]) => void>> = new Set();
  private restaurantListeners: Set<ScopedListener<(restaurant: RestaurantInfo) => void>> = new Set();
  
  private activeFirestoreCallsListeners = new Map<string, () => void>();
  private activeFirestoreDishesListeners = new Map<string, () => void>();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // 1. Setup BroadcastChannel for instant same-browser cross-tab sync
    try {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('menulab_realtime_bus_v3');
        this.channel.onmessage = (event: MessageEvent<RealtimeMessageType>) => {
          this.handleIncomingMessage(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // 2. Cross-tab localStorage event listener
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('menulab_waiter_calls_')) {
        const restId = e.key.replace('menulab_waiter_calls_', '');
        const calls = getStoredWaiterCalls(restId);
        this.notifyCallsListeners(calls, undefined, restId);
      } else if (e.key?.startsWith('menulab_dishes_')) {
        const restId = e.key.replace('menulab_dishes_', '');
        const dishes = getStoredDishes(restId);
        this.notifyDishesListeners(dishes, restId);
      } else if (e.key === 'menulab_restaurants_list_v3' || e.key === 'menulab_current_restaurant_id_v2') {
        const rest = getStoredRestaurant();
        this.notifyRestaurantListeners(rest, rest.id);
      }
    });

    // 3. Connect Firestore listener for current default restaurant
    const currentRest = getStoredRestaurant();
    if (currentRest?.id) {
      this.ensureFirestoreCallsListener(currentRest.id);
      this.ensureFirestoreDishesListener(currentRest.id);
    }
  }

  /**
   * Ensure a dynamic Firestore live listener is active for a specific restaurant's waiter calls
   */
  public ensureFirestoreCallsListener(restaurantId: string) {
    if (!db || !restaurantId || this.activeFirestoreCallsListeners.has(restaurantId.toLowerCase())) return;

    const restIdLower = restaurantId.toLowerCase();
    try {
      const callsCol = collection(db, 'restaurants', restIdLower, 'waiterCalls');
      const unsub = onSnapshot(callsCol, (snapshot) => {
        if (!snapshot.empty) {
          const remoteCalls: WaiterCall[] = [];
          snapshot.forEach((d) => {
            remoteCalls.push(d.data() as WaiterCall);
          });
          remoteCalls.sort((a, b) => b.timestamp - a.timestamp);

          const localCalls = getStoredWaiterCalls(restIdLower);
          const localIds = new Set(localCalls.map((c) => c.id));
          
          // Identify any new call arriving from Firestore that hasn't been saved locally yet
          const brandNew = remoteCalls.find((c) => !localIds.has(c.id) && c.status === 'pending');

          saveStoredWaiterCalls(remoteCalls, restIdLower);
          this.notifyCallsListeners(remoteCalls, brandNew, restIdLower);
        }
      }, (err) => {
        console.warn(`Firestore calls listener error for ${restIdLower}:`, err.message);
      });

      this.activeFirestoreCallsListeners.set(restIdLower, unsub);
    } catch (e) {
      console.warn(`Error setting up Firestore calls listener for ${restIdLower}:`, e);
    }
  }

  /**
   * Ensure a dynamic Firestore live listener is active for a specific restaurant's dishes
   */
  public ensureFirestoreDishesListener(restaurantId: string) {
    if (!db || !restaurantId || this.activeFirestoreDishesListeners.has(restaurantId.toLowerCase())) return;

    const restIdLower = restaurantId.toLowerCase();
    try {
      const dishesCol = collection(db, 'restaurants', restIdLower, 'dishes');
      const unsub = onSnapshot(dishesCol, (snapshot) => {
        if (!snapshot.empty) {
          const remoteDishes: Dish[] = [];
          snapshot.forEach((d) => {
            remoteDishes.push(d.data() as Dish);
          });
          saveStoredDishes(remoteDishes, restIdLower);
          this.notifyDishesListeners(remoteDishes, restIdLower);
        }
      }, (err) => {
        console.warn(`Firestore dishes listener error for ${restIdLower}:`, err.message);
      });

      this.activeFirestoreDishesListeners.set(restIdLower, unsub);
    } catch (e) {
      console.warn(`Error setting up Firestore dishes listener for ${restIdLower}:`, e);
    }
  }

  private handleIncomingMessage(msg: RealtimeMessageType) {
    if (!msg) return;

    switch (msg.type) {
      case 'NEW_CALL': {
        const restId = msg.restaurantId.toLowerCase();
        const calls = getStoredWaiterCalls(restId);
        if (!calls.some((c) => c.id === msg.call.id)) {
          const updated = [msg.call, ...calls];
          saveStoredWaiterCalls(updated, restId);
          this.notifyCallsListeners(updated, msg.call, restId);
        } else {
          this.notifyCallsListeners(calls, msg.call, restId);
        }
        break;
      }

      case 'RESOLVE_CALL': {
        const restId = msg.restaurantId.toLowerCase();
        const calls = getStoredWaiterCalls(restId);
        const updated = calls.map((c) => c.id === msg.callId ? { ...c, status: 'resolved' as const } : c);
        saveStoredWaiterCalls(updated, restId);
        this.notifyCallsListeners(updated, undefined, restId);
        break;
      }

      case 'DISHES_UPDATED': {
        const restId = msg.restaurantId.toLowerCase();
        saveStoredDishes(msg.dishes, restId);
        this.notifyDishesListeners(msg.dishes, restId);
        break;
      }

      case 'RESTAURANT_UPDATED': {
        const restId = msg.restaurantId.toLowerCase();
        saveStoredRestaurant(msg.restaurant);
        this.notifyRestaurantListeners(msg.restaurant, restId);
        break;
      }
    }
  }

  private notifyCallsListeners(calls: WaiterCall[], newCall?: WaiterCall, restaurantId?: string) {
    this.callsListeners.forEach((listener) => {
      if (!listener.restaurantId || !restaurantId || listener.restaurantId.toLowerCase() === restaurantId.toLowerCase()) {
        listener.fn(calls, newCall);
      }
    });
  }

  private notifyDishesListeners(dishes: Dish[], restaurantId?: string) {
    this.dishesListeners.forEach((listener) => {
      if (!listener.restaurantId || !restaurantId || listener.restaurantId.toLowerCase() === restaurantId.toLowerCase()) {
        listener.fn(dishes);
      }
    });
  }

  private notifyRestaurantListeners(restaurant: RestaurantInfo, restaurantId?: string) {
    this.restaurantListeners.forEach((listener) => {
      if (!listener.restaurantId || !restaurantId || listener.restaurantId.toLowerCase() === restaurantId.toLowerCase()) {
        listener.fn(restaurant);
      }
    });
  }

  // --- Public API ---

  /**
   * Subscribe to live waiter calls for a specific restaurant.
   */
  public subscribeToCalls(
    listener: (calls: WaiterCall[], newCall?: WaiterCall) => void,
    restaurantId?: string
  ): () => void {
    const targetRestId = restaurantId || getStoredRestaurant().id;
    const item: ScopedListener<(calls: WaiterCall[], newCall?: WaiterCall) => void> = {
      restaurantId: targetRestId,
      fn: listener,
    };
    this.callsListeners.add(item);

    // Automatically initialize Firestore live listener for this restaurant
    if (targetRestId) {
      this.ensureFirestoreCallsListener(targetRestId);
    }

    // Deliver initial cached calls
    listener(getStoredWaiterCalls(targetRestId));

    return () => {
      this.callsListeners.delete(item);
    };
  }

  /**
   * Subscribe to live dishes updates for a specific restaurant.
   */
  public subscribeToDishes(
    listener: (dishes: Dish[]) => void,
    restaurantId?: string
  ): () => void {
    const targetRestId = restaurantId || getStoredRestaurant().id;
    const item: ScopedListener<(dishes: Dish[]) => void> = {
      restaurantId: targetRestId,
      fn: listener,
    };
    this.dishesListeners.add(item);

    if (targetRestId) {
      this.ensureFirestoreDishesListener(targetRestId);
    }

    listener(getStoredDishes(targetRestId));

    return () => {
      this.dishesListeners.delete(item);
    };
  }

  /**
   * Subscribe to restaurant settings & active banners.
   */
  public subscribeToRestaurant(
    listener: (restaurant: RestaurantInfo) => void,
    restaurantId?: string
  ): () => void {
    const targetRestId = restaurantId || getStoredRestaurant().id;
    const item: ScopedListener<(restaurant: RestaurantInfo) => void> = {
      restaurantId: targetRestId,
      fn: listener,
    };
    this.restaurantListeners.add(item);
    listener(getStoredRestaurant(targetRestId));
    return () => {
      this.restaurantListeners.delete(item);
    };
  }

  /**
   * Send a waiter call or bill request from the customer's phone/device.
   */
  public async submitWaiterCall(
    callData: Omit<WaiterCall, 'id' | 'timestamp' | 'status'>,
    restaurantId?: string
  ): Promise<WaiterCall> {
    const restId = (restaurantId || callData.restaurantId || getStoredRestaurant().id).toLowerCase();
    const newCall: WaiterCall = {
      ...callData,
      restaurantId: restId,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      status: 'pending',
    };

    // 1. Update local storage immediately
    const existing = getStoredWaiterCalls(restId);
    const updated = [newCall, ...existing];
    saveStoredWaiterCalls(updated, restId);

    // 2. Broadcast via BroadcastChannel (for same browser tabs)
    try {
      this.channel?.postMessage({ type: 'NEW_CALL', restaurantId: restId, call: newCall });
    } catch (e) {
      console.warn('Error posting to BroadcastChannel:', e);
    }

    // 3. Dispatch to local listeners
    this.notifyCallsListeners(updated, newCall, restId);

    // 4. Persist to Firestore in real time for cross-device notification (phone -> manager screen)
    try {
      if (db) {
        const docRef = doc(db, 'restaurants', restId, 'waiterCalls', newCall.id);
        await setDoc(docRef, newCall);
        console.log(`[RealtimeManager] Waiter call ${newCall.id} synced to Firestore for restaurant ${restId}`);
      }
    } catch (e) {
      console.warn('Could not sync call to Firestore:', e);
    }

    return newCall;
  }

  /**
   * Mark a waiter call as resolved from the manager dashboard.
   */
  public async resolveWaiterCall(callId: string, restaurantId?: string) {
    const restId = (restaurantId || getStoredRestaurant().id).toLowerCase();
    // 1. Update local storage
    const existing = getStoredWaiterCalls(restId);
    const updated = existing.map((c) => c.id === callId ? { ...c, status: 'resolved' as const } : c);
    saveStoredWaiterCalls(updated, restId);

    // 2. Broadcast
    try {
      this.channel?.postMessage({ type: 'RESOLVE_CALL', restaurantId: restId, callId });
    } catch {}

    this.notifyCallsListeners(updated, undefined, restId);

    // 3. Firestore update
    try {
      if (db) {
        const docRef = doc(db, 'restaurants', restId, 'waiterCalls', callId);
        await updateDoc(docRef, { status: 'resolved' });
      }
    } catch (e) {
      console.warn('Could not resolve call in Firestore:', e);
    }
  }

  /**
   * Broadcast dishes update across all customer screens in real time.
   */
  public async broadcastDishes(dishes: Dish[], restaurantId?: string) {
    const restId = (restaurantId || getStoredRestaurant().id).toLowerCase();
    // 1. Save local
    saveStoredDishes(dishes, restId);

    // 2. Broadcast
    try {
      this.channel?.postMessage({ type: 'DISHES_UPDATED', restaurantId: restId, dishes });
    } catch {}

    this.notifyDishesListeners(dishes, restId);

    // 3. Firestore sync in background
    try {
      if (db) {
        for (const dish of dishes) {
          const docRef = doc(db, 'restaurants', restId, 'dishes', dish.id);
          await setDoc(docRef, dish);
        }
      }
    } catch (e) {
      console.warn('Could not sync dishes to Firestore:', e);
    }
  }

  /**
   * Broadcast restaurant details (e.g. promo banners, tables)
   */
  public broadcastRestaurant(restaurant: RestaurantInfo) {
    const restId = restaurant.id.toLowerCase();
    saveStoredRestaurant(restaurant);
    try {
      this.channel?.postMessage({ type: 'RESTAURANT_UPDATED', restaurantId: restId, restaurant });
    } catch {}
    this.notifyRestaurantListeners(restaurant, restId);
  }
}

export const realtimeManager = new RealtimeManager();
