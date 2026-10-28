import React from 'react';
import { X, AlertTriangle, CheckCircle, Tag, Sparkles } from 'lucide-react';
import { Dish } from '../types';

interface DishModalProps {
  dish: Dish | null;
  currency: string;
  onClose: () => void;
  onOrderQuick?: (dish: Dish) => void;
}

export const DishModal: React.FC<DishModalProps> = ({ dish, currency, onClose }) => {
  if (!dish) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 relative transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/75 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Header */}
        <div className="relative h-72 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img
            src={dish.image}
            alt={dish.name}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white mb-2 shadow-sm">
                {dish.category}
              </span>
              <h2 className="text-2xl font-bold text-white leading-tight">{dish.name}</h2>
            </div>
            <div className="text-2xl font-black text-amber-400 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/10">
              {dish.price.toFixed(2)} {currency}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Descrizione</h4>
            <p className="text-zinc-700 dark:text-zinc-300 text-base leading-relaxed">
              {dish.description}
            </p>
          </div>

          {/* Badges & Dietary */}
          {(dish.badges && dish.badges.length > 0) || (dish.dietary && dish.dietary.length > 0) ? (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {dish.badges?.map((badge, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                  <Sparkles className="w-3.5 h-3.5" />
                  {badge}
                </span>
              ))}
              {dish.dietary?.map((diet, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {diet}
                </span>
              ))}
            </div>
          ) : null}

          {/* Allergens Warning */}
          {dish.allergens && dish.allergens.length > 0 && (
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-sm mb-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Allergeni e Informazioni</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dish.allergens.map((alg, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-amber-100 dark:border-amber-900/30">
                    {alg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability Status */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${dish.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {dish.isAvailable ? 'Disponibile al tavolo' : 'Temporaneamente esaurito'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
