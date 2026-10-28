import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dish } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDishes: (dishes: Dish[]) => void;
  existingCategories: string[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImportDishes, existingCategories }) => {
  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const templateData = [
      {
        Nome: 'Pizza Margherita DOC',
        Descrizione: 'Pomodoro, mozzarella di bufala, basilico',
        Prezzo: 10.00,
        Categoria: 'Pizze Tradizionali',
        Immagine: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80',
        Allergeni: 'Glutine, Lattosio',
        Disponibile: 'SI',
        Special: 'NO',
        Badge: 'Classico',
        Dietary: 'Vegetariano'
      },
      {
        Nome: 'Tiramisù della Casa',
        Descrizione: 'Savoiardi, mascarpone fresco, caffè arabica',
        Prezzo: 7.00,
        Categoria: 'Dolci Artigianali',
        Immagine: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
        Allergeni: 'Glutine, Lattosio, Uova',
        Disponibile: 'SI',
        Special: 'SI',
        Badge: 'Artigianale',
        Dietary: 'Vegetariano'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu');
    XLSX.writeFile(workbook, 'Template_MenuLab.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        if (!data || data.length === 0) {
          throw new Error('Il file Excel è vuoto o non formattato correttamente.');
        }

        const parsedDishes: Dish[] = data.map((row, idx) => {
          const name = String(row['Nome'] || row['nome'] || `Piatto ${idx + 1}`);
          const description = String(row['Descrizione'] || row['descrizione'] || '');
          const price = Number(row['Prezzo'] || row['prezzo'] || 10);
          const category = String(row['Categoria'] || row['categoria'] || existingCategories[0] || 'Altro');
          const image = String(row['Immagine'] || row['immagine'] || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80');
          const allergensStr = String(row['Allergeni'] || row['allergeni'] || '');
          const allergens = allergensStr ? allergensStr.split(',').map((s) => s.trim()) : [];
          
          const dispVal = String(row['Disponibile'] || row['disponibile'] || 'SI').toUpperCase();
          const isAvailable = dispVal === 'SI' || dispVal === 'TRUE' || dispVal === '1';

          const specVal = String(row['Special'] || row['special'] || row['Offerta'] || 'NO').toUpperCase();
          const isSpecial = specVal === 'SI' || specVal === 'TRUE' || specVal === '1';

          const badgeStr = String(row['Badge'] || row['badge'] || '');
          const badges = badgeStr ? badgeStr.split(',').map((s) => s.trim()) : undefined;

          const dietStr = String(row['Dietary'] || row['dietary'] || '');
          const dietary = dietStr ? (dietStr.split(',').map((s) => s.trim()) as any) : undefined;

          return {
            id: `excel_${Date.now()}_${idx}`,
            name,
            description,
            price: isNaN(price) ? 10 : price,
            category,
            image,
            allergens,
            isAvailable,
            isSpecial,
            badges,
            dietary,
          };
        });

        onImportDishes(parsedDishes);
        setSuccessCount(parsedDishes.length);
        setLoading(false);
      } catch (err: unknown) {
        console.error(err);
        setErrorMsg('Errore nella lettura del file Excel. Assicurati che le colonne corrispondano al template.');
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Errore di lettura file.');
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Importazione Rapida da Excel</h3>
            <p className="text-xs text-zinc-500">Aggiorna l'intero menu in un solo click con un file .xlsx</p>
          </div>
        </div>

        {successCount !== null ? (
          <div className="py-8 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-white">Importati {successCount} Piatti!</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Il database del ristorante è stato aggiornato correttamente.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-sm"
            >
              Chiudi e Visualizza Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template Download */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Scarica il Modello Excel</h4>
                <p className="text-xs text-zinc-500">Usa questo file come traccia per inserire i tuoi piatti.</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Template.xlsx
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Drag & Drop Upload box */}
            <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-8 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors group cursor-pointer bg-zinc-50/50 dark:bg-zinc-800/20">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">
                    {loading ? 'Elaborazione in corso...' : 'Trascina qui il file .xlsx o clicca per sfogliare'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Supporta fogli Excel con colonne Nome, Prezzo, Categoria, ecc.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
