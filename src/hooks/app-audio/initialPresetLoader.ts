import { ASSETS_BASE_URL } from '../../data';
import { getDefaultGroupPresetId } from '../../cloudGroups';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { resolveEffectiveStartupGroupId } from '../../services/cloud-common/cloudTenantAuthGuard';
import { setUnsavedSessionRestored } from './autosavePayloadBuilder';
import { sanitizeRestoredAutosave } from './autosaveRestoreSanitizer';
import { tryLoadInitialPresetFromUrlOrHash } from './initialUrlPresetLoader';

export { tryLoadInitialPresetFromUrlOrHash };

let coldVisitorFallbackActive = false;
export function wasColdVisitorFallbackLoaded(): boolean { return coldVisitorFallbackActive; }
export function clearColdVisitorFallbackFlag(): void { coldVisitorFallbackActive = false; }

export async function loadInitialPresetPipeline(
  audio: any, sequencer: any, userProfile: any, setPresetFiles: (files: string[]) => void
): Promise<void> {
  coldVisitorFallbackActive = false;
  setUnsavedSessionRestored(false);

  let savedState: any = null;
  try {
    const { getAutosave, clearAutosave } = await import('../../db');
    const rawSaved = await getAutosave();
    savedState = sanitizeRestoredAutosave(rawSaved);
    if (rawSaved && !savedState) await clearAutosave().catch(() => {});
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

  const groupId = resolveEffectiveStartupGroupId(userProfile?.groupId);
  try {
    const res = await fetch(`${ASSETS_BASE_URL}presets/catalog.json`);
    const ct = res.headers?.get?.('content-type') || '';
    if (!res.ok || ct.toLowerCase().includes('text/html')) throw new Error('Invalid catalog response');
    const files: string[] = await res.json();
    setPresetFiles(files);
    if (files.length > 0 && !restored) {
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
      restored = true;
    }
  } catch (_) {
    if (!restored) {
      coldVisitorFallbackActive = !groupId;
      audio.setActivePresetName('Vou vadiar carnaval.json');
      await audio.loadFallbackPreset('vou-vadiar-carnaval');
    }
  } finally {
    if (!restored && useSequencerStore.getState().tracks.length === 0) {
      coldVisitorFallbackActive = !groupId;
      audio.setActivePresetName('Vou vadiar carnaval.json');
      await audio.loadFallbackPreset('vou-vadiar-carnaval').catch(() => {});
    }
    if (vocalEngineService.needsRehydration()) {
      vocalEngineService.rehydrateVocalBuffers(useSequencerStore.getState().tracks).catch(() => {});
    }
  }
}
