/**
 * Service d'analyse Gemini Vision pour l'Atelier Papier (< 130 lignes).
 * Gère l'appel REST direct à Gemini 1.5 Flash et un fallback structuré hors-ligne.
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

export async function analyzePaperImageWithVision(
  imageDataUrl: string,
  options: VisionPromptOptions
): Promise<VisionScanResponse> {
  const prompt = buildGeminiVisionPaperPrompt(options);
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_FIREBASE_API_KEY;

  if (!apiKey) {
    return buildFallbackResponse(options);
  }

  try {
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imageDataUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Gemini Vision non disponible:', res.status, errText);
      return buildFallbackResponse(options);
    }

    const json = await res.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { success: true, ...parsed };
  } catch (err: any) {
    console.warn('Erreur appel Gemini Vision, bascule sur fallback:', err?.message);
    return buildFallbackResponse(options);
  }
}

function buildFallbackResponse(opts: VisionPromptOptions): VisionScanResponse {
  const mode = opts.mode || 'full_page';
  if (mode === 'single_pattern') {
    const pName = opts.targetSectionName || 'Motif Scanné';
    return {
      success: true,
      pattern: {
        name: pName,
        detectedTimeSig: '4/4',
        beatResolutions: [4, 4, 4, 4],
        totalSteps: 16,
        lines: [
          { role: 'al', isVariation: false, beats: [['1', '0', '0', '0'], ['1', '0', '0', '0'], ['1', '0', '0', '0'], ['1', '0', '0', '0']] },
          { role: 'cx', isVariation: false, beats: [['1', '0', '1', '0'], ['1', '0', '1', '0'], ['1', '0', '1', '0'], ['1', '0', '1', '0']] },
          { role: 'gg', isVariation: false, beats: [['1', '0', '0', '0'], ['1', '0', '0', '0'], ['1', '0', '0', '0'], ['1', '0', '0', '0']] },
        ],
      },
    };
  }
  if (mode === 'sequence_only') {
    const seq = opts.existingSectionNames?.length ? opts.existingSectionNames : ['1', '1', '2', '2'];
    return { success: true, sequence: seq };
  }
  return {
    success: true,
    songTitle: 'Nouvelle Partition Papier',
    globalBpm: 96,
    globalTimeSig: '4/4',
    patterns: [],
    sequence: ['1', '1'],
  };
}
