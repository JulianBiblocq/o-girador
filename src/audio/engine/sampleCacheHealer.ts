/**
 * sampleCacheHealer.ts — Auto-guérison de `'audio-samples-cache'` contre les réponses SPA `text/html`
 * ou binaires corrompus sous Service Worker Workbox `CacheFirst` (< 80 lignes).
 */

export const AUDIO_SAMPLES_CACHE_NAME = 'audio-samples-cache';

export function isHtmlSampleResponse(resp: Response | null | undefined): boolean {
  const ct = resp?.headers?.get?.('content-type') || '';
  return ct.toLowerCase().includes('text/html');
}

export async function purgePoisonedAudioSampleCache(encodedUrl: string): Promise<boolean> {
  if (typeof caches === 'undefined' || typeof caches?.open !== 'function') return false;
  try {
    const cache = await caches.open(AUDIO_SAMPLES_CACHE_NAME);
    const cleanUrl = encodedUrl.split('?')[0];
    try { await cache.delete(encodedUrl); } catch (_) {}
    if (cleanUrl !== encodedUrl) {
      try { await cache.delete(cleanUrl); } catch (_) {}
    }
    try { await cache.delete(cleanUrl, { ignoreSearch: true }); } catch (_) {}
    return true;
  } catch (_) {
    return false;
  }
}

export async function fetchAndDecodeWithCacheHeal(
  ctx: BaseAudioContext,
  encodedUrl: string,
  fetchInitial: (url: string) => Promise<Response>,
  retryReloadWithoutCacheApi = false
): Promise<AudioBuffer | null> {
  const resp = await fetchInitial(encodedUrl);
  if (isHtmlSampleResponse(resp)) {
    await purgePoisonedAudioSampleCache(encodedUrl);
    const freshResp = await fetch(encodedUrl, { cache: 'reload' });
    if (!freshResp || !freshResp.ok || isHtmlSampleResponse(freshResp)) {
      throw new Error(`Poisoned HTML audio response for ${encodedUrl}`);
    }
    return await ctx.decodeAudioData(await freshResp.arrayBuffer());
  }

  const bytes = await resp.arrayBuffer();
  try {
    return await ctx.decodeAudioData(bytes);
  } catch (decodeErr) {
    const hasCacheApi = await purgePoisonedAudioSampleCache(encodedUrl);
    if (!hasCacheApi && !retryReloadWithoutCacheApi) {
      throw decodeErr;
    }
    const freshResp = await fetch(encodedUrl, { cache: 'reload' });
    if (!freshResp || !freshResp.ok || isHtmlSampleResponse(freshResp)) {
      throw decodeErr;
    }
    return await ctx.decodeAudioData(await freshResp.arrayBuffer());
  }
}
