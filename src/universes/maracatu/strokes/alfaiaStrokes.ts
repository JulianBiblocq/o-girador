/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Alfaia Stroke Definitions & Pairs (Marcante, Meião, Repique)
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getAlfaiaStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    {
      symbol: 'D',
      label: isFr ? 'Main Droite Fort' : 'Mão Direita Forte',
      shortcut: 'D',
      colorKey: 'D'
    },
    {
      symbol: 'd',
      label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca',
      shortcut: 'd',
      colorKey: 'd'
    },
    {
      symbol: 'E',
      label: isFr ? 'Main Gauche Fort' : 'Mão Esquerda Forte',
      shortcut: 'E',
      colorKey: 'E'
    },
    {
      symbol: 'e',
      label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca',
      shortcut: 'e',
      colorKey: 'e'
    },
    {
      symbol: 'C',
      label: isFr ? 'Clic baguettes' : 'Click',
      shortcut: 'C',
      colorKey: 'C'
    },
    {
      symbol: 'X',
      label: isFr ? 'Cerclage (Aro)' : 'Toque no aro',
      shortcut: 'X',
      colorKey: 'X'
    },
    {
      symbol: 'I',
      label: isFr ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Iguarassu)',
      shortcut: 'I',
      colorKey: 'I'
    },
    {
      symbol: 'B',
      label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
      shortcut: 'B',
      colorKey: 'B'
    },
  ];
}

export function getAlfaiaStrokePairs(
  allStrokes: StrokeDef[],
  isFr: boolean,
  isLeftHanded: boolean
): StrokePair[] {
  const dStrong = allStrokes.find(s => s.symbol === 'D');
  const dWeak = allStrokes.find(s => s.symbol === 'd');
  const eStrong = allStrokes.find(s => s.symbol === 'E');
  const eWeak = allStrokes.find(s => s.symbol === 'e');
  const iStroke = allStrokes.find(s => s.symbol === 'I');
  const cStroke = allStrokes.find(s => s.symbol === 'C');
  const xStroke = allStrokes.find(s => s.symbol === 'X');
  const bStroke = allStrokes.find(s => s.symbol === 'B');

  const pairs: StrokePair[] = [];
  if (dStrong) {
    const strokes = [dStrong, dWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'D',
      strong: dStrong,
      weak: dWeak,
      strokes,
      mainLabel: isFr ? (isLeftHanded ? 'Main Gauche' : 'Main Droite') : (isLeftHanded ? 'Mão Esquerda' : 'Mão Direita')
    });
  }
  if (eStrong) {
    const strokes = [eStrong, eWeak, iStroke].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'E',
      strong: eStrong,
      weak: eWeak,
      third: iStroke,
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
