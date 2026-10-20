export function normalizeStrokeKey(inst: any, state: any): string | null {
  if (!state || state === 0 || state === '0') return null;
  let targetKey: string | null = typeof state === 'string' ? state : String(state);
  if (!targetKey) return null;

  if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(inst.id)) {
    if (targetKey === 't' || targetKey === 'T') targetKey = 'B';
    else if (targetKey === 'C') targetKey = 'c';
  } else if (inst.id === 'agbe' || inst.id === 'gongue') {
    if (targetKey === 't') targetKey = 'B';
  }

  return targetKey;
}

export function computeStepVolume(rawStepVol: any, strokeIndex: number, nextRand: () => number): number {
  let baseVol = Array.isArray(rawStepVol) ? (rawStepVol[strokeIndex] ?? 80) : (rawStepVol ?? 80);
  if (baseVol === null || isNaN(baseVol)) baseVol = 80;
  const volVariation = (nextRand() * 2 - 1) * (baseVol * 0.15);
  let finalVol = Math.max(0, Math.min(100, baseVol + volVariation));
  if (isNaN(finalVol)) finalVol = 80;
  return finalVol / 100;
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
