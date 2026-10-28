import { GoogleGenAI } from '@google/genai';
import { Dish } from '../types';

export const askAiSommelier = async (prompt: string, dishes: Dish[]): Promise<string> => {
  try {
    const response = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, dishes }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to communicate with AI');
    }

    const data = await response.json();
    return data.text || 'Mi dispiace, non è stato possibile generare una risposta al momento.';
  } catch (err: unknown) {
    console.error('Gemini API Error:', err);
    if (err instanceof Error) {
      return `Errore AI: ${err.message}. Assicurati che la chiave GEMINI_API_KEY sia configurata correttamente.`;
    }
    return 'Errore nella comunicazione con l\'assistente AI. Riprova più tardi.';
  }
};
