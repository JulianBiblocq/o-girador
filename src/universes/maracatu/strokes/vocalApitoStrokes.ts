/**
 * O Girador - Apito (`L -> l -> / -> .` & `C`) and Vocal Stroke Definitions & Pairs (< 105 lignes)
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getApitoStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    {
      symbol: 'L',
      label: isFr ? 'L — Sifflet long (Appel + Tenue)' : 'L — Apito longo (Chamada + Sustentação)',
      shortcut: 'L',
      colorKey: 'L',
    },
    {
      symbol: 'l',
      label: isFr ? 'l — Sifflet doux (Fade-In / Maintien)' : 'l — Apito suave (Fade-In / Sustentação)',
      shortcut: 'l',
      colorKey: 'l',
    },
    {
      symbol: '/',
      label: isFr ? '/ — Extinction Sifflet (Fade-Out)' : '/ — Extinção Apito (Fade-Out)',
      shortcut: '/',
      colorKey: '/',
    },
    {
      symbol: '.',
      label: isFr ? '. — Fin du Sifflet (Silence)' : '. — Fim do Apito (Silêncio)',
      shortcut: '.',
      colorKey: '.',
    },
    {
      symbol: 'C',
      label: isFr ? 'C — Sifflet court' : 'C — Apito curto',
      shortcut: 'C',
      colorKey: 'C',
    },
  ];
}

export function getApitoStrokePairs(allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  const lStrong = allStrokes.find((s) => s.symbol === 'L');
  const lSoft = allStrokes.find((s) => s.symbol === 'l');
  const slashStroke = allStrokes.find((s) => s.symbol === '/');
  const dotStroke = allStrokes.find((s) => s.symbol === '.');
  const cShort = allStrokes.find((s) => s.symbol === 'C');

  const pairs: StrokePair[] = [];
  if (lStrong) {
    pairs.push({
      id: 'L',
      strong: lStrong,
      weak: lSoft,
      third: slashStroke,
      strokes: [lStrong, lSoft, slashStroke, dotStroke].filter(Boolean) as StrokeDef[],
      mainLabel: isFr ? 'Sifflet Long (L)' : 'Apito Longo (L)',
    });
  }
  if (cShort) {
    pairs.push({
      id: 'C',
      strong: cShort,
      strokes: [cShort],
      mainLabel: isFr ? 'Sifflet Court (C)' : 'Apito Curto (C)',
    });
  }
  return pairs;
}

export function getVocalStrokeDefs(instId: string, instType: string, isFr: boolean): StrokeDef[] {
  if (instId === 'puxador') {
    return [{ symbol: 'P', label: 'Puxador', shortcut: 'P', colorKey: 'P' }];
  }
  if (instId === 'coro') {
    return [{ symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'C', colorKey: 'C' }];
  }
  if (instType === 'voice') {
    return [
      { symbol: 'P', label: 'Puxador', shortcut: 'Click top', colorKey: 'P' },
      { symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'Click top', colorKey: 'C' },
    ];
  }
  return [];
}

export function getVocalStrokePairs(instId: string, allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  if (instId === 'puxador') {
    const p = allStrokes[0];
    return p ? [{ id: 'P', strong: p, strokes: [p], mainLabel: 'Puxador' }] : [];
  }
  if (instId === 'coro') {
    const c = allStrokes[0];
    return c ? [{ id: 'C', strong: c, strokes: [c], mainLabel: isFr ? 'Chœur' : 'Coro' }] : [];
  }
  if (instId === 'toada') {
    const p = allStrokes.find((s) => s.symbol === 'P') || allStrokes[0];
    const c = allStrokes.find((s) => s.symbol === 'C') || allStrokes[1];
    const pairs: StrokePair[] = [];
    if (p) pairs.push({ id: 'P', strong: p, strokes: [p], mainLabel: 'Puxador' });
    if (c) pairs.push({ id: 'C', strong: c, strokes: [c], mainLabel: isFr ? 'Chœur' : 'Coro' });
    return pairs;
  }
  return [];
}
