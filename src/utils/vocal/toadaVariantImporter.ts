/**
 * toadaVariantImporter.ts
 * Décodage par lot des déclinaisons audio vocales et sauvegarde IndexedDB/AudioStore.
 * Plafond strict : < 110 lignes.
 */
import { useAudioStore } from '../../stores/useAudioStore';
import { saveVocalRecording } from '../../db';

export function base64ToBlob(b64: string): Blob {
  const bin = atob(b64.replace(/^data:audio\/\w+;base64,/, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/wav' });
}

export async function importPatternVariants(
  variants: Record<string, any> | undefined,
  numId: number,
  origId: string,
  roleTrackId: number,
  rawCtx: AudioContext
): Promise<string[]> {
  const loadedKeys: string[] = [];
  if (!variants || typeof variants !== 'object') return loadedKeys;

  const aStore = useAudioStore.getState();
  const entries = Object.entries(variants);

  for (const [key, v] of entries) {
    try {
      let b: Blob | null = null;
      if (v?.audioBase64) {
        b = base64ToBlob(v.audioBase64);
      } else if (v?.audioUrl) {
        const resp = await fetch(v.audioUrl);
        if (resp.ok) b = await resp.blob();
      }

      if (b) {
        const buf = await rawCtx.decodeAudioData(await b.arrayBuffer());
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
