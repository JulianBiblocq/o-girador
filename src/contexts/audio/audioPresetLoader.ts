import { vouVadiarPreset, baqueDeImalePreset, ASSETS_BASE_URL } from '../../data';
import { getLocalLibrary } from '../../library';
import { notifyToast } from '../../utils/toastHelper';

export async function fetchFallbackPresetData(name: string, lang: string, t: (key: string) => string): Promise<any | null> {
  let p: any;
  if (name.startsWith('cloud:')) {
    const id = name.replace('cloud:', '');
    const { getCloudPreset } = await import('../../cloudLibrary');
    p = await getCloudPreset(id);
    if (!p || !Array.isArray(p.tracks) || p.tracks.length === 0) {
      console.warn('[loadFallbackPreset] Invalid cloud preset or empty tracks, falling back to default preset:', id);
      p = vouVadiarPreset;
    } else {
      if (!p.metadata) p.metadata = {} as any;
      p.metadata.morceauId = id;
      try {
        localStorage.setItem('girador_last_loaded_preset_id', id);
      } catch (_) {}
    }
  } else if (name.startsWith('local:')) {
    const id = name.replace('local:', '');
    const localLib = await getLocalLibrary();
    p = localLib[id];
    if (!p) {
      notifyToast(t('invalidFile') || (lang === 'fr' ? 'Fichier invalide' : 'Arquivo inválido'), 'error');
      return null;
    }
  } else if (name.endsWith('.json')) {
    try {
      const response = await fetch(`${ASSETS_BASE_URL}presets/${encodeURI(name)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      p = await response.json();
    } catch (error) {
      console.error('Error fetching preset:', error);
      notifyToast(t('invalidFile'), 'error');
      return null;
    }
  } else {
    p = name === 'baque-de-imale' ? baqueDeImalePreset : vouVadiarPreset;
  }
  return p;
}
