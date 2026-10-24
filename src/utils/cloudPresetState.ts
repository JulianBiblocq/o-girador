/**
 * Gestion centralisée de l'ID Cloud actif et synchronisation URL / LocalStorage (< 55 lignes).
 */
import { useSequencerStore } from '../stores/useSequencerStore';

const STORAGE_KEY = 'girador_last_loaded_preset_id';

export function resetActiveCloudPresetId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    const url = new URL(window.location.href);
    if (url.searchParams.has('loadPreset')) {
      url.searchParams.delete('loadPreset');
      window.history.replaceState(null, '', url.toString());
    }
    const store = useSequencerStore.getState();
    if (store.metadata?.morceauId) {
      store.setMetadata({ ...store.metadata, morceauId: undefined });
    }
    window.dispatchEvent(new CustomEvent('girador-reset-active-preset'));
  } catch (err) {
    console.warn('[CloudPresetState] Erreur lors de la réinitialisation:', err);
  }
}

export function setActiveCloudPresetId(presetId: string): void {
  if (!presetId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, presetId);
    const url = new URL(window.location.href);
    url.searchParams.set('loadPreset', presetId);
    window.history.replaceState(null, '', url.toString());

    const store = useSequencerStore.getState();
    const currentMeta = store.metadata || ({} as any);
    if (currentMeta.morceauId !== presetId) {
      store.setMetadata({ ...currentMeta, morceauId: presetId });
    }
    window.dispatchEvent(new Event('force-autosave'));
  } catch (err) {
    console.warn('[CloudPresetState] Erreur lors de l\'activation:', err);
  }
}

export function getActiveCloudPresetId(presetData?: any): string | null {
  const explicitId = (presetData?.metadata as any)?.morceauId || useSequencerStore.getState().metadata?.morceauId;
  if (explicitId) return explicitId;
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('loadPreset') || localStorage.getItem(STORAGE_KEY) || null;
}
