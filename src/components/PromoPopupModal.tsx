import React, { useState } from 'react';
import { X, Sparkles, Tag, CheckCircle2 } from 'lucide-react';
import { PromoPopup } from '../types';

interface PromoPopupModalProps {
  popup: PromoPopup | undefined;
  isOpen: boolean;
  onClose: () => void;
  onApplyCoupon: (code: string) => void;
}

export const PromoPopupModal: React.FC<PromoPopupModalProps> = ({ popup, isOpen, onClose, onApplyCoupon }) => {
  const [inputCode, setInputCode] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !popup || !popup.active) return null;

  const handleApply = (codeToApply: string) => {
    onApplyCoupon(codeToApply);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-amber-500/30 p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="py-8 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">Coupon Applicato!</h3>
            <p className="text-sm text-zinc-400">I prezzi del menu sono ora scontati.</p>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black">{popup.title}</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{popup.subtitle}</p>
            </div>

            {popup.couponCode && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-sm">
                <Tag className="w-4 h-4" />
                {popup.couponCode}
              </div>
            )}

            <div className="space-y-3 pt-2">
              {popup.couponCode && (
                <button
                  onClick={() => handleApply(popup.couponCode!)}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/30 transition-all transform hover:scale-[1.02]"
                >
                  Applica Sconto Subito ({popup.couponCode})
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                Continua senza sconto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
