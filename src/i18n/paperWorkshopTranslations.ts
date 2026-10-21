/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Point d'entrée des traductions de l'Atelier Papier Cordel et Légende (< 45 lignes).
 */

import { paperWorkshopTranslationsFr } from './paperWorkshopTranslationsFr';
import { paperWorkshopTranslationsPt } from './paperWorkshopTranslationsPt';
import { useSequencerStore } from '../stores/useSequencerStore';

export const PAPER_I18N = {
  fr: paperWorkshopTranslationsFr,
  pt: paperWorkshopTranslationsPt,
} as const;

export type PaperWorkshopI18nKey = keyof typeof paperWorkshopTranslationsFr;

export function tPaper(lang: 'fr' | 'pt' | undefined, key: PaperWorkshopI18nKey): string {
  const currentLang = lang === 'fr' ? 'fr' : 'pt';
  return PAPER_I18N[currentLang][key] || PAPER_I18N.pt[key] || key;
}

export function usePaperT() {
  const lang = useSequencerStore((s) => s.lang);
  return {
    lang,
    t: (key: PaperWorkshopI18nKey) => tPaper(lang, key),
  };
}
