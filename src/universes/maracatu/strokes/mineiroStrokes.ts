/**
 * 
 * O Girador - Mineiro Stroke Definitions & Pairs
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getMineiroStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    {
      symbol: 'P',
      label: isFr ? 'Poussé Fort' : 'Push Forte',
      shortcut: 'P',
      colorKey: 'P'
    },
    {
      symbol: 'p',
      label: isFr ? 'Poussé Faible' : 'Push Fraco',
      shortcut: 'p',
      colorKey: 'p'
    },
    {
      symbol: 'T',
      label: isFr ? 'Tiré Fort' : 'Pull Forte',
      shortcut: 'T',
      colorKey: 'T'
    },
    {
      symbol: 't',
      label: isFr ? 'Tiré Faible' : 'Pull Fraco',
      shortcut: 't',
      colorKey: 't'
    },
    {
      symbol: 'L',
      label: isFr ? 'Latéral' : 'Lateral',
      shortcut: 'L',
      colorKey: 'L'
    },
    {
      symbol: 'B',
      label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
      shortcut: 'B',
      colorKey: 'B'
    },
  ];
}

export function getMineiroStrokePairs(allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  const pStrong = allStrokes.find(s => s.symbol === 'P');
  const pWeak = allStrokes.find(s => s.symbol === 'p');
  const tStrong = allStrokes.find(s => s.symbol === 'T');
  const tWeak = allStrokes.find(s => s.symbol === 't');
  const lStroke = allStrokes.find(s => s.symbol === 'L');
  const bStroke = allStrokes.find(s => s.symbol === 'B');

  const pairs: StrokePair[] = [];
  if (pStrong) {
    const strokes = [pStrong, pWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'P',
      strong: pStrong,
      weak: pWeak,
      strokes,
      mainLabel: isFr ? 'Poussé' : 'Push'
    });
  }
  if (tStrong) {
    const strokes = [tStrong, tWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'T',
      strong: tStrong,
      weak: tWeak,
      strokes,
      mainLabel: isFr ? 'Tiré' : 'Pull'
    });
  }
  if (lStroke) {
    pairs.push({
      id: 'L',
      strong: lStroke,
      strokes: [lStroke],
      mainLabel: isFr ? 'Latéral' : 'Lateral'
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
