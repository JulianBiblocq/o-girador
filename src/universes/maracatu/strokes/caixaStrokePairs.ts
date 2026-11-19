/**
 * O Girador - Caixa and Tarol Stroke Pairs (< 95 lignes)
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getCaixaStrokePairs(
  allStrokes: StrokeDef[],
  isFr: boolean,
  isLeftHanded: boolean
): StrokePair[] {
  const find = (sym: string) => allStrokes.find((s) => s.symbol === sym);
  const dStrong = find('D'), dWeak = find('d');
  const eStrong = find('E'), eWeak = find('e');
  const fStrong = find('F'), fWeak = find('f');
  const aRight = find('A'), aLeft = find('a');
  const rStrong = find('R'), rWeak = find('r');
  const cStroke = find('C'), xStroke = find('X');
  const bStroke = find('B'), bSoft = find('b'), slash = find('/'), dot = find('.');

  const pairs: StrokePair[] = [];
  if (dStrong) {
    pairs.push({
      id: 'D', strong: dStrong, weak: dWeak,
      strokes: [dStrong, dWeak].filter(Boolean) as StrokeDef[],
      mainLabel: isFr ? (isLeftHanded ? 'Main Gauche' : 'Main Droite') : (isLeftHanded ? 'Mão Esquerda' : 'Mão Direita'),
    });
  }
  if (eStrong) {
    pairs.push({
      id: 'E', strong: eStrong, weak: eWeak,
      strokes: [eStrong, eWeak].filter(Boolean) as StrokeDef[],
      mainLabel: isFr ? (isLeftHanded ? 'Main Droite' : 'Main Gauche') : (isLeftHanded ? 'Mão Direita' : 'Mão Esquerda'),
    });
  }
  if (fStrong) {
    pairs.push({
      id: 'F', strong: fStrong, weak: fWeak,
      strokes: [fStrong, fWeak].filter(Boolean) as StrokeDef[],
      mainLabel: 'Fla',
    });
  }
  if (aRight) {
    pairs.push({
      id: 'A', strong: aRight, weak: aLeft,
      strokes: [aRight, aLeft].filter(Boolean) as StrokeDef[],
      mainLabel: 'Rimshot',
    });
  }
  if (rStrong) {
    pairs.push({
      id: 'R', strong: rStrong, weak: rWeak,
      strokes: [rStrong, rWeak].filter(Boolean) as StrokeDef[],
      mainLabel: 'Rufada',
    });
  }
  if (cStroke) {
    pairs.push({
      id: 'C', strong: cStroke, weak: xStroke,
      strokes: [cStroke, xStroke].filter(Boolean) as StrokeDef[],
      mainLabel: isFr ? 'Clic / Cerclage' : 'Click / Aro',
    });
  }
  if (bStroke) {
    pairs.push({
      id: 'B', strong: bStroke, weak: bSoft, third: slash,
      strokes: [bStroke, bSoft, slash, dot].filter(Boolean) as StrokeDef[],
      mainLabel: 'Barulho',
    });
  }
  return pairs;
}
