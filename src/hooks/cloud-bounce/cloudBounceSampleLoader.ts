import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { fetchAndDecodeAudioSample, normalizeCanonicalSampleKey } from '../../audio/engine/sampleFetchUtils';

export async function loadSampleBuffer(file: string): Promise<Tone.ToneAudioBuffer | null> {
  const canonical = normalizeCanonicalSampleKey(file);
  if (audioEngine?.bufferPool?.has(canonical)) {
    const pooled = audioEngine.bufferPool.get(canonical);
    if (pooled && pooled.loaded) {
      return pooled;
    }
  }

  try {
    const liveContext = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    if (liveContext && typeof liveContext.decodeAudioData === 'function') {
      const decoded = await fetchAndDecodeAudioSample(liveContext, canonical);
      if (decoded) return new Tone.ToneAudioBuffer(decoded);
    }
    return null;
  } catch (err) {
    console.warn(`[Cloud Bounce] Échec chargement sample ${canonical}:`, err);
    return null;
  }
}
