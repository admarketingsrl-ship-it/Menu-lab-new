import { Dish, RestaurantInfo, WaiterCall, TableOrder } from '../types';
import { 
  getStoredDishes, saveStoredDishes, 
  getStoredWaiterCalls, saveStoredWaiterCalls, 
  getStoredRestaurant, saveStoredRestaurant,
  getStoredTableOrders, saveStoredTableOrders,
  resetTableOrdersForTable, clearResolvedWaiterCalls
} from './store';
import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

type RealtimeMessageType = 
  | { type: 'NEW_CALL'; restaurantId: string; call: WaiterCall }
  | { type: 'RESOLVE_CALL'; restaurantId: string; callId: string }
  | { type: 'NEW_ORDER'; restaurantId: string; order: TableOrder }
  | { type: 'UPDATE_ORDER'; restaurantId: string; order: TableOrder }
  | { type: 'RESET_TABLE'; restaurantId: string; tableNumber: string }
  | { type: 'DISHES_UPDATED'; restaurantId: string; dishes: Dish[] }
  | { type: 'RESTAURANT_UPDATED'; restaurantId: string; restaurant: RestaurantInfo };

interface ScopedListener<T> {
  restaurantId?: string;
  fn: T;
}

class RealtimeManager {
  private channel: BroadcastChannel | null = null;
  private callsListeners: Set<ScopedListener<(calls: WaiterCall[], newCall?: WaiterCall) => void>> = new Set();
  private ordersListeners: Set<ScopedListener<(orders: TableOrder[], newOrder?: TableOrder) => void>> = new Set();
  private dishesListeners: Set<ScopedListener<(dishes: Dish[]) => void>> = new Set();
  private restaurantListeners: Set<ScopedListener<(restaurant: RestaurantInfo) => void>> = new Set();
  private resetListeners: Set<ScopedListener<(tableNumber: string) => void>> = new Set();
  
