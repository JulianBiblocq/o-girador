/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Caixa and Tarol Stroke Pairs
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getCaixaStrokePairs(
  allStrokes: StrokeDef[],
  isFr: boolean,
  isLeftHanded: boolean
): StrokePair[] {
  const dStrong = allStrokes.find(s => s.symbol === 'D');
  const dWeak = allStrokes.find(s => s.symbol === 'd');
  const rStrong = allStrokes.find(s => s.symbol === 'R');
  const eStrong = allStrokes.find(s => s.symbol === 'E');
  const eWeak = allStrokes.find(s => s.symbol === 'e');
  const rWeak = allStrokes.find(s => s.symbol === 'r');
  const cStroke = allStrokes.find(s => s.symbol === 'C');
  const xStroke = allStrokes.find(s => s.symbol === 'X');
  const fStrong = allStrokes.find(s => s.symbol === 'F');
  const fWeak = allStrokes.find(s => s.symbol === 'f');
  const bStroke = allStrokes.find(s => s.symbol === 'B');

  const pairs: StrokePair[] = [];
  if (dStrong) {
    const strokes = [dStrong, dWeak, rStrong].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'D',
      strong: dStrong,
      weak: dWeak,
      third: rStrong,
      strokes,
      mainLabel: isFr ? (isLeftHanded ? 'Main Gauche' : 'Main Droite') : (isLeftHanded ? 'Mão Esquerda' : 'Mão Direita')
    });
  }
  if (eStrong) {
    const strokes = [eStrong, eWeak, rWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'E',
      strong: eStrong,
      weak: eWeak,
      third: rWeak,
      strokes,
      mainLabel: isFr ? (isLeftHanded ? 'Main Droite' : 'Main Gauche') : (isLeftHanded ? 'Mão Direita' : 'Mão Esquerda')
    });
  }
  if (cStroke) {
    const strokes = [cStroke, xStroke].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'C',
      strong: cStroke,
      weak: xStroke,
      strokes,
      mainLabel: isFr ? 'Clic / Cerclage' : 'Click / Aro'
    });
  }
  if (fStrong) {
    const strokes = [fStrong, fWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'F',
      strong: fStrong,
      weak: fWeak,
      strokes,
      mainLabel: isFr ? 'Fla (Accents)' : 'Fla (Acentos)'
    });
  }
  if (bStroke) {
    pairs.push({
      id: 'B',
      strong: bStroke,
      strokes: [bStroke],
      mainLabel: isFr ? 'Barulho' : 'Barulho'
    });
  }
  return pairs;
}
