import React, { useState } from 'react';
import { X, Star, Heart, CheckCircle2 } from 'lucide-react';
import { ReviewItem } from '../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (review: Omit<ReviewItem, 'id' | 'timestamp'>) => void;
  googleReviewUrl: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onSubmitReview, googleReviewUrl }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSubmitReview({
      rating,
      comment: comment.trim(),
      name: name.trim() || 'Ospite',
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Grazie per la tua recensione!</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Il tuo feedback è prezioso per continuare a migliorare la nostra cucina.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Lascia una Recensione</h3>
                <p className="text-xs text-zinc-500">Come è stata la tua esperienza gastronomica?</p>
              </div>
            </div>

            {/* Star Rating Picker */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transform hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {rating === 5 ? 'Eccezionale! ⭐⭐⭐⭐⭐' : rating === 4 ? 'Molto buono ⭐⭐⭐⭐' : `${rating} su 5 stelle`}
              </span>
            </div>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Il tuo Nome
              </label>
              <input
                type="text"
                placeholder="Es. Marco Rossi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Comment Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Commento
              </label>
              <textarea
                rows={3}
                required
                placeholder="Raccontaci dei piatti provati, del servizio o dell'atmosfera..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {googleReviewUrl && (
              <div className="text-center">
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Vuoi lasciare una recensione anche su Google Maps? Clicca qui ➔
                </a>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              Pubblica Recensione
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