  private activeFirestoreCallsListeners = new Map<string, () => void>();
  private activeFirestoreOrdersListeners = new Map<string, () => void>();
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
        this.channel = new BroadcastChannel('menulab_realtime_bus_v4');
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
      } else if (e.key?.startsWith('menulab_table_orders_')) {
        const restId = e.key.replace('menulab_table_orders_', '');
        const orders = getStoredTableOrders(restId);
        this.notifyOrdersListeners(orders, undefined, restId);
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
      this.ensureFirestoreOrdersListener(currentRest.id);
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
   * Ensure a dynamic Firestore live listener is active for a specific restaurant's table orders
   */
  public ensureFirestoreOrdersListener(restaurantId: string) {
    if (!db || !restaurantId || this.activeFirestoreOrdersListeners.has(restaurantId.toLowerCase())) return;

    const restIdLower = restaurantId.toLowerCase();
    try {
      const ordersCol = collection(db, 'restaurants', restIdLower, 'tableOrders');
      const unsub = onSnapshot(ordersCol, (snapshot) => {
        const remoteOrders: TableOrder[] = [];
        snapshot.forEach((d) => {
          remoteOrders.push(d.data() as TableOrder);
        });
        remoteOrders.sort((a, b) => b.timestamp - a.timestamp);

        const localOrders = getStoredTableOrders(restIdLower);
        const localIds = new Set(localOrders.map((o) => o.id));

        const brandNew = remoteOrders.find((o) => !localIds.has(o.id) && o.status === 'pending');

        saveStoredTableOrders(remoteOrders, restIdLower);
        this.notifyOrdersListeners(remoteOrders, brandNew, restIdLower);
      }, (err) => {
        console.warn(`Firestore orders listener error for ${restIdLower}:`, err.message);
      });

      this.activeFirestoreOrdersListeners.set(restIdLower, unsub);
    } catch (e) {
      console.warn(`Error setting up Firestore orders listener for ${restIdLower}:`, e);
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

      case 'NEW_ORDER': {
        const restId = msg.restaurantId.toLowerCase();
        const orders = getStoredTableOrders(restId);
        if (!orders.some((o) => o.id === msg.order.id)) {
          const updated = [msg.order, ...orders];
          saveStoredTableOrders(updated, restId);
          this.notifyOrdersListeners(updated, msg.order, restId);
        } else {
          this.notifyOrdersListeners(orders, msg.order, restId);
        }
        break;
      }

      case 'UPDATE_ORDER': {
        const restId = msg.restaurantId.toLowerCase();
        const orders = getStoredTableOrders(restId);
        const updated = orders.map((o) => o.id === msg.order.id ? msg.order : o);
        saveStoredTableOrders(updated, restId);
        this.notifyOrdersListeners(updated, undefined, restId);
        break;
      }

      case 'RESET_TABLE': {
        const restId = msg.restaurantId.toLowerCase();
        resetTableOrdersForTable(msg.tableNumber, restId);
        const updatedOrders = getStoredTableOrders(restId);
        const updatedCalls = getStoredWaiterCalls(restId);
        this.notifyOrdersListeners(updatedOrders, undefined, restId);
        this.notifyCallsListeners(updatedCalls, undefined, restId);
        this.notifyResetListeners(msg.tableNumber, restId);
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

  private notifyOrdersListeners(orders: TableOrder[], newOrder?: TableOrder, restaurantId?: string) {
    this.ordersListeners.forEach((listener) => {
      if (!listener.restaurantId || !restaurantId || listener.restaurantId.toLowerCase() === restaurantId.toLowerCase()) {
        listener.fn(orders, newOrder);
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

  private notifyResetListeners(tableNumber: string, restaurantId?: string) {
    this.resetListeners.forEach((listener) => {
      if (!listener.restaurantId || !restaurantId || listener.restaurantId.toLowerCase() === restaurantId.toLowerCase()) {
        listener.fn(tableNumber);
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

    if (targetRestId) {
      this.ensureFirestoreCallsListener(targetRestId);
    }

    listener(getStoredWaiterCalls(targetRestId));

    return () => {
      this.callsListeners.delete(item);
    };
  }

  /**
   * Subscribe to live table orders for a specific restaurant.
   */
  public subscribeToOrders(
    listener: (orders: TableOrder[], newOrder?: TableOrder) => void,
    restaurantId?: string
  ): () => void {
    const targetRestId = restaurantId || getStoredRestaurant().id;
    const item: ScopedListener<(orders: TableOrder[], newOrder?: TableOrder) => void> = {
      restaurantId: targetRestId,
      fn: listener,
    };
    this.ordersListeners.add(item);

    if (targetRestId) {
      this.ensureFirestoreOrdersListener(targetRestId);
    }

    listener(getStoredTableOrders(targetRestId));

    return () => {
      this.ordersListeners.delete(item);
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

  private activeFirestoreRestaurantListeners = new Map<string, () => void>();

  /**
   * Ensure a dynamic Firestore live listener is active for a specific restaurant's profile
   */
  public ensureFirestoreRestaurantListener(restaurantId: string) {
    if (!db || !restaurantId || this.activeFirestoreRestaurantListeners.has(restaurantId.toLowerCase())) return;

    const restIdLower = restaurantId.toLowerCase();
    try {
      const restDocRef = doc(db, 'restaurants', restIdLower, 'info', 'profile');
      const unsub = onSnapshot(restDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteRest = snapshot.data() as RestaurantInfo;
          saveStoredRestaurant(remoteRest);
          this.notifyRestaurantListeners(remoteRest, restIdLower);
        }
      }, (err) => {
        console.warn(`Firestore restaurant listener error for ${restIdLower}:`, err.message);
      });

      this.activeFirestoreRestaurantListeners.set(restIdLower, unsub);
    } catch (e) {
      console.warn(`Error setting up Firestore restaurant listener for ${restIdLower}:`, e);
    }
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

    if (targetRestId) {
      this.ensureFirestoreRestaurantListener(targetRestId);
    }

    listener(getStoredRestaurant(targetRestId));
    return () => {
      this.restaurantListeners.delete(item);
    };
  }

  /**
   * Send a waiter call or bill request from customer device.
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

    const existing = getStoredWaiterCalls(restId);
    const updated = [newCall, ...existing];
    saveStoredWaiterCalls(updated, restId);

    try {
      this.channel?.postMessage({ type: 'NEW_CALL', restaurantId: restId, call: newCall });
    } catch (e) {
      console.warn('Error posting to BroadcastChannel:', e);
    }

    this.notifyCallsListeners(updated, newCall, restId);

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
   * Submit a new Table Order from customer device.
   */
  public async submitTableOrder(
    orderData: Omit<TableOrder, 'id' | 'timestamp' | 'status'>,
    restaurantId?: string
  ): Promise<TableOrder> {
    const restId = (restaurantId || orderData.restaurantId || getStoredRestaurant().id).toLowerCase();
    const newOrder: TableOrder = {
      ...orderData,
      restaurantId: restId,
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      status: 'pending',
    };

    const existing = getStoredTableOrders(restId);
    const updated = [newOrder, ...existing];
    saveStoredTableOrders(updated, restId);

    try {
      this.channel?.postMessage({ type: 'NEW_ORDER', restaurantId: restId, order: newOrder });
    } catch (e) {
      console.warn('Error posting to BroadcastChannel:', e);
    }

    this.notifyOrdersListeners(updated, newOrder, restId);

    try {
      if (db) {
        const docRef = doc(db, 'restaurants', restId, 'tableOrders', newOrder.id);
        await setDoc(docRef, newOrder);
      }
    } catch (e) {
      console.warn('Could not sync order to Firestore:', e);
    }

    return newOrder;
  }

  /**
   * Update table order status (e.g. accepted, completed) from manager dashboard.
   */
  public async updateTableOrderStatus(
    orderId: string, 
    status: TableOrder['status'], 
    restaurantId?: string
  ) {
    const restId = (restaurantId || getStoredRestaurant().id).toLowerCase();
    const existing = getStoredTableOrders(restId);
    const updated = existing.map((o) => o.id === orderId ? { ...o, status } : o);
    saveStoredTableOrders(updated, restId);

    const match = updated.find((o) => o.id === orderId);
    if (match) {
      try {
        this.channel?.postMessage({ type: 'UPDATE_ORDER', restaurantId: restId, order: match });
      } catch {}
    }

    this.notifyOrdersListeners(updated, undefined, restId);

    try {
      if (db) {
        const docRef = doc(db, 'restaurants', restId, 'tableOrders', orderId);
        await updateDoc(docRef, { status });
      }
    } catch (e) {
      console.warn('Could not update order status in Firestore:', e);
    }
  }

  /**
   * Subscribe to live table reset events (when manager closes table bill).
   */
  public subscribeToTableReset(
    listener: (tableNumber: string) => void,
    restaurantId?: string
  ): () => void {
    const targetRestId = restaurantId || getStoredRestaurant().id;
    const item: ScopedListener<(tableNumber: string) => void> = {
      restaurantId: targetRestId,
      fn: listener,
    };
    this.resetListeners.add(item);
    return () => {
      this.resetListeners.delete(item);
    };
  }

  /**
   * Reset / Clear table orders and calls when manager closes table bill.
   */
  public async resetTable(tableNumber: string, restaurantId?: string) {
    const restId = (restaurantId || getStoredRestaurant().id).toLowerCase();
    const cleanTbl = tableNumber.trim().toLowerCase();

    // 1. Delete all table orders and waiter calls in Firestore directly
    try {
      if (db) {
        const deleteOps: Promise<void>[] = [];

        // Fetch and delete matching table orders in Firestore
        const ordersCol = collection(db, 'restaurants', restId, 'tableOrders');
        const ordersSnap = await getDocs(ordersCol);
        ordersSnap.forEach((d) => {
          const ordData = d.data();
          if (ordData?.tableNumber && ordData.tableNumber.trim().toLowerCase() === cleanTbl) {
            deleteOps.push(deleteDoc(doc(db, 'restaurants', restId, 'tableOrders', d.id)).catch(() => {}));
          }
        });

        // Fetch and delete matching waiter calls in Firestore
        const callsCol = collection(db, 'restaurants', restId, 'waiterCalls');
        const callsSnap = await getDocs(callsCol);
        callsSnap.forEach((d) => {
          const callData = d.data();
          if (callData?.tableNumber && callData.tableNumber.trim().toLowerCase() === cleanTbl) {
            deleteOps.push(deleteDoc(doc(db, 'restaurants', restId, 'waiterCalls', d.id)).catch(() => {}));
          }
        });

        await Promise.all(deleteOps);
      }
    } catch (e) {
      console.warn('Could not reset table in Firestore:', e);
    }

    // 2. Clear from local storage
    resetTableOrdersForTable(tableNumber, restId);

    const updatedOrders = getStoredTableOrders(restId);
    const updatedCalls = getStoredWaiterCalls(restId);

    // 3. Broadcast to all open tabs and mobile devices
    try {
      this.channel?.postMessage({ type: 'RESET_TABLE', restaurantId: restId, tableNumber });
    } catch {}

    this.notifyOrdersListeners(updatedOrders, undefined, restId);
    this.notifyCallsListeners(updatedCalls, undefined, restId);
    this.notifyResetListeners(tableNumber, restId);
  }

  /**
   * Clear all resolved waiter calls and completed activity logs to give manager a pristine workspace.
   */
  public async clearAllResolvedCalls(restaurantId?: string) {
    const restId = (restaurantId || getStoredRestaurant().id).toLowerCase();
    clearResolvedWaiterCalls(restId);
    const updatedCalls = getStoredWaiterCalls(restId);
    this.notifyCallsListeners(updatedCalls, undefined, restId);

    try {
      if (db) {
        const callsCol = collection(db, 'restaurants', restId, 'waiterCalls');
        const snapshot = await getDocs(callsCol);
        for (const d of snapshot.docs) {
          if (d.data().status === 'resolved') {
            await deleteDoc(doc(db, 'restaurants', restId, 'waiterCalls', d.id)).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Could not clear resolved calls in Firestore:', e);
    }
  }

  /**
   * Mark a waiter call as resolved from the manager dashboard.
   */
  public async resolveWaiterCall(callId: string, restaurantId?: string) {
    const restId = (restaurantId || getStoredRestaurant().id).toLowerCase();
    const existing = getStoredWaiterCalls(restId);
    const updated = existing.map((c) => c.id === callId ? { ...c, status: 'resolved' as const } : c);
    saveStoredWaiterCalls(updated, restId);

    try {
      this.channel?.postMessage({ type: 'RESOLVE_CALL', restaurantId: restId, callId });
    } catch {}

    this.notifyCallsListeners(updated, undefined, restId);

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
    saveStoredDishes(dishes, restId);

    try {
      this.channel?.postMessage({ type: 'DISHES_UPDATED', restaurantId: restId, dishes });
    } catch {}

    this.notifyDishesListeners(dishes, restId);

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
   * Broadcast restaurant details (e.g. promo banners, table ordering toggle)
   */
  public async broadcastRestaurant(restaurant: RestaurantInfo) {
    const restId = restaurant.id.toLowerCase();
    saveStoredRestaurant(restaurant);
    try {
      this.channel?.postMessage({ type: 'RESTAURANT_UPDATED', restaurantId: restId, restaurant });
    } catch {}
    this.notifyRestaurantListeners(restaurant, restId);

    try {
      if (db) {
        const restDocRef = doc(db, 'restaurants', restId, 'info', 'profile');
        await setDoc(restDocRef, restaurant);
      }
    } catch (e) {
      console.warn('Could not sync restaurant profile to Firestore:', e);
    }
  }
}

export const realtimeManager = new RealtimeManager();
