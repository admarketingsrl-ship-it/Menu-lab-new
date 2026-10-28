import React, { useState, useEffect } from 'react';
import { X, Bell, Receipt, Send, CheckCircle2, CreditCard, Banknote, Sparkles } from 'lucide-react';
import { WaiterCall } from '../types';

interface WaiterCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCall: (call: Omit<WaiterCall, 'id' | 'timestamp' | 'status'>) => void;
  tableNumber: string;
  isTableLocked?: boolean;
  initialType?: 'call_waiter' | 'request_bill';
}

export const WaiterCallModal: React.FC<WaiterCallModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmitCall,
  tableNumber,
  initialType = 'call_waiter',
}) => {
  const [callType, setCallType] = useState<'call_waiter' | 'request_bill'>(initialType);
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'carta' | 'contanti' | 'separato' | ''>('');
  const [submitted, setSubmitted] = useState(false);


  useEffect(() => {
    if (initialType) {
      setCallType(initialType);
    }
  }, [initialType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let fullNote = message.trim();
    if (callType === 'request_bill' && paymentMethod) {
      const payLabel = paymentMethod === 'carta' ? 'Pagamento con Carta/POS' : paymentMethod === 'contanti' ? 'Pagamento in Contanti' : 'Conto Separato';
      fullNote = fullNote ? `${payLabel} - ${fullNote}` : payLabel;
    }

    const defaultMsg = callType === 'call_waiter' ? 'Assistenza al tavolo' : 'Richiesta conto';

    onSubmitCall({
      tableNumber,
      type: callType,
      message: fullNote || defaultMsg,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      setPaymentMethod('');
      onClose();
    }, 2200);
  };

  const quickWaiterNotes = [
    '🌶️ Pepe / Olio piccante',
    '🧀 Parmigiano / Formaggio',
    '🍞 Pane / Grissini',
    '🧂 Sale / Olio / Aceto',
    '🥤 Bicchieri / Ghiaccio',
    '💧 Acqua naturale / Frizzante',
    '🍴 Posate / Tovaglioli',
    '👶 Seggiolone bimbi',
    '📝 Vorremmo ordinare'
  ];

  const handleSelectNote = (note: string) => {
    if (!message) {
      setMessage(note);
    } else if (!message.includes(note)) {
      setMessage(`${message}, ${note}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-10 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">
              {callType === 'call_waiter' ? 'Cameriere Chiamato!' : 'Richiesta Conto Inviata!'}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
              Notifica inviata in tempo reale al personale per <strong>{tableNumber}</strong>. Arriviamo subito!
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Notifica sonora ricevuta in cassa
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                callType === 'call_waiter' 
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                  : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
              }`}>
                {callType === 'call_waiter' ? <Bell className="w-6 h-6 animate-pulse" /> : <Receipt className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                  {callType === 'call_waiter' ? 'Chiama il Cameriere' : 'Richiedi il Conto'}
                </h3>
                <p className="text-xs text-zinc-500">Notifica istantanea inviata alla cassa e ai camerieri</p>
              </div>
            </div>

            {/* Strictly Locked Table Derived from Scanned QR Code (No manual selection) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/30">
                  {tableNumber.replace(/[^0-9A-Za-z]/g, '').slice(0, 4) || 'QR'}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                    Tavolo Rilevato da QR Code
                  </span>
                  <h4 className="text-base font-black text-zinc-900 dark:text-white">{tableNumber}</h4>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded-lg flex items-center gap-1">
                ✓ Tavolo Bloccato
              </span>
            </div>

            {/* Service Type Switcher */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCallType('call_waiter')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all ${
                  callType === 'call_waiter'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'
                }`}
              >
                <Bell className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-bold">Chiama Cameriere</span>
              </button>
              <button
                type="button"
                onClick={() => setCallType('request_bill')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all ${
                  callType === 'request_bill'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'
                }`}
              >
                <Receipt className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-bold">Chiedi il Conto</span>
              </button>
            </div>

            {/* Payment Method Selector for Bill Request */}
            {callType === 'request_bill' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Preferenza di Pagamento (Opzionale)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(paymentMethod === 'carta' ? '' : 'carta')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'carta'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Carta / POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod(paymentMethod === 'contanti' ? '' : 'contanti')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'contanti'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Contanti</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod(paymentMethod === 'separato' ? '' : 'separato')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'separato'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Conti Separati</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick chips for Waiter Call */}
            {callType === 'call_waiter' && (
              <div className="space-y-2">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Seleziona o scrivi cosa ti serve: il cameriere lo porterà direttamente al primo giro!</span>
                </div>

                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block pt-1">
                  Richieste rapide frequenti:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {quickWaiterNotes.map((note) => {
                    const isSelected = message.includes(note);
                    return (
                      <button
                        key={note}
                        type="button"
                        onClick={() => handleSelectNote(note)}
                        className={`text-[11px] px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-amber-400'
                        }`}
                      >
                        {note}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optional or Custom Direct Request Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                {callType === 'call_waiter' ? 'Richiesta Specifica per il Cameriere' : 'Note Aggiuntive sul Conto'}
              </label>
              <input
                type="text"
                placeholder={callType === 'call_waiter' ? 'Es. Pepe nero, olio piccante, un seggiolone bimbi...' : 'Es. Intestazione fattura, divisione in due...'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                callType === 'call_waiter'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25'
              }`}
            >
              <Send className="w-4 h-4" />
              {callType === 'call_waiter' 
                ? `Chiama Cameriere per ${tableNumber}` 
                : `Invia Richiesta Conto per ${tableNumber}`
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
