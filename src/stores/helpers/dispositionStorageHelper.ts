
import { DispositionPreset } from '../../types/disposition.types';

export const LOCAL_DISPOSITIONS_STORAGE_KEY = 'girador_user_dispositions';

export const loadInitialLocalDispositions = (): DispositionPreset[] => {
  try {
    const raw = localStorage.getItem(LOCAL_DISPOSITIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des dispositions locales:', e);
  }
  return [];
};

export const saveDispositionsToStorage = (presets: DispositionPreset[]) => {
  try {
    localStorage.setItem(LOCAL_DISPOSITIONS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde des dispositions locales:', e);
  }
};
