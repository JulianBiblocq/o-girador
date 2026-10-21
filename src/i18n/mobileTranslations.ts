/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Point d'entrée des traductions Mobile avec hook réactif useMobileT (< 45 lignes).
 */

import { mobileTranslationsFr } from './mobileTranslationsFr';
import { mobileTranslationsPt } from './mobileTranslationsPt';
import { useSequencerStore } from '../stores/useSequencerStore';

export const MOBILE_I18N = {
  fr: mobileTranslationsFr,
  pt: mobileTranslationsPt,
} as const;

export type MobileI18nKey = keyof typeof mobileTranslationsFr;

export function tMobile(lang: 'fr' | 'pt' | undefined, key: MobileI18nKey): string {
  const currentLang = lang === 'fr' ? 'fr' : 'pt';
  return MOBILE_I18N[currentLang][key] || MOBILE_I18N.pt[key] || key;
}

export function useMobileT() {
  const lang = useSequencerStore((s) => s.lang);
  return {
    lang,
    t: (key: MobileI18nKey) => tMobile(lang, key),
  };
}
