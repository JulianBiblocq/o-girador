/**
 * toadaVariantImporter.ts
 * Décodage par lot des déclinaisons audio vocales avec cache d'URL pour éviter tout téléchargement redondant.
 * Plafond strict : < 110 lignes.
 */
import { useAudioStore } from '../../stores/useAudioStore';
import { saveVocalRecording } from '../../db';

export interface DecodedUrlAudio {
  blob: Blob;
  buffer: AudioBuffer;
}

export function base64ToBlob(b64: string): Blob {
  const bin = atob(b64.replace(/^data:audio\/\w+;base64,/, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/wav' });
}

export async function fetchAndDecodeAudioUrl(
  url: string,
  rawCtx: AudioContext,
  urlCache?: Map<string, DecodedUrlAudio>
): Promise<DecodedUrlAudio | null> {
  if (!url) return null;
  const cached = urlCache?.get(url);
  if (cached) return cached;

  const resp = await fetch(url);
  if (!resp.ok) return null;
  const blob = await resp.blob();
  const buffer = await rawCtx.decodeAudioData(await blob.arrayBuffer());
  const entry = { blob, buffer };
  urlCache?.set(url, entry);
  return entry;
}

export async function importPatternVariants(
  variants: Record<string, any> | undefined,
  numId: number,
  origId: string,
  roleTrackId: number,
  rawCtx: AudioContext,
  urlCache?: Map<string, DecodedUrlAudio>
): Promise<string[]> {
  const loadedKeys: string[] = [];
  if (!variants || typeof variants !== 'object') return loadedKeys;

  const aStore = useAudioStore.getState();
  const entries = Object.entries(variants);

  for (const [key, v] of entries) {
    try {
      let b: Blob | null = null;
      let buf: AudioBuffer | null = null;

      if (v?.audioBase64) {
        b = base64ToBlob(v.audioBase64);
        buf = await rawCtx.decodeAudioData(await b.arrayBuffer());
      } else if (v?.audioUrl) {
        const decoded = await fetchAndDecodeAudioUrl(v.audioUrl, rawCtx, urlCache);
        if (decoded) {
          b = decoded.blob;
          buf = decoded.buffer;
        }
      }

      if (b && buf) {
        const compositeKey = `${numId}__${key}`;
        const trackCompositeKey = `${roleTrackId}_${numId}__${key}`;
        const origCompositeKey = `${origId}__${key}`;

        aStore.setVocalBuffer(compositeKey, buf);
        aStore.setVocalBuffer(trackCompositeKey, buf);
        aStore.setVocalBuffer(origCompositeKey, buf);
        aStore.addVocalBlob(compositeKey, b);

        await saveVocalRecording(compositeKey, b);
        if (origCompositeKey !== compositeKey) {
          await saveVocalRecording(origCompositeKey, b);
        }

        loadedKeys.push(key);
      }
    } catch (err) {
      console.warn(`[toadaVariantImporter] Erreur import déclinaison ${key}:`, err);
    }
  }

  return loadedKeys;
}
