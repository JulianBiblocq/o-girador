/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export {
  CLOUD_PRESETS_COLLECTION,
  presetCache,
  getCloudPreset,
  deleteCloudPreset,
  renameCloudPreset,
  togglePresetDraftStatus,
  fetchStoragePresetsJSON,
  isPresetAuthorized,
  SANCTUARIZED_PRESET_IDS,
  isTestPresetName,
  isTestEnvironment,
} from './cloudPresetsStorage';

export { savePresetToCloud } from './services/cloud-presets/cloudPresetsSaver';
export { fetchCloudPresets } from './services/cloud-presets/cloudPresetsFetcher';
