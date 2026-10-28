import React from 'react';
import { Sparkles, Heart, Utensils, CheckCircle2 } from 'lucide-react';
import { RestaurantInfo } from '../types';

interface TableClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  restaurant: RestaurantInfo;
}

export const TableClosedModal: React.FC<TableClosedModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  restaurant,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative text-center space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Celebration Badge */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 bg-amber-500/20 rounded-3xl animate-ping" />
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/30 relative">
            <Heart className="w-10 h-10 animate-bounce text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-black">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Conto Saldato & Tavolo Resettato</span>
          </div>

          <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
            Grazie per la visita!
          </h3>

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xs mx-auto">
            Il conto per il <strong>{tableNumber}</strong> è stato chiuso regolarmente dalla cassa. Speriamo che il pranzo/cena da <strong>{restaurant.name}</strong> sia stato fantastico!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs space-y-1">
          <p className="font-bold flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Torna a trovarci presto!
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Mostra la tua recensione in cassa per ricevere lo sconto fedeltà alla prossima visita.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Utensils className="w-4 h-4" />
          <span>Torna al Menu Digitale</span>
        </button>
      </div>
    </div>
  );
};
