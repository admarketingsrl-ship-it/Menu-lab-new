import { Dish, RestaurantInfo, WaiterCall } from '../types';
import { 
  getStoredDishes, saveStoredDishes, 
  getStoredWaiterCalls, saveStoredWaiterCalls, 
  getStoredRestaurant, saveStoredRestaurant 
} from './store';
import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { soundService } from './sound';

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
  private firestoreUnsubscribers: (() => void)[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // 1. Setup BroadcastChannel for instant cross-tab real-time sync
    try {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('menulab_realtime_bus_v2');
        this.channel.onmessage = (event: MessageEvent<RealtimeMessageType>) => {
          this.handleIncomingMessage(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // 2. Setup storage event listener as cross-tab fallback
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

    // 3. Connect Firestore live listeners if available
    this.initFirestoreSync();
  }

  private initFirestoreSync() {
    try {
      if (!db) return;
      const currentRest = getStoredRestaurant();
      const restId = currentRest.id || 'pizzeriavesuvio';

      // Live Firestore Waiter Calls
      const callsCol = collection(db, 'restaurants', restId, 'waiterCalls');
      const unsubCalls = onSnapshot(callsCol, (snapshot) => {
        if (!snapshot.empty) {
          const remoteCalls: WaiterCall[] = [];
          snapshot.forEach((d) => {
            remoteCalls.push(d.data() as WaiterCall);
          });
          remoteCalls.sort((a, b) => b.timestamp - a.timestamp);
          
          // Check for any newly arrived pending call
          const localCalls = getStoredWaiterCalls();
          const localIds = new Set(localCalls.map((c) => c.id));
          const brandNew = remoteCalls.find((c) => !localIds.has(c.id) && c.status === 'pending');

          saveStoredWaiterCalls(remoteCalls);
          this.notifyCallsListeners(remoteCalls, brandNew);
        }
      }, (err) => {
        // Silently fallback to local BroadcastChannel
        console.warn('Firestore live listener offline or permission restricted, using local real-time channel:', err.message);
      });
      this.firestoreUnsubscribers.push(unsubCalls);

      // Live Firestore Dishes
      const dishesCol = collection(db, 'restaurants', restId, 'dishes');
      const unsubDishes = onSnapshot(dishesCol, (snapshot) => {
        if (!snapshot.empty) {
          const remoteDishes: Dish[] = [];
          snapshot.forEach((d) => {
            remoteDishes.push(d.data() as Dish);
          });
          saveStoredDishes(remoteDishes);
          this.notifyDishesListeners(remoteDishes);
        }
      }, (err) => {
        console.warn('Firestore dishes live listener offline, using local channel:', err.message);
      });
      this.firestoreUnsubscribers.push(unsubDishes);

    } catch (e) {
      console.warn('Error connecting Firestore live sync:', e);
    }
  }

  private handleIncomingMessage(msg: RealtimeMessageType) {
    if (!msg) return;

    switch (msg.type) {
      case 'NEW_CALL': {
        const restId = msg.restaurantId;
        const calls = getStoredWaiterCalls(restId);
        // Avoid duplicate if already stored
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
        const restId = msg.restaurantId;
        const calls = getStoredWaiterCalls(restId);
        const updated = calls.map((c) => c.id === msg.callId ? { ...c, status: 'resolved' as const } : c);
        saveStoredWaiterCalls(updated, restId);
        this.notifyCallsListeners(updated, undefined, restId);
        break;
      }

      case 'DISHES_UPDATED': {
        const restId = msg.restaurantId;
        saveStoredDishes(msg.dishes, restId);
        this.notifyDishesListeners(msg.dishes, restId);
        break;
      }

      case 'RESTAURANT_UPDATED': {
        const restId = msg.restaurantId;
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
    const item: ScopedListener<(calls: WaiterCall[], newCall?: WaiterCall) => void> = {
      restaurantId,
      fn: listener,
    };
    this.callsListeners.add(item);
    // Initial call
    listener(getStoredWaiterCalls(restaurantId));
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
    const item: ScopedListener<(dishes: Dish[]) => void> = {
      restaurantId,
      fn: listener,
    };
    this.dishesListeners.add(item);
    // Initial call
    listener(getStoredDishes(restaurantId));
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
    const item: ScopedListener<(restaurant: RestaurantInfo) => void> = {
      restaurantId,
      fn: listener,
    };
    this.restaurantListeners.add(item);
    listener(getStoredRestaurant(restaurantId));
    return () => {
      this.restaurantListeners.delete(item);
    };
  }

  /**
   * Send a waiter call or bill request from the customer's device.
   */
  public async submitWaiterCall(
    callData: Omit<WaiterCall, 'id' | 'timestamp' | 'status'>,
    restaurantId?: string
  ): Promise<WaiterCall> {
    const restId = restaurantId || callData.restaurantId || getStoredRestaurant().id;
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

    // 2. Broadcast via BroadcastChannel
    try {
      this.channel?.postMessage({ type: 'NEW_CALL', restaurantId: restId, call: newCall });
    } catch (e) {
      console.warn('Error posting to BroadcastChannel:', e);
    }

    // 3. Dispatch window event for current window
    this.notifyCallsListeners(updated, newCall, restId);

    // 4. Persist to Firestore if online
    try {
      if (db) {
        const docRef = doc(db, 'restaurants', restId, 'waiterCalls', newCall.id);
        await setDoc(docRef, newCall);
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
    const restId = restaurantId || getStoredRestaurant().id;
    // 1. Update local storage
    const existing = getStoredWaiterCalls(restId);
    const updated = existing.map((c) => c.id === callId ? { ...c, status: 'resolved' as const } : c);
    saveStoredWaiterCalls(updated, restId);

    // 2. Broadcast
    try {
      this.channel?.postMessage({ type: 'RESOLVE_CALL', restaurantId: restId, callId });
    } catch {}

    this.notifyCallsListeners(updated, undefined, restId);

    // 3. Firestore
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
    const restId = restaurantId || getStoredRestaurant().id;
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
    saveStoredRestaurant(restaurant);
    try {
      this.channel?.postMessage({ type: 'RESTAURANT_UPDATED', restaurantId: restaurant.id, restaurant });
    } catch {}
    this.notifyRestaurantListeners(restaurant, restaurant.id);
  }
}

export const realtimeManager = new RealtimeManager();
