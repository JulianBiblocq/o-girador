/**
 * Service d'analyse Gemini Vision pour l'Atelier Papier (< 110 lignes).
 * Gère l'appel REST direct à Gemini et la saisie interactive de clé API.
 */
import { buildGeminiVisionPaperPrompt, VisionPromptOptions } from './geminiVisionPaperPrompt';

export interface VisionSinglePatternData {
  name: string;
  detectedTimeSig?: string;
  beatResolutions?: number[];
  totalSteps?: number;
  lines: Array<{ role: string; isVariation?: boolean; beats: string[][] }>;
}

export interface VisionScanResponse {
  success: boolean;
  songTitle?: string;
  globalBpm?: number;
  globalTimeSig?: string;
  pattern?: VisionSinglePatternData;
  patterns?: VisionSinglePatternData[];
  sequence?: string[];
  error?: string;
}

const STORAGE_KEY = 'girador_gemini_api_key';

export function getStoredGeminiApiKey(): string | null {
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();
  try {
    const local = localStorage.getItem(STORAGE_KEY)?.trim();
    if (local) return local;
  } catch {}
  const fbKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  if (fbKey && typeof fbKey === 'string' && fbKey.trim()) return fbKey.trim();
  return null;
}

export function saveStoredGeminiApiKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function clearStoredGeminiApiKey(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function requestUserApiKey(lang: string, isRetry = false): string | null {
  const msg = isRetry
    ? (lang === 'fr' ? 'Clé Gemini API invalide ou non activée (HTTP 400/403). Saisissez une clé Google AI Studio valide :' : 'Chave Gemini API inválida/desativada (400/403). Insira chave válida do Google AI Studio :')
    : (lang === 'fr' ? 'Clé Gemini API requise pour le scan photo (aistudio.google.com). Collez votre clé :' : 'Chave Gemini API necessária para escaneamento (aistudio.google.com). Cole sua chave :');
  const input = typeof window !== 'undefined' ? window.prompt(msg) : null;
  if (input?.trim()) { saveStoredGeminiApiKey(input); return input.trim(); }
  return null;
}

export async function analyzePaperImageWithVision(
  imageDataUrl: string,
  options: VisionPromptOptions
): Promise<VisionScanResponse> {
  const lang = options.lang || 'fr';
  let apiKey = getStoredGeminiApiKey();

  if (!apiKey) {
    apiKey = requestUserApiKey(lang, false);
    if (!apiKey) {
      return {
        success: false,
        error: lang === 'fr'
          ? 'Clé Gemini API manquante. Renseignez votre clé Google AI Studio (aistudio.google.com).'
          : 'Chave Gemini API ausente. Obtenha uma chave no Google AI Studio (aistudio.google.com).',
      };
    }
  }

  const prompt = buildGeminiVisionPaperPrompt(options);
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = imageDataUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
  };

  try {
    let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      clearStoredGeminiApiKey();
      const newKey = requestUserApiKey(lang, true);
      if (newKey) {
        apiKey = newKey;
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.error?.message || `HTTP ${res.status}`;
      return {
        success: false,
        error: `${lang === 'fr' ? 'Erreur Gemini Vision' : 'Erro Gemini Vision'} (${res.status}): ${detail}`,
      };
    }

    const json = await res.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { success: true, ...parsed };
  } catch (err: any) {
    return {
      success: false,
      error: `${lang === 'fr' ? 'Échec de connexion Gemini' : 'Falha de conexão Gemini'}: ${err?.message || 'Erreur réseau'}`,
    };
  }
}
