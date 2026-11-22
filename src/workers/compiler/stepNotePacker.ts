import { computeBeatProtectedStepVolume } from '../../audio/groove/strokeHumanizationDsp';

export function normalizeStrokeKey(inst: any, state: any): string | null {
  if (!state || state === 0 || state === '0' || state === '-') return null;
  let targetKey: string | null = typeof state === 'string' ? state.trim() : String(state).trim();
  if (!targetKey || targetKey === '0' || targetKey === '-') return null;

  if (['marcante', 'meiao', 'repique'].includes(inst.id) && targetKey === 'a') {
    targetKey = 'A';
  }
  if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(inst.id)) {
    if (targetKey === 't' || targetKey === 'T') targetKey = 'B';
    else if (targetKey === 'C') targetKey = 'c';
  } else if (inst.id === 'agbe' || inst.id === 'gongue') {
    if (targetKey === 't') targetKey = 'B';
    else if (inst.id === 'gongue' && targetKey === 'x') targetKey = 'X';
  } else if (inst.id === 'apito') {
    if (targetKey === 'W') targetKey = 'L';
    else if (targetKey === 'w' || targetKey === 'c') targetKey = 'C';
  }

  return targetKey;
}

export function computeStepVolume(
  rawStepVol: any,
  strokeIndex: number,
  nextRand: () => number,
  stepInMeasure = -1,
  isBeatHead?: boolean
): number {
  return computeBeatProtectedStepVolume(rawStepVol, strokeIndex, nextRand, stepInMeasure, isBeatHead);
}

export function computeStepDecay(rawStepDecay: any, strokeIndex: number): number {
  let rawDecay = Array.isArray(rawStepDecay) ? (rawStepDecay[strokeIndex] ?? 100) : (rawStepDecay ?? 100);
  if (rawDecay === null || isNaN(rawDecay)) rawDecay = 100;
  let stepDecayMultiplier = rawDecay / 100;
  if (isNaN(stepDecayMultiplier) || stepDecayMultiplier < 0) stepDecayMultiplier = 1.0;
  return stepDecayMultiplier;
}

export function computeStepMicrotiming(rawStepMicro: any, strokeIndex: number): number {
  let rawMicro = Array.isArray(rawStepMicro) ? (rawStepMicro[strokeIndex] ?? 0) : (rawStepMicro ?? 0);
  if (rawMicro === null || isNaN(rawMicro)) rawMicro = 0;
  return rawMicro;
}

export function packNoteData(
  trackIdx: number,
  step: number,
  strokeCharCode: number,
  decayPct: number,
  isTuplet: boolean,
  isSecondStroke: boolean
): number {
  const isTupletBit = isTuplet ? 1 : 0;
  const isSecondStrokeBit = isSecondStroke ? 1 : 0;
  return (trackIdx << 22) | (step << 16) | (strokeCharCode << 9) | (decayPct << 2) | (isTupletBit << 1) | isSecondStrokeBit;
}
