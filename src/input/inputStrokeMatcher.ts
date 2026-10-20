import { InstrumentAudioConfig, StrokeMapping } from '../data/audioConfig';

/**
 * Maps left-handed / right-handed symmetrical key stroke switches.
 */
export function applyHandedness(key: string, config: InstrumentAudioConfig, isLeftHanded: boolean): string {
  if (!config.leftHandedSupport || !isLeftHanded) return key;
  const map: Record<string, string> = {
    D: 'E',
    E: 'D',
    Q: 'D',
    d: 'e',
    e: 'd',
    q: 'd',
    R: 'r',
    r: 'R',
  };
  return map[key] ?? key;
}

/**
 * Matches a key string against an instrument's stroke mappings.
 */
export function findMatchingStroke(
  keyStr: string,
  config: InstrumentAudioConfig
): { matchedStroke: StrokeMapping | null; matchedSymbol: string | null } {
  for (const stroke of config.strokes) {
    if (stroke.caseSensitive) {
      if (stroke.keys.includes(keyStr)) {
        return { matchedStroke: stroke, matchedSymbol: stroke.symbol };
      }
    } else {
      const found = stroke.keys.some((k) => k.toLowerCase() === keyStr.toLowerCase());
      if (found) {
        return { matchedStroke: stroke, matchedSymbol: stroke.symbol };
      }
    }
  }
  return { matchedStroke: null, matchedSymbol: null };
}

/**
 * Checks if the key corresponds to a continuous looping Barulho stroke.
 */
export function isBarulhoStroke(keyStr: string, config: InstrumentAudioConfig): boolean {
  for (const stroke of config.strokes) {
    if (stroke.isBarulho) {
      if (stroke.caseSensitive) {
        if (stroke.keys.includes(keyStr)) return true;
      } else {
        if (stroke.keys.some((k) => k.toLowerCase() === keyStr.toLowerCase())) return true;
      }
    }
  }
  return false;
}
