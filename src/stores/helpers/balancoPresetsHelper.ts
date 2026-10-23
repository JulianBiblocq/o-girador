
import { BalancoPreset } from '../../types/balanco.types';

export const FACTORY_BALANCOS: BalancoPreset[] = [
  {
    id: 'maracatu-trad',
    name: 'Maracatu Nagô',
    ownerId: 'factory',
    authorName: 'O Girador',
    visibility: 'public',
    division: 16,
    offsets: [0, 8, -29, -58],
    isFactory: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'straight',
    name: 'Binaire droit / Quantisé',
    ownerId: 'factory',
    authorName: 'O Girador',
    visibility: 'public',
    division: 16,
    offsets: [0, 0, 0, 0],
    isFactory: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'ijexa-soft',
    name: 'Ijexá Léger',
    ownerId: 'factory',
    authorName: 'O Girador',
    visibility: 'public',
    division: 16,
    offsets: [0, 6, -15, -30],
    isFactory: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  }
];

export const LOCAL_BALANCOS_STORAGE_KEY = 'girador_user_balancos';

export const loadInitialUserBalancoPresets = (): BalancoPreset[] => {
  try {
    const raw = localStorage.getItem(LOCAL_BALANCOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des balanços locaux:', e);
  }
  return [];
};

export const saveUserBalancoPresetsToStorage = (presets: BalancoPreset[]) => {
  try {
    localStorage.setItem(LOCAL_BALANCOS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde des balanços locaux:', e);
  }
};
