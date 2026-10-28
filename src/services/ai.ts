import { GoogleGenAI } from '@google/genai';
import { Dish } from '../types';

export const askAiSommelier = async (prompt: string, dishes: Dish[]): Promise<string> => {
  try {
    const apiKey = 
      import.meta.env.VITE_GEMINI_API_KEY || 
      (typeof process !== 'undefined' && (process.env as any)?.GEMINI_API_KEY) || 
      (window as any).GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
    const ai = new GoogleGenAI({ apiKey });

    const menuSummary = dishes.map(d => `- ${d.name} (${d.category}, ${d.price}€): ${d.description} [Allergeni: ${d.allergens.join(', ')}]`).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Sei il sommelier, maitre e chef esperto di "MenuLab". Ecco l'elenco completo dei piatti disponibili nel nostro menu:\n${menuSummary}\n\nL'utente richiede:\n"${prompt}"\n\nFornisci una risposta accattivante, professionale, dettagliata e deliziosa in italiano, proponendo abbinamenti vino o menu impacchettati (es. menu degustazione) basati ESATTAMENTE sui piatti presenti nel menu sopra.`,
    });

    return response.text || 'Mi dispiace, non è stato possibile generare una risposta al momento.';
  } catch (err: unknown) {
    console.error('Gemini API Error:', err);
    if (err instanceof Error) {
      return `Errore AI: ${err.message}. Assicurati che la chiave GEMINI_API_KEY sia configurata correttamente.`;
    }
    return 'Errore nella comunicazione con l\'assistente AI. Riprova più tardi.';
  }
};
