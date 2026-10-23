/**
 * 
 * O Girador - Agbê Stroke Definitions & Pairs
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getAgbeStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    {
      symbol: 'D',
      label: isFr ? 'Projection Droite Fort' : 'Projeção Direita Forte',
      shortcut: 'D',
      colorKey: 'D'
    },
    {
      symbol: 'd',
      label: isFr ? 'Projection Droite Faible' : 'Projeção Direita Fraca',
      shortcut: 'd',
      colorKey: 'd'
    },
    {
      symbol: 'E',
      label: isFr ? 'Projection Gauche Fort' : 'Projeção Esquerda Forte',
      shortcut: 'E',
      colorKey: 'E'
    },
    {
      symbol: 'e',
      label: isFr ? 'Projection Gauche Faible' : 'Projeção Esquerda Fraca',
      shortcut: 'e',
      colorKey: 'e'
    },
    {
      symbol: 'S',
      label: isFr ? 'Salto' : 'Salto',
      shortcut: 'S',
      colorKey: 'S'
    },
    {
      symbol: 'V',
      label: isFr ? 'Volta' : 'Volta',
      shortcut: 'V',
      colorKey: 'V'
    },
    {
      symbol: 'B',
      label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
      shortcut: 'B',
      colorKey: 'B'
    },
  ];
}

export function getAgbeStrokePairs(allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  const dStrong = allStrokes.find(s => s.symbol === 'D');
  const dWeak = allStrokes.find(s => s.symbol === 'd');
  const eStrong = allStrokes.find(s => s.symbol === 'E');
  const eWeak = allStrokes.find(s => s.symbol === 'e');
  const sStroke = allStrokes.find(s => s.symbol === 'S');
  const vStroke = allStrokes.find(s => s.symbol === 'V');
  const bStroke = allStrokes.find(s => s.symbol === 'B');

  const pairs: StrokePair[] = [];
  if (dStrong) {
    const strokes = [dStrong, dWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'D',
      strong: dStrong,
      weak: dWeak,
      strokes,
      mainLabel: isFr ? 'Main Droite' : 'Mão Direita'
    });
  }
  if (eStrong) {
    const strokes = [eStrong, eWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'E',
      strong: eStrong,
      weak: eWeak,
      strokes,
      mainLabel: isFr ? 'Main Gauche' : 'Mão Esquerda'
    });
  }
  if (sStroke) {
    const strokes = [sStroke, vStroke].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'S',
      strong: sStroke,
      weak: vStroke,
      strokes,
      mainLabel: isFr ? 'Salto / Volta' : 'Salto / Volta'
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
