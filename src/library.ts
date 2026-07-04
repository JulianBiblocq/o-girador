import { Preset } from './types';
import { getLocalLibrary, savePresetToLibrary, deletePresetFromLibrary, LocalLibrary } from './db';

export const LIBRARY_STORAGE_KEY = 'oGirador_personal_library';

export { getLocalLibrary, savePresetToLibrary, deletePresetFromLibrary };
export type { LocalLibrary };
