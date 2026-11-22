/**
 * O Girador - Nuance Progression Cycles (Tap, Wheel, Alternating) (< 125 lignes)
 */

import { getStrokePairs } from './strokeRegistry';

const WHEEL_NUANCE_GROUPS: Record<string, string[][]> = {
  alfaia: [['D', 'd'], ['E', 'e'], ['B', 'b', '/', '.']],
  caixa: [['D', 'd'], ['E', 'e'], ['F', 'f'], ['A', 'a'], ['R', 'r'], ['B', 'b', '/', '.']],
  timbal: [['G', 'g'], ['A', 'a'], ['S', 's'], ['T', 't'], ['D', 'd'], ['P', 'p'], ['F', 'f'], ['V', 'v'], ['B', 'b', '/', '.']],
  gongue: [['G', 'g'], ['A', 'a'], ['B', 'b', '/', '.']],
  agbe: [['E', 'e'], ['D', 'd'], ['B', 'b', '/', '.']],
  mineiro: [['P', 'p'], ['T', 't'], ['B', 'b', '/', '.']],
  apito: [['L', 'l', '/', '.']],
};

function resolveWheelFamily(instId: string, instType: string): string | null {
  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId) || instType === 'alfaia') return 'alfaia';
  if (instId === 'caixa' || instId === 'tarol' || instType === 'caixa') return 'caixa';
  if (instId === 'timbal') return 'timbal';
  if (instId === 'gongue' || instType === 'gongue') return 'gongue';
  if (instId === 'agbe') return 'agbe';
  if (instId === 'mineiro') return 'mineiro';
  if (instId === 'apito') return 'apito';
  return null;
}

export function getNuanceCounterpart(
  symbol: string, instId: string, instType = '', lang = 'fr', isLeftHanded = false
): string {
  if (!symbol || symbol === '0') return '0';
  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find((p) => p.strokes.some((s) => s.symbol === symbol));
  if (!matchedPair || matchedPair.strokes.length <= 1) return symbol;
  const symbols = matchedPair.strokes.map((s) => s.symbol);
  const currentIdx = symbols.indexOf(symbol);
  if (currentIdx === -1) return symbol;
  return symbols[(currentIdx + 1) % symbols.length];
}

export function getNextNuanceState(
  currentVal: string | number | [string, string],
  activeTool: string, instId: string, instType = '', lang = 'fr', isLeftHanded = false
): string | number {
  if (Array.isArray(currentVal)) return currentVal[0];
  const norm = String(currentVal ?? '0').trim();
  if (activeTool === '0' || activeTool === '' || String(activeTool) === '0') return '0';

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find(
    (p) => p.id === activeTool || p.strong.symbol === activeTool || p.strokes.some((s) => s.symbol === activeTool)
  );
  if (!matchedPair || matchedPair.strokes.length === 0) return activeTool;

  const symbols = matchedPair.strokes.map((s) => s.symbol);
  if (norm === '0' || norm === '') return symbols[0];

  const currentIdx = symbols.indexOf(norm);
  if (currentIdx !== -1) {
    return currentIdx + 1 < symbols.length ? symbols[currentIdx + 1] : '0';
  }
  return symbols[0];
}

export function getWheelNuanceState(
  currentVal: string | number | [string, string],
  direction: 'up' | 'down', instId: string, instType = '', lang = 'fr', isLeftHanded = false
): string | number {
  if (Array.isArray(currentVal)) return currentVal[0];
  const norm = String(currentVal ?? '0').trim();
  if (norm === '0' || norm === '') return norm;

  const fam = resolveWheelFamily(instId, instType);
  if (fam) {
    const group = WHEEL_NUANCE_GROUPS[fam].find((g) => g.includes(norm));
    if (!group || group.length <= 1) return norm;
    const idx = group.indexOf(norm);
    return direction === 'up' ? group[Math.max(0, idx - 1)] : group[Math.min(group.length - 1, idx + 1)];
  }

  const pairs = getStrokePairs(instId, instType, lang, isLeftHanded);
  const matchedPair = pairs.find((p) => p.strokes.some((s) => s.symbol === norm));
  if (!matchedPair || matchedPair.strokes.length <= 1) return norm;
  const symbols = matchedPair.strokes.map((s) => s.symbol);
  const currentIdx = symbols.indexOf(norm);
  if (currentIdx === -1) return norm;
  return direction === 'up' ? symbols[Math.max(0, currentIdx - 1)] : symbols[Math.min(symbols.length - 1, currentIdx + 1)];
}

const TIMBAL_HANDED_SYMBOLS = new Set(['g', 'a', 's', 't', 'd', 'p', 'f', 'v']);

export function getAlternatingPairForInstrument(
  activeTool: string, instId: string, instType = ''
): [string, string] | null {
  if (!activeTool || activeTool === '0' || activeTool === 'scissors') return null;
  if (instId === 'caixa' || instId === 'tarol' || instType === 'caixa') {
    return activeTool === 'A' || activeTool === 'a' ? ['A', 'a'] : ['d', 'e'];
  }
  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId) || instType === 'alfaia') {
    return activeTool === 'd' || activeTool === 'e' ? ['d', 'e'] : ['D', 'E'];
  }
  if (instId === 'agbe') return activeTool === 'e' ? ['e', 'd'] : ['E', 'd'];
  if (instId === 'mineiro') return ['p', 't'];
  if (instId === 'timbal') {
    const low = activeTool.toLowerCase();
    return TIMBAL_HANDED_SYMBOLS.has(low) ? [low.toUpperCase(), low] : ['D', 'd'];
  }
  if (instId === 'gongue' || instType === 'gongue') {
    return activeTool === 'g' || activeTool === 'a' ? ['g', 'a'] : ['G', 'A'];
  }
  return null;
}

export function getAlternatingStroke(
  stepIdx: number, activeTool: string, instId: string, instType = '', _lang = 'fr', _isLeftHanded = false
): string {
  if (activeTool === '0' || activeTool === '' || String(activeTool) === '0' || activeTool === 'scissors') return '0';
  const pair = getAlternatingPairForInstrument(activeTool, instId, instType);
  if (pair) return stepIdx % 2 === 0 ? pair[0] : pair[1];
  return activeTool;
}
