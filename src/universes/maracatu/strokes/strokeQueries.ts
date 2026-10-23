/**
 * 
 * O Girador - Stroke Verification & Query Helpers
 */

import { StrokeDef } from './strokeTypes';
import { getStrokesForInstrument, getStrokePairs } from './strokeGetters';

export function getExoticStrokes(
  instId: string,
  instType: string,
  lang: string,
  isLeftHanded: boolean
): StrokeDef[] {
  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  return pairs
    .filter(p => !p.weak)
    .map(p => p.strong);
}

export function isStrokeActiveByDefault(instId: string, stroke: string): boolean {
  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    return ['D', 'E', 'd', 'e'].includes(stroke);
  }
  if (instId === 'caixa' || instId === 'tarol') {
    return ['D', 'E', 'd', 'e', 'R', 'r', 'F', 'f'].includes(stroke);
  }
  if (instId === 'gongue') {
    return ['G', 'A', 'g', 'a'].includes(stroke);
  }
  if (instId === 'agbe') {
    return ['D', 'E', 'd', 'e'].includes(stroke);
  }
  if (instId === 'mineiro') {
    return ['P', 'T', 'p', 't'].includes(stroke);
  }
  if (instId === 'timbal') {
    return ['G', 'g', 'A', 'a', 'S', 's', 'D', 'd', 'P', 'p'].includes(stroke);
  }
  if (instId === 'apito') {
    return ['W', 'w'].includes(stroke);
  }
  return true;
}

export function strokeExistsForInstrument(
  symbol: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): boolean {
  if (!symbol || symbol === '0') return true;
  const strokes = getStrokesForInstrument(instId, instType, lang, isLeftHanded);
  return strokes.some(s => s.symbol === symbol);
}
