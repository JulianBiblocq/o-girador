/**
 * 
 * O-Girador - Color Map Builder for Maracatu Instruments
 */

import { type ThemePalette, STROKE_INTENSITY_MAP } from './maracatuTheme';
import { applyCordelInkedPatina } from '../../../utils/cordelPatina';

/**
 * Generates an O(1) lookup dictionary for a given instrument's colors,
 * with the Cordel inked patina applied so Roda stamps and UI badges match.
 */
export function buildInstrumentColors(themePalette: ThemePalette, familyId: string): Record<string, string> {
  const colors: Record<string, string> = { text: '#f4ecd8' };
  const theme = themePalette[familyId];

  if (!theme) return colors;

  for (const [stroke, intensity] of Object.entries(STROKE_INTENSITY_MAP)) {
    const raw = theme[intensity] ? theme[intensity]! : theme.color;
    colors[stroke] = applyCordelInkedPatina(raw);
  }

  if (theme.overrides) {
    for (const [stroke, colorHex] of Object.entries(theme.overrides)) {
      colors[stroke] = applyCordelInkedPatina(colorHex);
    }
  }

  return colors;
}
