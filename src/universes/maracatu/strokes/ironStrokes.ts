/**
 * 
 * O Girador - Gonguê / Iron Bell Stroke Definitions & Pairs
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getGongueStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    {
      symbol: 'G',
      label: isFr ? 'Grave Fort' : 'Grave Forte',
      shortcut: 'G',
      colorKey: 'G'
    },
    {
      symbol: 'g',
      label: isFr ? 'Grave Faible' : 'Grave Fraco',
      shortcut: 'g',
      colorKey: 'g'
    },
    {
      symbol: 'A',
      label: isFr ? 'Aigu Fort' : 'Agudo Forte',
      shortcut: 'A',
      colorKey: 'A'
    },
    {
      symbol: 'a',
      label: isFr ? 'Aigu Faible' : 'Agudo Fraco',
      shortcut: 'a',
      colorKey: 'a'
    },
    {
      symbol: 'X',
      label: isFr ? 'Corps / Flanc' : 'Corpo do sino',
      shortcut: 'X',
      colorKey: 'X'
    },
    {
      symbol: 'B',
      label: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)',
      shortcut: 'B',
      colorKey: 'B'
    },
  ];
}

export function getGongueStrokePairs(
  allStrokes: StrokeDef[],
  isFr: boolean
): StrokePair[] {
  const gStrong = allStrokes.find(s => s.symbol === 'G');
  const gWeak = allStrokes.find(s => s.symbol === 'g');
  const aStrong = allStrokes.find(s => s.symbol === 'A');
  const aWeak = allStrokes.find(s => s.symbol === 'a');
  const xStroke = allStrokes.find(s => s.symbol === 'X');
  const bStroke = allStrokes.find(s => s.symbol === 'B');

  const pairs: StrokePair[] = [];
  if (gStrong) {
    const strokes = [gStrong, gWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'G',
      strong: gStrong,
      weak: gWeak,
      strokes,
      mainLabel: isFr ? 'Grave' : 'Grave'
    });
  }
  if (aStrong) {
    const strokes = [aStrong, aWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'A',
      strong: aStrong,
      weak: aWeak,
      strokes,
      mainLabel: isFr ? 'Aigu' : 'Agudo'
    });
  }
  if (xStroke) {
    pairs.push({
      id: 'X',
      strong: xStroke,
      strokes: [xStroke],
      mainLabel: isFr ? 'Corps / Flanc' : 'Corpo'
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
