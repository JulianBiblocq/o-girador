/**
 * 
 * O Girador - Apito and Vocal Stroke Definitions & Pairs
 */

import { StrokeDef, StrokePair } from './strokeTypes';

export function getApitoStrokeDefs(isFr: boolean): StrokeDef[] {
  return [
    {
      symbol: 'W',
      label: isFr ? 'Sifflet Long' : 'Apito Longo',
      shortcut: 'W',
      colorKey: 'W'
    },
    {
      symbol: 'w',
      label: isFr ? 'Sifflet Court' : 'Apito Curto',
      shortcut: 'w',
      colorKey: 'w'
    },
  ];
}

export function getApitoStrokePairs(allStrokes: StrokeDef[], isFr: boolean): StrokePair[] {
  const wStrong = allStrokes.find(s => s.symbol === 'W');
  const wWeak = allStrokes.find(s => s.symbol === 'w');
  const pairs: StrokePair[] = [];
  if (wStrong) {
    const strokes = [wStrong, wWeak].filter(Boolean) as StrokeDef[];
    pairs.push({
      id: 'W',
      strong: wStrong,
      weak: wWeak,
      strokes,
      mainLabel: isFr ? 'Sifflet' : 'Apito'
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
    const p = allStrokes.find(s => s.symbol === 'P') || allStrokes[0];
    const c = allStrokes.find(s => s.symbol === 'C') || allStrokes[1];
    const pairs: StrokePair[] = [];
    if (p) pairs.push({ id: 'P', strong: p, strokes: [p], mainLabel: 'Puxador' });
    if (c) pairs.push({ id: 'C', strong: c, strokes: [c], mainLabel: isFr ? 'Chœur' : 'Coro' });
    return pairs;
  }
  return [];
}
