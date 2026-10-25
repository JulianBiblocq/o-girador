/**
 * Service d'analyse visuelle pour l'Atelier Papier (< 135 lignes).
 * Cascade multi-modèles 3.x, normalisation tolérante JSON et gestion de clé.
 */
import { buildGeminiVisionPaperPrompt, VisionPromptOptions } from './geminiVisionPaperPrompt';

export interface VisionSinglePatternData {
  name: string; detectedTimeSig?: string; beatResolutions?: number[]; totalSteps?: number;
  lines: Array<{ role: string; isVariation?: boolean; beats: string[][] }>;
}

export interface VisionScanResponse {
  success: boolean; songTitle?: string; globalBpm?: number; globalTimeSig?: string;
  pattern?: VisionSinglePatternData; patterns?: VisionSinglePatternData[]; sequence?: string[];
  error?: string; techCode?: string;
}

const STORAGE_KEY = 'girador_gemini_api_key';
const ACTIVE_MODEL_KEY = 'girador_active_scan_model_idx';

export const SCAN_VISION_MODELS = [
  'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash',
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

function getOrderedModelIndices(): number[] {
  let startIdx = 0;
  try {
    const raw = sessionStorage.getItem(ACTIVE_MODEL_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    if (!isNaN(parsed) && parsed >= 0 && parsed < SCAN_VISION_MODELS.length) startIdx = parsed;
    else sessionStorage.setItem(ACTIVE_MODEL_KEY, '0');
  } catch {}
  return SCAN_VISION_MODELS.map((_, i) => (startIdx + i) % SCAN_VISION_MODELS.length);
}

function normalizeScanJson(rawText: string, defaultName = 'Motif'): any {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (Array.isArray(parsed?.lines) && !parsed.pattern) {
    parsed.pattern = { name: parsed.name || defaultName, detectedTimeSig: parsed.detectedTimeSig || '4/4', beatResolutions: parsed.beatResolutions || [4, 4, 4, 4], totalSteps: parsed.totalSteps || 16, lines: parsed.lines };
  } else if (Array.isArray(parsed?.patterns) && parsed.patterns.length > 0 && !parsed.pattern) {
    parsed.pattern = parsed.patterns[0];
  }
  return parsed;
}

export async function analyzePaperImageWithVision(
  imageDataUrl: string,
  options: VisionPromptOptions,
  onRequestApiKey?: (isRetry?: boolean) => Promise<string | null>
): Promise<VisionScanResponse> {
  const lang = options.lang || 'fr';
  let apiKey = getStoredGeminiApiKey();

  if (!apiKey && onRequestApiKey) apiKey = await onRequestApiKey(false);
  if (!apiKey) return { success: false, error: lang === 'fr' ? "Clé d'accès requise pour le service de numérisation." : 'Chave de acesso necessária.', techCode: 'AUTH_REQUIRED' };

  const prompt = buildGeminiVisionPaperPrompt(options);
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = imageDataUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.1, maxOutputTokens: 4096 },
  };

  const orderedIndices = getOrderedModelIndices();
  let lastStatus = 0;
  let lastDetail = '';

  for (const idx of orderedIndices) {
    const model = SCAN_VISION_MODELS[idx];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if ((res.status === 400 || res.status === 401 || res.status === 403) && onRequestApiKey) {
        clearStoredGeminiApiKey();
        const newKey = await onRequestApiKey(true);
        if (newKey) {
          apiKey = newKey;
          res = await fetch(url.replace(/key=.+$/, `key=${apiKey}`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
      }

      lastStatus = res.status;
      if (!res.ok) {
        try { sessionStorage.setItem(ACTIVE_MODEL_KEY, '0'); } catch {}
        lastDetail = res.status === 429 ? 'Quota 429' : `HTTP ${res.status}`;
        continue;
      }

      const json = await res.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = normalizeScanJson(rawText, options.targetSectionName);
      if (parsed.pattern || parsed.patterns || parsed.sequence) {
        try { sessionStorage.setItem(ACTIVE_MODEL_KEY, String(idx)); } catch {}
        return { success: true, ...parsed };
      }
      lastDetail = 'Format JSON incomplet';
    } catch (err: any) {
      lastDetail = err?.message || 'Erreur réseau';
      continue;
    }
  }

  return {
    success: false,
    error: lastStatus === 429
      ? (lang === 'fr' ? 'Quota journalier gratuit atteint sur cette clé. Vous pouvez saisir une autre clé ou réessayer plus tard.' : 'Limite diário de escaneamentos atingido nesta chave.')
      : (lang === 'fr' ? `Échec du scan : ${lastDetail || 'Format non reconnu'}.` : `Falha no escaneamento : ${lastDetail || 'Formato não reconhecido'}.`),
    techCode: lastStatus ? `HTTP_${lastStatus}` : 'ERR_PARSE',
  };
}
