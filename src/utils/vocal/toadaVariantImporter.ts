/**
 * toadaVariantImporter.ts
 * Décodage du fichier `.wav` maître unique par pattern vocal publié par Cantador
 * avec cache d'URL et stockage sous clé canonique unique `${trackId}_${patternId}` (< 65 lignes).
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

export async function importPatternMasterWav(
  source: { audioBase64?: string; audioUrl?: string } | undefined,
  numId: number,
  roleTrackId: number,
  rawCtx: AudioContext,
  urlCache?: Map<string, DecodedUrlAudio>
): Promise<DecodedUrlAudio | null> {
  if (!source) return null;
  const canonicalKey = `${roleTrackId}_${numId}`;
  let decoded: DecodedUrlAudio | null = null;

  if (source.audioBase64) {
    const blob = base64ToBlob(source.audioBase64);
    const buffer = await rawCtx.decodeAudioData(await blob.arrayBuffer());
    decoded = { blob, buffer };
  } else if (source.audioUrl) {
    decoded = await fetchAndDecodeAudioUrl(source.audioUrl, rawCtx, urlCache);
  }

  if (decoded) {
    const aStore = useAudioStore.getState();
    aStore.setVocalBuffer(canonicalKey, decoded.buffer);
    aStore.addVocalBlob(canonicalKey, decoded.blob);
    await saveVocalRecording(canonicalKey, decoded.blob);
  }
  return decoded;
}
