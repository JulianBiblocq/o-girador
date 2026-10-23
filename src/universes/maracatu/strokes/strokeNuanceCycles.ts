/**
 * 
 * O Girador - Nuance Progression Cycles (Tap, Wheel, Alternating)
 */

import { getStrokePairs } from './strokeRegistry';

export function getNuanceCounterpart(
  symbol: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string {
  if (!symbol || symbol === '0') return '0';
  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.strokes.some(s => s.symbol === symbol)
  );
  if (!matchedPair || matchedPair.strokes.length <= 1) return symbol;

  const symbols = matchedPair.strokes.map(s => s.symbol);
  const currentIdx = symbols.indexOf(symbol);
  if (currentIdx === -1) return symbol;
  const nextIdx = (currentIdx + 1) % symbols.length;
  return symbols[nextIdx];
}

export function getNextNuanceState(
  currentVal: string | number | [string, string],
  activeTool: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string | number {
  if (Array.isArray(currentVal)) return currentVal[0];
  const norm = String(currentVal ?? '0').trim();

  // Si l'outil actif est la gomme ('0')
  if (activeTool === '0' || activeTool === '' || String(activeTool) === '0') {
    return '0';
  }

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.id === activeTool || p.strong.symbol === activeTool || p.strokes.some(s => s.symbol === activeTool)
  );

  if (!matchedPair || matchedPair.strokes.length === 0) {
    return activeTool;
  }

  const symbols = matchedPair.strokes.map(s => s.symbol);

  // Case vide -> premier coup (fort)
  if (norm === '0' || norm === '') {
    return symbols[0];
  }

  // Case contient une frappe de cette même famille
  const currentIdx = symbols.indexOf(norm);
  if (currentIdx !== -1) {
    if (currentIdx + 1 < symbols.length) {
      return symbols[currentIdx + 1];
    }
    // Fin de cycle -> efface
    return '0';
  }

  // Case contient une frappe d'une autre famille -> remplace par le premier coup
  return symbols[0];
}

export function getWheelNuanceState(
  currentVal: string | number | [string, string],
  direction: 'up' | 'down',
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string | number {
  if (Array.isArray(currentVal)) return currentVal[0];
  const norm = String(currentVal ?? '0').trim();
  if (norm === '0' || norm === '') return norm;

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.strokes.some(s => s.symbol === norm)
  );

  if (!matchedPair || matchedPair.strokes.length <= 1) {
    // Coup sans nuance alternative (ou autonome) : ne pas modifier
    return norm;
  }

  const symbols = matchedPair.strokes.map(s => s.symbol);
  const currentIdx = symbols.indexOf(norm);
  if (currentIdx === -1) return norm;

  if (direction === 'up') {
    const newIdx = Math.max(0, currentIdx - 1);
    return symbols[newIdx];
  } else {
    const newIdx = Math.min(symbols.length - 1, currentIdx + 1);
    return symbols[newIdx];
  }
}

export function getAlternatingStroke(
  stepIdx: number, // 0-indexed (0 = pas 1, 1 = pas 2...)
  activeTool: string,
  instId: string,
  instType = '',
  lang = 'fr',
  isLeftHanded = false
): string {
  if (activeTool === '0' || activeTool === '' || String(activeTool) === '0') {
    return '0';
  }

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    p => p.id === activeTool || p.strong.symbol === activeTool || p.strokes.some(s => s.symbol === activeTool)
  );

  if (!matchedPair) return activeTool;

  const isEvenStep = (stepIdx % 2 === 1); // pas 2, 4, 6, 8...

  if (isEvenStep && matchedPair.weak) {
    return matchedPair.weak.symbol;
  }

  return matchedPair.strong.symbol;
}
