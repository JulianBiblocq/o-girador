/**
 * O Girador - Multilingual Translations (Portuguese & French)
 */

import { i18nPtPart1 } from './i18nPtPart1';
import { i18nPtPart2 } from './i18nPtPart2';
import { i18nFrPart1 } from './i18nFrPart1';
import { i18nFrPart2 } from './i18nFrPart2';

export const i18n = {
  pt: {
    ...i18nPtPart1,
    ...i18nPtPart2,
    masterTitle: 'MASTER',
    masterEqTitle: 'EQ 3 BANDAS',
    masterVol: 'SAÍDA MASTER',
    tooltipMasterReverb: 'Ativar / Desativar Reverb Master',
    tooltipMasterDisto: 'Ativar / Desativar Saturação Master',
    tooltipMasterComp: 'Ativar / Desativar Compressor Master',
  },
  fr: {
    ...i18nFrPart1,
    ...i18nFrPart2,
    masterTitle: 'MASTER',
    masterEqTitle: 'EQ 3 BANDES',
    masterVol: 'SORTIE MASTER',
    tooltipMasterReverb: 'Activer / Contourner la Réverbe Master',
    tooltipMasterDisto: 'Activer / Contourner la Saturation Master',
    tooltipMasterComp: 'Activer / Contourner le Compresseur Master',
  },
};
