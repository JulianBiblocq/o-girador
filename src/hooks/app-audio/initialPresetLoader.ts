import LZString from 'lz-string';
import { ASSETS_BASE_URL } from '../../data';
import { getDefaultGroupPresetId } from '../../cloudGroups';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { resolveEffectiveStartupGroupId } from '../../services/cloud-common/cloudTenantAuthGuard';
import { setUnsavedSessionRestored } from './autosavePayloadBuilder';

let coldVisitorFallbackActive = false;
export function wasColdVisitorFallbackLoaded(): boolean { return coldVisitorFallbackActive; }
export function clearColdVisitorFallbackFlag(): void { coldVisitorFallbackActive = false; }

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
    } catch (err) { console.error('[O Girador] Échec du téléchargement du fichier distant:', err); }
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

export async function loadInitialPresetPipeline(
  audio: any, sequencer: any, userProfile: any, setPresetFiles: (files: string[]) => void
): Promise<void> {
  coldVisitorFallbackActive = false;
  setUnsavedSessionRestored(false);

  let savedState: any = null;
  try {
    const { getAutosave, clearAutosave } = await import('../../db');
    savedState = await getAutosave();
    if (savedState && (!Array.isArray(savedState.tracks) || savedState.tracks.length === 0)) {
      await clearAutosave().catch(() => {});
      savedState = null;
    }
  } catch (_) {}

  let restored = await tryLoadInitialPresetFromUrlOrHash(audio, sequencer, savedState);
  const lastPresetId = localStorage.getItem('girador_last_loaded_preset_id');
  const preferDirtyAutosave = Boolean(
    savedState?.hasUnsavedChanges && (!lastPresetId || savedState?.metadata?.morceauId === lastPresetId)
  );

  if (!restored && preferDirtyAutosave && savedState) {
    await audio.applyPreset(savedState);
    if (lastPresetId) audio.setActivePresetName(`cloud:${lastPresetId}`);
    setUnsavedSessionRestored(true);
    restored = true;
  }

  if (!restored && lastPresetId) {
    try {
      const { getCloudPreset } = await import('../../cloudLibrary');
      const cloudPreset = await getCloudPreset(lastPresetId);
      if (cloudPreset?.tracks?.length) {
        const meta = cloudPreset.metadata || { toada: '', nacao: '', compositor: '', ritmo: '' };
        meta.morceauId = lastPresetId;
        cloudPreset.metadata = meta;
        await audio.applyPreset(cloudPreset);
        audio.setActivePresetName(`cloud:${lastPresetId}`);
        restored = true;
      } else localStorage.removeItem('girador_last_loaded_preset_id');
    } catch (_) { localStorage.removeItem('girador_last_loaded_preset_id'); }
  }

  if (!restored && savedState) {
    await audio.applyPreset(savedState);
    if (savedState.hasUnsavedChanges) setUnsavedSessionRestored(true);
    restored = true;
  }

  try {
    const res = await fetch(`${ASSETS_BASE_URL}presets/catalog.json`);
    const files: string[] = await res.json();
    setPresetFiles(files);
    if (files.length > 0 && !restored) {
      const groupId = resolveEffectiveStartupGroupId(userProfile?.groupId);
      if (groupId) {
        try {
          const defaultPresetId = await getDefaultGroupPresetId(groupId);
          if (defaultPresetId) {
            const { getCloudPreset } = await import('../../cloudLibrary');
            const cloudPreset = await getCloudPreset(defaultPresetId);
            if (cloudPreset?.tracks?.length) {
              audio.setActivePresetName(`cloud:${defaultPresetId}`);
              await audio.applyPreset(cloudPreset);
              return;
            }
          }
        } catch (_) {}
      }
      coldVisitorFallbackActive = !groupId;
      const defaultEmbedded = files.includes('Vou vadiar carnaval.json') ? 'Vou vadiar carnaval.json' : files[0];
      audio.setActivePresetName(defaultEmbedded);
      await audio.loadFallbackPreset(defaultEmbedded);
    }
  } catch (_) {
  } finally {
    if (vocalEngineService.needsRehydration()) {
      vocalEngineService.rehydrateVocalBuffers(useSequencerStore.getState().tracks).catch(() => {});
    }
  }
}
