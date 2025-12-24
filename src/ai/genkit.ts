import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

if (!geminiApiKey && process.env.NODE_ENV !== 'production') {
  console.warn('Gemini API key is missing. Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment.');
}

export const ai = genkit({
  plugins: [googleAI({ apiKey: geminiApiKey })],
  model: 'googleai/gemini-2.5-flash',
});
