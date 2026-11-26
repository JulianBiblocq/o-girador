/**
 * initialUrlPresetLoader.ts — Chargement initial depuis paramètres d'URL (`?file`, `?baque`, `?loadPreset`) ou hash (< 55 lignes).
 */
import LZString from 'lz-string';

export async function tryLoadInitialPresetFromUrlOrHash(audio: any, _sequencer: any, cachedAutosave?: any): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const fileUrl = urlParams.get('file');
  if (fileUrl) {
    try {
      const response = await fetch(fileUrl);
      if (response.ok) {
        await audio.applyPreset(await response.json());
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
      }
    } catch (err) {
      console.error('[O Girador] Échec du téléchargement du fichier distant:', err);
    }
  }

  const baqueParam = urlParams.get('baque');
  if (baqueParam) {
    const decompressed = LZString.decompressFromEncodedURIComponent(baqueParam);
    if (decompressed) {
      await audio.applyPreset(JSON.parse(decompressed));
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  }

  const loadPresetParam = urlParams.get('loadPreset') || urlParams.get('presetId');
  if (loadPresetParam && cachedAutosave?.hasUnsavedChanges && cachedAutosave?.metadata?.morceauId === loadPresetParam) {
    return false;
  }
  if (urlParams.has('trainingId') || urlParams.has('loadPreset') || urlParams.has('presetId') || urlParams.has('loadSection') || urlParams.has('editPatternId')) {
    return true;
  }

  const hash = window.location.hash;
  if (hash && hash.length > 1 && hash !== '#legal') {
    try {
      const decodedStr = decodeURIComponent(escape(window.atob(hash.substring(1))));
      await audio.applyPreset(JSON.parse(decodedStr));
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    } catch (_) {}
  }
  return false;
}
