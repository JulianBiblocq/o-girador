import LZString from 'lz-string';
import { ASSETS_BASE_URL, instrumentsConfig } from '../../data';
import { getDefaultGroupPresetId } from '../../cloudGroups';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useSequencerStore } from '../../stores/useSequencerStore';

export async function tryLoadInitialPresetFromUrlOrHash(audio: any, sequencer: any): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const fileUrl = urlParams.get('file');
  if (fileUrl) {
    try {
      const response = await fetch(fileUrl);
      if (response.ok) {
        const presetData = await response.json();
        await audio.applyPreset(presetData);
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

  if (urlParams.has('trainingId') || urlParams.has('loadPreset') || urlParams.has('loadSection') || urlParams.has('editPatternId')) {
    return true;
  }

  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    try {
      const b64 = hash.substring(1);
      const decodedStr = decodeURIComponent(escape(window.atob(b64)));
      await audio.applyPreset(JSON.parse(decodedStr));
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    } catch (_) {}
  }
  return false;
}

export async function loadInitialPresetPipeline(
  audio: any,
  sequencer: any,
  userProfile: any,
  setPresetFiles: (files: string[]) => void
): Promise<void> {
  const loadedFromUrl = await tryLoadInitialPresetFromUrlOrHash(audio, sequencer);
  let restored = loadedFromUrl;

  if (!restored) {
    const lastPresetId = localStorage.getItem('girador_last_loaded_preset_id');
    if (lastPresetId) {
      try {
        const { getCloudPreset } = await import('../../cloudLibrary');
        const cloudPreset = await getCloudPreset(lastPresetId);
        if (cloudPreset && cloudPreset.tracks && cloudPreset.tracks.length > 0) {
          const meta = cloudPreset.metadata || { toada: '', nacao: '', compositor: '', ritmo: '' };
          meta.morceauId = lastPresetId;
          cloudPreset.metadata = meta;
          await audio.applyPreset(cloudPreset);
          audio.setActivePresetName(`cloud:${lastPresetId}`);
          restored = true;
        } else {
          localStorage.removeItem('girador_last_loaded_preset_id');
        }
      } catch (_) {
        localStorage.removeItem('girador_last_loaded_preset_id');
      }
    }
  }

  if (!restored) {
    try {
      const { getAutosave, clearAutosave } = await import('../../db');
      const savedState = await getAutosave();
      if (savedState?.tracks?.length > 0) {
        await audio.applyPreset(savedState);
        restored = true;
      } else if (savedState) {
        await clearAutosave().catch(() => {});
      }
    } catch (_) {}
  }

  try {
    const res = await fetch(`${ASSETS_BASE_URL}presets/catalog.json`);
    const files: string[] = await res.json();
    setPresetFiles(files);
    if (files.length > 0 && !restored) {
      const isOtherGroup = Boolean(userProfile?.groupId && !userProfile.groupId.toLowerCase().includes('samambaia'));
      const groupId = isOtherGroup ? userProfile?.groupId : 'Samambaia';
      if (groupId) {
        try {
          const defaultPresetId = await getDefaultGroupPresetId(groupId);
          if (defaultPresetId) {
            const { getCloudPreset } = await import('../../cloudLibrary');
            const cloudPreset = await getCloudPreset(defaultPresetId);
            if (cloudPreset && cloudPreset.tracks && cloudPreset.tracks.length > 0) {
              audio.setActivePresetName(`cloud:${defaultPresetId}`);
              await audio.applyPreset(cloudPreset);
              return;
            }
          }
        } catch (_) {}
      }
      audio.setActivePresetName(files[0]);
      audio.loadFallbackPreset(files[0]);
    }
  } catch (_) {}
  finally {
    vocalEngineService.rehydrateVocalBuffers(useSequencerStore.getState().tracks).catch(() => {});
  }
}
