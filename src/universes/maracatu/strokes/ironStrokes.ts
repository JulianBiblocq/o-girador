/**
 * O Girador - Gonguê / Iron Bell Stroke Definitions & Pairs (< 75 lignes)
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getGongueStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    { symbol: 'G', label: isFr ? 'Grave Fort' : 'Grave Forte', shortcut: 'G', colorKey: 'G' },
    { symbol: 'g', label: isFr ? 'Grave Faible' : 'Grave Fraco', shortcut: 'g', colorKey: 'g' },
    { symbol: 'A', label: isFr ? 'Aigu Fort' : 'Agudo Forte', shortcut: 'A', colorKey: 'A' },
    { symbol: 'a', label: isFr ? 'Aigu Faible' : 'Agudo Fraco', shortcut: 'a', colorKey: 'a' },
    { symbol: 'X', label: isFr ? 'X — Arrêt étouffé (Parada)' : 'X — Parada (Toque abafado)', shortcut: 'X', colorKey: 'X' },
    { symbol: 'B', label: isFr ? 'B — Barulho (Appel + Tenue)' : 'B — Barulho (Chamada + Sustentação)', shortcut: 'B', colorKey: 'B' },
    { symbol: 'b', label: isFr ? 'b — Barulho doux (Fade-In sans appel)' : 'b — Barulho suave (Fade-In sem chamada)', shortcut: 'b', colorKey: 'b' },
    { symbol: '/', label: isFr ? '/ — Extinction Barulho (Fade-Out)' : '/ — Extinção Barulho (Fade-Out)', shortcut: '/', colorKey: '/' },
    { symbol: '.', label: isFr ? '. — Fin du Barulho (Silence)' : '. — Fim do Barulho (Silêncio)', shortcut: '.', colorKey: '.' },
  ];
}

export function getGongueStrokePairs(allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  const find = (sym: string) => allStrokes.find((s) => s.symbol === sym);
  const gStrong = find('G'), gWeak = find('g');
  const aStrong = find('A'), aWeak = find('a');
  const xStroke = find('X');
  const bStroke = find('B'), bSoft = find('b'), slash = find('/'), dot = find('.');

  const pairs: StrokePair[] = [];
  if (gStrong) {
    pairs.push({ id: 'G', strong: gStrong, weak: gWeak, strokes: [gStrong, gWeak].filter(Boolean) as StrokeDef[], mainLabel: isFr ? 'Grave' : 'Grave — Topo' });
  }
  if (aStrong) {
    pairs.push({ id: 'A', strong: aStrong, weak: aWeak, strokes: [aStrong, aWeak].filter(Boolean) as StrokeDef[], mainLabel: isFr ? 'Aigu' : 'Agudo — Base' });
  }
  if (xStroke) {
    pairs.push({ id: 'X', strong: xStroke, strokes: [xStroke], mainLabel: 'Parada (X)' });
  }
  if (bStroke) {
    pairs.push({ id: 'B', strong: bStroke, weak: bSoft, third: slash, strokes: [bStroke, bSoft, slash, dot].filter(Boolean) as StrokeDef[], mainLabel: 'Barulho' });
  }
  return pairs;
}
