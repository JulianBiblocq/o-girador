/**
 * O Girador - Mineiro Stroke Definitions & Pairs (< 75 lignes)
 * - P / p : P ↑ — Pousser (Avant) | P ↑ — Projetar (Para frente)
 * - T / t : T ↓ — Tirer (Vers soi) | T ↓ — Trazer (Para trás)
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getMineiroStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    { symbol: 'P', label: isFr ? 'P ↑ — Pousser (Avant)' : 'P ↑ — Projetar (Para frente)', shortcut: 'P', colorKey: 'P' },
    { symbol: 'p', label: isFr ? 'p ↑ — Pousser Faible (Avant)' : 'p ↑ — Projetar Fraco (Para frente)', shortcut: 'p', colorKey: 'p' },
    { symbol: 'T', label: isFr ? 'T ↓ — Tirer (Vers soi)' : 'T ↓ — Trazer (Para trás)', shortcut: 'T', colorKey: 'T' },
    { symbol: 't', label: isFr ? 't ↓ — Tirer Faible (Vers soi)' : 't ↓ — Trazer Fraco (Para trás)', shortcut: 't', colorKey: 't' },
    { symbol: 'L', label: isFr ? 'Latéral' : 'Lateral', shortcut: 'L', colorKey: 'L' },
    { symbol: 'B', label: isFr ? 'B — Barulho (Appel + Tenue)' : 'B — Barulho (Chamada + Sustentação)', shortcut: 'B', colorKey: 'B' },
    { symbol: 'b', label: isFr ? 'b — Barulho doux (Fade-In sans appel)' : 'b — Barulho suave (Fade-In sem chamada)', shortcut: 'b', colorKey: 'b' },
    { symbol: '/', label: isFr ? '/ — Extinction Barulho (Fade-Out)' : '/ — Extinção Barulho (Fade-Out)', shortcut: '/', colorKey: '/' },
    { symbol: '.', label: isFr ? '. — Fin du Barulho (Silence)' : '. — Fim do Barulho (Silêncio)', shortcut: '.', colorKey: '.' },
  ];
}

export function getMineiroStrokePairs(allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  const find = (sym: string) => allStrokes.find((s) => s.symbol === sym);
  const pStrong = find('P'), pWeak = find('p');
  const tStrong = find('T'), tWeak = find('t');
  const lStroke = find('L');
  const bStroke = find('B'), bSoft = find('b'), slash = find('/'), dot = find('.');

  const pairs: StrokePair[] = [];
  if (pStrong) {
    pairs.push({ id: 'P', strong: pStrong, weak: pWeak, strokes: [pStrong, pWeak].filter(Boolean) as StrokeDef[], mainLabel: isFr ? 'P ↑ Pousser' : 'P ↑ Projetar' });
  }
  if (tStrong) {
    pairs.push({ id: 'T', strong: tStrong, weak: tWeak, strokes: [tStrong, tWeak].filter(Boolean) as StrokeDef[], mainLabel: isFr ? 'T ↓ Tirer' : 'T ↓ Trazer' });
  }
  if (lStroke) {
    pairs.push({ id: 'L', strong: lStroke, strokes: [lStroke], mainLabel: isFr ? 'Latéral' : 'Lado' });
  }
  if (bStroke) {
    pairs.push({ id: 'B', strong: bStroke, weak: bSoft, third: slash, strokes: [bStroke, bSoft, slash, dot].filter(Boolean) as StrokeDef[], mainLabel: 'Barulho' });
  }
  return pairs;
}
