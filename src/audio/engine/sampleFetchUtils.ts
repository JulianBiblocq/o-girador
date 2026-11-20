/**
 * Résolution des chemins canoniques (.ogg), détection native iOS/WebKit (.m4a) et chargement réseau (< 105 lignes).
 * - Détecte d'emblée l'absence de support Ogg Vorbis sur iOS/WebKit (sans télécharger les .ogg en pure perte).
 * - Garantit que tous les appelants indexent les AudioBuffers décodés sous leur clé canonique `.ogg`.
 */

let forcedM4aPreference: boolean | null = null;
let cachedNativeM4aPreference: boolean | null = null;
let latchedM4aFallback = false;

export function normalizeCanonicalSampleKey(path: string): string {
  return path.replace(/\.m4a$/i, '.ogg');
}

function detectWebkitM4aPreference(): boolean {
  if (cachedNativeM4aPreference !== null) return cachedNativeM4aPreference;
  try {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const probe = document.createElement('audio');
      if (probe && typeof probe.canPlayType === 'function') {
        const oggSupport = probe.canPlayType('audio/ogg; codecs="vorbis"');
        const aacSupport = probe.canPlayType('audio/mp4; codecs="mp4a.40.2"');
        if (oggSupport === '' && aacSupport !== '') {
          cachedNativeM4aPreference = true;
          return true;
        }
        if (oggSupport !== '') {
          cachedNativeM4aPreference = false;
          return false;
        }
      }
    }
  } catch (_) {}
  cachedNativeM4aPreference = false;
  return false;
}

export function shouldPreferM4aFallback(): boolean {
  if (forcedM4aPreference !== null) return forcedM4aPreference;
  if (latchedM4aFallback) return true;
  return detectWebkitM4aPreference();
}

export function markM4aFallbackPreferred(): void {
  latchedM4aFallback = true;
}

export function setPreferM4aFallbackForTests(preferM4a: boolean | null): void {
  forcedM4aPreference = preferM4a;
  cachedNativeM4aPreference = null;
  latchedM4aFallback = false;
}

export function resolveSampleFetchPath(path: string): string {
  let fetchPath = path;
  if (path.includes('Mixdown/') || path.includes('mixdown/')) {
    const filename = path.substring(path.lastIndexOf('/') + 1);
    // @ts-ignore
    fetchPath = `${import.meta.env?.BASE_URL || '/'}Mixdown/${filename}`;
  } else {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    // @ts-ignore
    const baseUrl = import.meta.env?.BASE_URL || '/';
    fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
  }
  return fetchPath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

export async function fetchSampleWithRetry(encodedPath: string): Promise<Response> {
  let response: Response | null = null;
  let delayMs = 300;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(encodedPath);
      if (response.ok) break;
      throw new Error(`HTTP status ${response.status}`);
    } catch (fetchErr) {
      if (attempt === 3) throw fetchErr;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  if (!response || !response.ok) {
    throw new Error(`HTTP error: ${response ? response.status : 'unknown'}`);
  }
  return response;
}

export async function fetchAndDecodeAudioSample(
  ctx: BaseAudioContext,
  samplePath: string
): Promise<AudioBuffer | null> {
  const canonicalPath = normalizeCanonicalSampleKey(samplePath);
  const oggUrl = resolveSampleFetchPath(canonicalPath);
  const m4aUrl = oggUrl.replace(/\.ogg$/i, '.m4a');
  const hasM4aVariant = m4aUrl !== oggUrl;

  if (hasM4aVariant && shouldPreferM4aFallback()) {
    try {
      const m4aResp = await fetchSampleWithRetry(m4aUrl);
      return await ctx.decodeAudioData(await m4aResp.arrayBuffer());
    } catch (_) {
      return null;
    }
  }

  try {
    const oggResp = await fetchSampleWithRetry(oggUrl);
    const oggBytes = await oggResp.arrayBuffer();
    try {
      return await ctx.decodeAudioData(oggBytes);
    } catch (_) {
      if (!hasM4aVariant) return null;
      markM4aFallbackPreferred();
    }
  } catch (_) {
    if (!hasM4aVariant) return null;
  }

  try {
    const fallbackResp = await fetchSampleWithRetry(m4aUrl);
    return await ctx.decodeAudioData(await fallbackResp.arrayBuffer());
  } catch (_) {
    return null;
  }
}
