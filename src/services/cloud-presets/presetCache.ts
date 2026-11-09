import { Preset } from '../../types';

export const CLOUD_PRESETS_COLLECTION = 'presets';
export const presetCache = new Map<string, Preset>();

export const normalizePresetName = (name: string): string =>
  (name || '')
    .replace(/\.json$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
