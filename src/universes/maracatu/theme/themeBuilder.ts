/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O-Girador - Color Map Builder for Maracatu Instruments
 */

import { ThemePalette, STROKE_INTENSITY_MAP } from './maracatuTheme';

/**
 * Generates an O(1) lookup dictionary for a given instrument's colors.
 * This runs once at initialization to prevent Render Thrashing.
 */
export function buildInstrumentColors(themePalette: ThemePalette, familyId: string): Record<string, string> {
  const colors: Record<string, string> = { text: '#f4ecd8' };
  const theme = themePalette[familyId];

  if (!theme) return colors;

  // Apply generic mapping
  for (const [stroke, intensity] of Object.entries(STROKE_INTENSITY_MAP)) {
    if (theme[intensity]) {
      colors[stroke] = theme[intensity]!;
    } else {
      colors[stroke] = theme.color;
    }
  }

  // Apply explicit overrides (has priority)
  if (theme.overrides) {
    for (const [stroke, colorHex] of Object.entries(theme.overrides)) {
      colors[stroke] = colorHex;
    }
  }

  return colors;
}
