/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Multilingual Translations (Portuguese & French)
 */

import { i18nPtPart1 } from './i18nPtPart1';
import { i18nPtPart2 } from './i18nPtPart2';
import { i18nFrPart1 } from './i18nFrPart1';
import { i18nFrPart2 } from './i18nFrPart2';

export const i18n = {
  pt: {
    ...i18nPtPart1,
    ...i18nPtPart2
  },
  fr: {
    ...i18nFrPart1,
    ...i18nFrPart2
  }
};
