import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';

export async function loadSampleBuffer(file: string): Promise<Tone.ToneAudioBuffer | null> {
  if (audioEngine?.bufferPool?.has(file)) {
    const pooled = audioEngine.bufferPool.get(file);
    if (pooled && pooled.loaded) {
      return pooled;
    }
  }

  try {
    const baseUrl = (import.meta as any).env.BASE_URL || '/';
    let fetchPath = file;
    if (file.includes('Mixdown/') || file.includes('mixdown/')) {
      const filename = file.substring(file.lastIndexOf('/') + 1);
      fetchPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}Mixdown/${filename}`;
    } else {
      const cleanPath = file.startsWith('/') ? file : '/' + file;
      fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
    }
    const encodedPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(encodedPath, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();

    const liveContext = Tone.getContext().rawContext as AudioContext;
    if (liveContext && typeof liveContext.decodeAudioData === 'function') {
      const decoded = await liveContext.decodeAudioData(arrayBuffer);
      return new Tone.ToneAudioBuffer(decoded);
    } else {
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await tempCtx.decodeAudioData(arrayBuffer);
      tempCtx.close().catch(() => {});
      return new Tone.ToneAudioBuffer(decoded);
    }
  } catch (err) {
    console.warn(`[Cloud Bounce] Échec chargement sample ${file}:`, err);
    return null;
  }
}
