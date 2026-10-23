/**
 * Résolution des chemins et chargement réseau avec retentatives pour les échantillons audio (< 45 lignes).
 */

export function resolveSampleFetchPath(path: string): string {
  let fetchPath = path;
  if (path.includes('Mixdown/') || path.includes('mixdown/')) {
    const filename = path.substring(path.lastIndexOf('/') + 1);
    // @ts-ignore
    fetchPath = `${import.meta.env.BASE_URL || '/'}Mixdown/${filename}`;
  } else {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    // @ts-ignore
    const baseUrl = import.meta.env.BASE_URL || '/';
    fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
  }
  return fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
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
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  if (!response || !response.ok) {
    throw new Error(`HTTP error: ${response ? response.status : 'unknown'}`);
  }
  return response;
}
