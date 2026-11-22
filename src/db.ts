export type { LocalLibrary } from './services/db/localLibraryStore';
export type { VocalLookupContext } from './services/db/vocalRecordingsStore';
export {
  buildVocalRecordingCandidateKeys,
  saveVocalRecording,
  getVocalRecording,
  getAllVocalRecordings,
  deleteVocalRecording,
  clearAllRecordings,
} from './services/db/vocalRecordingsStore';

export {
  saveAutosave,
  getAutosave,
  clearAutosave,
} from './services/db/autosaveStore';

export {
  getLocalLibrary,
  savePresetToLibrary,
  deletePresetFromLibrary,
} from './services/db/localLibraryStore';
