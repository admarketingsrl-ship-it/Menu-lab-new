import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

async function createServer() {
  const app = express();
  app.use(express.json());

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  // Gemini Proxy Endpoint
  app.post('/api/ai/ask', async (req, res) => {
    const { prompt, dishes } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const menuSummary = dishes.map((d: any) => `- ${d.name} (${d.category}, ${d.price}€): ${d.description} [Allergeni: ${d.allergens.join(', ')}]`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Sei il sommelier, maitre e chef esperto di "MenuLab". Ecco l'elenco completo dei piatti disponibili nel nostro menu:\n${menuSummary}\n\nL'utente richiede:\n"${prompt}"\n\nFornisci una risposta accattivante, professionale, dettagliata e deliziosa in italiano, proponendo abbinamenti vino o menu impacchettati (es. menu degustazione) basati ESATTAMENTE sui piatti presenti nel menu sopra.`,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Server-side Gemini API Error:', err);
      res.status(500).json({ error: err.message || 'Error communicating with Gemini' });
    }
  });

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

createServer();
