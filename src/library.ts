import { Preset } from './types';

export const LIBRARY_STORAGE_KEY = 'baquemix_personal_library';

export interface LocalLibrary {
  [name: string]: Preset;
}

export function getLocalLibrary(): LocalLibrary {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local library', e);
    return {};
  }
}

export function savePresetToLibrary(name: string, preset: Preset): void {
  const lib = getLocalLibrary();
  lib[name] = preset;
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(lib));
}

export function deletePresetFromLibrary(name: string): void {
  const lib = getLocalLibrary();
  delete lib[name];
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(lib));
}
