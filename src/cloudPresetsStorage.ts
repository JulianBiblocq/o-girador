/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import { Preset } from './types';
import LZString from 'lz-string';
import { CLOUD_PRESETS_COLLECTION, presetCache } from './services/cloud-presets/presetCache';

export { CLOUD_PRESETS_COLLECTION, presetCache };
export {
  SANCTUARIZED_PRESET_IDS,
  isTestPresetName,
  isTestEnvironment,
  deleteCloudPreset,
  renameCloudPreset,
  togglePresetDraftStatus,
} from './services/cloud-presets/sanctuarization';
export {
  listStoragePath,
  fetchStoragePresetsJSON,
} from './services/cloud-presets/storagePresetsFetcher';
export { isPresetAuthorized } from './services/cloud-presets/presetAuthorization';

/**
 * Récupère un preset Cloud depuis Firestore ou le cache mémoire.
 */
export async function getCloudPreset(presetId: string): Promise<Preset | null> {
  if (presetCache.has(presetId)) {
    return presetCache.get(presetId) || null;
  }
  const docSnap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
  if (docSnap.exists()) {
    const dataString = docSnap.data().data;
    try {
      if (typeof dataString === 'object' && dataString !== null) {
        const parsed = dataString as Preset;
        presetCache.set(presetId, parsed);
        return parsed;
      }
      if (typeof dataString === 'string') {
        if (dataString.startsWith('{')) {
          const parsed = JSON.parse(dataString) as Preset;
          presetCache.set(presetId, parsed);
          return parsed;
        }
        const jsonStr = LZString.decompressFromBase64(dataString) || LZString.decompressFromUTF16(dataString);
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr) as Preset;
          presetCache.set(presetId, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.error("getCloudPreset - Erreur lors de l'analyse des données :", e);
    }
  }
  return null;
}
