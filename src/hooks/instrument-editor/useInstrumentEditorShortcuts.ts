
import {
  useInstrumentEditorKeyboard,
  UseInstrumentEditorKeyboardParams,
} from '../editor/useInstrumentEditorKeyboard';

export type UseInstrumentEditorShortcutsParams = UseInstrumentEditorKeyboardParams;

/**
 * Hook gérant l'ensemble des raccourcis clavier de l'éditeur détaillé :
 * - Bascule Puxador / Coro via la touche Tab en contexte vocal
 * - Touche Échap (Escape) pour fermer l'éditeur ou flouter les champs
 * - Flèches Haut/Bas pour cycler les nuances et frappes d'instruments
 * - Touche 0 / Suppr pour effacer le pas actif
 * - Raccourcis directs de frappes selon la nomenclature Maracatu
 */
export function useInstrumentEditorShortcuts(params: UseInstrumentEditorShortcutsParams) {
  useInstrumentEditorKeyboard(params);
}
