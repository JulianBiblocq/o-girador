/**
 * O Girador - Timbal Stroke Pairs (< 85 lignes)
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getTimbalStrokePairs(
  allStrokes: StrokeDef[],
  isFr: boolean,
  _isLeftHanded: boolean
): StrokePair[] {
  const find = (sym: string) => allStrokes.find((s) => s.symbol === sym);
  const pairs: StrokePair[] = [];

  const pushPair = (id: string, strongSym: string, weakSym: string, mainLabel: string) => {
    const strong = find(strongSym);
    const weak = find(weakSym);
    if (strong) {
      pairs.push({ id, strong, weak, strokes: [strong, weak].filter(Boolean) as StrokeDef[], mainLabel });
    }
  };

  pushPair('G', 'G', 'g', isFr ? 'Basse' : 'Grave');
  pushPair('A', 'A', 'a', 'Aberto');
  pushPair('S', 'S', 's', 'Slap');
  pushPair('D', 'D', 'd', isFr ? 'Doigts' : 'Dedos');
  pushPair('P', 'P', 'p', isFr ? 'Pressé' : 'Preso');
  pushPair('F', 'F', 'f', 'Fla');
  pushPair('V', 'V', 'v', 'Fla Slap');

  const cStroke = find('C');
  if (cStroke) {
    pairs.push({ id: 'C', strong: cStroke, strokes: [cStroke], mainLabel: isFr ? 'Clap' : 'Palma' });
  }
  const bStroke = find('B'), bSoft = find('b'), slash = find('/'), dot = find('.');
  if (bStroke) {
    pairs.push({
      id: 'B', strong: bStroke, weak: bSoft, third: slash,
      strokes: [bStroke, bSoft, slash, dot].filter(Boolean) as StrokeDef[],
      mainLabel: 'Barulho',
    });
  }
  return pairs;
}
