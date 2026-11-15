import { vouVadiarPreset, baqueDeImalePreset, ASSETS_BASE_URL, instrumentsConfig } from '../../data';
import { getLocalLibrary } from '../../library';
import { notifyToast } from '../../utils/toastHelper';
import { setActiveCloudPresetId, resetActiveCloudPresetId } from '../../utils/cloudPresetState';
import { getDefaultSignatureTuning } from '../../utils/audio/lutherieFactoryPresets';

function stampSignatureTuningOnStaticFallback(rawPreset: any): any {
  if (!rawPreset || typeof rawPreset !== 'object') return rawPreset;
  const cloned = JSON.parse(JSON.stringify(rawPreset));
  if (Array.isArray(cloned.tracks)) {
    cloned.tracks.forEach((tr: any) => {
      if (tr && !tr.isBusFolder && tr.tuning === undefined) {
        tr.tuning = getDefaultSignatureTuning(instrumentsConfig[tr.instrumentIdx]?.id);
      }
    });
  } else if (Array.isArray(cloned.circles)) {
    cloned.circles.forEach((c: any) => {
      if (c && c.tuning === undefined) {
        c.tuning = getDefaultSignatureTuning(instrumentsConfig[c.instrumentIdx]?.id);
      }
    });
  }
  return cloned;
}

export async function fetchFallbackPresetData(name: string, lang: string, t: (key: string) => string): Promise<any | null> {
  if (name.startsWith('cloud:')) {
    const id = name.replace('cloud:', '');
    const { getCloudPreset } = await import('../../cloudLibrary');
    const p = await getCloudPreset(id);
    if (!p || !Array.isArray(p.tracks) || p.tracks.length === 0) {
      console.warn('[loadFallbackPreset] Invalid cloud preset or empty tracks, falling back to default preset:', id);
      resetActiveCloudPresetId();
      return stampSignatureTuningOnStaticFallback(vouVadiarPreset);
    }
    p.metadata = { ...(p.metadata || ({} as any)), morceauId: id };
    setActiveCloudPresetId(id);
    return p;
  }

  if (name.startsWith('local:')) {
    resetActiveCloudPresetId();
    const id = name.replace('local:', '');
    const localLib = await getLocalLibrary();
    const p = localLib[id];
    if (!p) {
      notifyToast(t('invalidFile') || (lang === 'fr' ? 'Fichier invalide' : 'Arquivo inválido'), 'error');
      return null;
    }
    return p;
  }

  if (name.endsWith('.json')) {
    try {
      const response = await fetch(`${ASSETS_BASE_URL}presets/${encodeURI(name)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return stampSignatureTuningOnStaticFallback(await response.json());
    } catch (error) {
      console.error('Error fetching preset:', error);
      notifyToast(t('invalidFile'), 'error');
      return null;
    }
  }

  return stampSignatureTuningOnStaticFallback(name === 'baque-de-imale' ? baqueDeImalePreset : vouVadiarPreset);
}
