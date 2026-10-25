/**
 * Service d'analyse visuelle pour l'Atelier Papier (< 130 lignes).
 * Cascade multi-modèles anti-quota 429, mémorisation de session et gestion de clé.
 */
import { buildGeminiVisionPaperPrompt, VisionPromptOptions } from './geminiVisionPaperPrompt';

export interface VisionSinglePatternData {
  name: string; detectedTimeSig?: string; beatResolutions?: number[]; totalSteps?: number;
  lines: Array<{ role: string; isVariation?: boolean; beats: string[][] }>;
}

export interface VisionScanResponse {
  success: boolean; songTitle?: string; globalBpm?: number; globalTimeSig?: string;
  pattern?: VisionSinglePatternData; patterns?: VisionSinglePatternData[]; sequence?: string[]; error?: string;
}

const STORAGE_KEY = 'girador_gemini_api_key';
const ACTIVE_MODEL_KEY = 'girador_active_scan_model_idx';

export const SCAN_VISION_MODELS = [
  'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-3.8-flash',
] as const;

export function getStoredGeminiApiKey(): string | null {
  const env = (import.meta as any).env;
  const envKey = env?.VITE_GEMINI_API_KEY || env?.GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();
  try { const local = localStorage.getItem(STORAGE_KEY)?.trim(); if (local) return local; } catch {}
  return (env?.VITE_FIREBASE_API_KEY && typeof env.VITE_FIREBASE_API_KEY === 'string') ? env.VITE_FIREBASE_API_KEY.trim() : null;
}

export function saveStoredGeminiApiKey(key: string): void {
  try { if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim()); else localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function clearStoredGeminiApiKey(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function requestUserApiKey(lang: string, isRetry = false): string | null {
  const msg = isRetry
    ? (lang === 'fr' ? "Clé d'accès invalide ou non activée (HTTP 400/403). Saisissez une clé valide :" : 'Chave de acesso inválida ou desativada (400/403). Insira uma chave válida :')
    : (lang === 'fr' ? "Clé d'accès requise pour le service de numérisation. Collez votre clé :" : 'Chave de acesso necessária para o serviço de escaneamento. Cole sua chave :');
  const input = typeof window !== 'undefined' ? window.prompt(msg) : null;
  if (input?.trim()) { saveStoredGeminiApiKey(input); return input.trim(); }
  return null;
}

function getOrderedModelIndices(): number[] {
  let startIdx = 0;
  try {
    const raw = sessionStorage.getItem(ACTIVE_MODEL_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    if (!isNaN(parsed) && parsed >= 0 && parsed < SCAN_VISION_MODELS.length) startIdx = parsed;
  } catch {}
  return SCAN_VISION_MODELS.map((_, i) => (startIdx + i) % SCAN_VISION_MODELS.length);
}

export async function analyzePaperImageWithVision(
  imageDataUrl: string,
  options: VisionPromptOptions
): Promise<VisionScanResponse> {
  const lang = options.lang || 'fr';
  let apiKey = getStoredGeminiApiKey();

  if (!apiKey) {
    apiKey = requestUserApiKey(lang, false);
    if (!apiKey) return { success: false, error: lang === 'fr' ? "Clé d'accès manquante pour le service de numérisation." : 'Chave de acesso ausente para o serviço de escaneamento.' };
  }

  const prompt = buildGeminiVisionPaperPrompt(options);
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = imageDataUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
  };

  const orderedIndices = getOrderedModelIndices();
  let lastStatus = 0;
  let all429 = true;

  try {
    for (const idx of orderedIndices) {
      const model = SCAN_VISION_MODELS[idx];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        clearStoredGeminiApiKey();
        const newKey = requestUserApiKey(lang, true);
        if (newKey) {
          apiKey = newKey;
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          });
        }
      }

      if (res.ok) {
        try { sessionStorage.setItem(ACTIVE_MODEL_KEY, String(idx)); } catch {}
        const json = await res.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return { success: true, ...JSON.parse(rawText.replace(/```json/gi, '').replace(/```/g, '').trim()) };
      }

      lastStatus = res.status;
      if (res.status !== 429) all429 = false;

      // Rotation silencieuse immédiate si quota (429), indisponible (404) ou surcharge temporaire (503)
      if (res.status === 429 || res.status === 404 || res.status === 503) continue;
    }

    if (all429 && lastStatus === 429) {
      return {
        success: false,
        error: lang === 'fr'
          ? "Limite quotidienne de scans gratuits atteinte sur cette clé. Vous pouvez saisir une autre clé ou réessayer plus tard."
          : "Limite diário de escaneamentos gratuitos atingido nesta chave. Você pode inserir outra chave ou tentar mais tarde.",
      };
    }

    return {
      success: false,
      error: lang === 'fr' ? 'Échec de lecture de la partition. Veuillez réessayer.' : 'Falha na leitura da partitura. Por favor tente novamente.',
    };
  } catch {
    return {
      success: false,
      error: lang === 'fr' ? 'Échec de connexion au service de numérisation.' : 'Falha de conexão com o serviço de escaneamento.',
    };
  }
}
