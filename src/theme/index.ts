/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MusicalStyleId, MixerThemeDefinition } from './mixerTheme.types';
import { MARACATU_MIXER_THEME } from './maracatu.mixer.theme';

export * from './mixerTheme.types';
export * from './maracatu.mixer.theme';
export * from './colorMap';

export const MIXER_THEMES: Record<MusicalStyleId, MixerThemeDefinition> = {
  maracatu: MARACATU_MIXER_THEME,
  samba: MARACATU_MIXER_THEME, // Fallback initial prêt pour implémentation Samba
  capoeira: MARACATU_MIXER_THEME, // Fallback initial prêt pour implémentation Capoeira
};

/**
 * Résolution O(1) du thème de console de mixage actif.
 */
export function getMixerTheme(styleId: MusicalStyleId = 'maracatu'): MixerThemeDefinition {
  return MIXER_THEMES[styleId] || MARACATU_MIXER_THEME;
}
