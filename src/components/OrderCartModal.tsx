import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, Send, CheckCircle2, Clock, Sparkles, AlertCircle, Utensils } from 'lucide-react';
import { CartItem, RestaurantInfo, TableOrder } from '../types';

interface OrderCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  restaurant: RestaurantInfo;
  cartItems: CartItem[];
  appliedDiscountPercent?: number;
  onUpdateQuantity: (dishId: string, delta: number) => void;
  onUpdateItemNotes: (dishId: string, notes: string) => void;
  onClearCart: () => void;
  onSubmitOrder: (generalNote: string) => Promise<void>;
  submittedOrders: TableOrder[];
}

export const OrderCartModal: React.FC<OrderCartModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  restaurant,
  cartItems,
  appliedDiscountPercent = 0,
  onUpdateQuantity,
  onUpdateItemNotes,
  onClearCart,
  onSubmitOrder,
  submittedOrders,
}) => {
  const [generalNote, setGeneralNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'cart' | 'history'>('cart');

  if (!isOpen) return null;

  const rawSubtotal = cartItems.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  const discountAmount = (rawSubtotal * appliedDiscountPercent) / 100;
  const finalTotal = rawSubtotal - discountAmount;

  // Active table cumulative total from submitted orders
  const cumulativeSubmittedTotal = submittedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmitOrder(generalNote);
      setShowSuccessToast(true);
      setGeneralNote('');
      setTimeout(() => {
        setShowSuccessToast(false);
        setActiveTab('history');
      }, 1500);
    } catch (e) {
      console.error('Error submitting table order:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white">Ordine dal Tavolo</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {tableNumber}
                </span>
              </div>
              <p className="text-xs text-zinc-500">Invia i tuoi piatti direttamente in cucina</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Carrello vs Ordini Inviati */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-800/40 p-1.5 m-3 rounded-2xl">
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'cart'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Nuovo Ordine ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Ordini Inviati al Tavolo</span>
            {submittedOrders.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {submittedOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {showSuccessToast && (
            <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-black text-sm">Ordine inviato con successo!</p>
                <p className="text-xs text-white/90">I piatti scelti sono stati ricevuti dalla cassa per il {tableNumber}.</p>
              </div>
            </div>
          )}

          {activeTab === 'cart' ? (
            cartItems.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">Il carrello è vuoto</h4>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Sfoglia il menu e clicca su "+ Aggiungi" sui piatti che desideri ordinare per il tuo tavolo.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Items List */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {cartItems.map((item) => {
                    const itemTotal = item.dish.price * item.quantity;
                    return (
                      <div 
                        key={item.dish.id}
                        className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={item.dish.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">{item.dish.name}</h4>
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-black">
                                {item.dish.price.toFixed(2)} {restaurant.currency} cad.
                              </p>
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.dish.id, -1)}
                              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-0.5"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-xs min-w-[16px] text-center text-zinc-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.dish.id, 1)}
                              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-0.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Note specifically for this dish item */}
                        <div className="pt-1">
                          <input
                            type="text"
                            placeholder="Note per questo piatto (es. Senza cipolla, salsa a parte...)"
                            value={item.notes || ''}
                            onChange={(e) => onUpdateItemNotes(item.dish.id, e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall General Order Note */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Note Generali per l'Ordine (Opzionale)
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Portare prima le bevande, allergia al pepe..."
                    value={generalNote}
                    onChange={(e) => setGeneralNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Totals Summary Box */}
                <div className="p-4 rounded-2xl bg-zinc-900 text-white space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Subtotale Ordine:</span>
                    <span>{rawSubtotal.toFixed(2)} {restaurant.currency}</span>
                  </div>

                  {appliedDiscountPercent > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                      <span>Sconto Coupon (-{appliedDiscountPercent}%):</span>
                      <span>-{discountAmount.toFixed(2)} {restaurant.currency}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-base font-black">
                    <span className="text-amber-400">Totale Ordine:</span>
                    <span className="text-amber-400">{finalTotal.toFixed(2)} {restaurant.currency}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                    title="Svuota carrello"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Invia Ordine al Tavolo ({tableNumber})</span>
                  </button>
                </div>

              </form>
            )
          ) : (
            /* HISTORY TAB: Ordini già inviati al tavolo */
            <div className="space-y-4">
              {submittedOrders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Utensils className="w-10 h-10 text-zinc-400 mx-auto" />
                  <h4 className="text-base font-bold text-zinc-900 dark:text-white">Nessun ordine inviato finora</h4>
                  <p className="text-xs text-zinc-500">Gli ordini inviati dal tuo tavolo appariranno qui con il riepilogo della spesa.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                        Totale Conto Cumulativo {tableNumber}
                      </p>
                      <h4 className="text-lg font-black text-zinc-900 dark:text-white">
                        {cumulativeSubmittedTotal.toFixed(2)} {restaurant.currency}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-sm">
                      {submittedOrders.length} {submittedOrders.length === 1 ? 'ordine' : 'ordini'}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {submittedOrders.map((ord, idx) => (
                      <div key={ord.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-white">
                            Ordine #{submittedOrders.length - idx} • {new Date(ord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          }`}>
                            {ord.status === 'pending' ? 'Inviato alla Cassa' : 'Accettato in Cucina'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {ord.items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-zinc-700 dark:text-zinc-300">
                                <strong>{it.quantity}x</strong> {it.dishName} {it.notes && <em className="text-zinc-400">({it.notes})</em>}
                              </span>
                              <span className="font-semibold text-zinc-900 dark:text-white">
                                {(it.price * it.quantity).toFixed(2)} {restaurant.currency}
                              </span>
                            </div>
                          ))}
                        </div>

                        {ord.note && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 italic bg-amber-500/10 p-2 rounded-xl">
                            Note: "{ord.note}"
                          </p>
                        )}

                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center text-xs font-black">
                          <span className="text-zinc-500">Subtotale Ordine:</span>
                          <span className="text-amber-600 dark:text-amber-400">{ord.totalAmount.toFixed(2)} {restaurant.currency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
