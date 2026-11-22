import { Pattern, PatternVariation, StepSculptValue } from '../../types';
import { sanitizeVocalTransposeSteps } from './presetSerializationHelpers';

function detectUnitScaleArray(arr: readonly unknown[] | undefined, allowIntegerOneAsMax = false): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  let hasFinite = false, hasPositive = false, hasFraction = false;
  for (let i = 0; i < arr.length; i++) {
    const sub = Array.isArray(arr[i]) ? (arr[i] as unknown[]) : [arr[i]];
    for (let j = 0; j < sub.length; j++) {
      const n = Number(sub[j]);
      if (!Number.isFinite(n)) continue;
      hasFinite = true;
      if (n < 0 || n > 1) return false;
      if (n > 0) hasPositive = true;
      if (n > 0 && n < 1) hasFraction = true;
    }
  }
  return hasFinite && (hasFraction || (allowIntegerOneAsMax && hasPositive));
}

function normalizeSingleNumber(raw: unknown, defaultVal: number, unitScale = false): number {
  const val = Number(raw);
  if (!Number.isFinite(val)) return defaultVal;
  if (unitScale || (val > 0 && val < 1)) return Math.round(val * 100);
  return val;
}

export const sanitizeSculptValue = (raw: any, defaultVal: number, unitScale = false): number | [number, number] => {
  if (Array.isArray(raw)) {
    return [normalizeSingleNumber(raw[0], defaultVal, unitScale), normalizeSingleNumber(raw[1], defaultVal, unitScale)];
  }
  return normalizeSingleNumber(raw, defaultVal, unitScale);
};

function sanitizeSculptArray(
  existing: StepSculptValue[] | undefined, targetLen: number, defaultVal: number, unitScaleCheck = false
): StepSculptValue[] {
  const src = Array.isArray(existing) ? existing : [];
  const unitScale = detectUnitScaleArray(src, unitScaleCheck);
  const out: StepSculptValue[] = Array(targetLen).fill(defaultVal);
  for (let i = 0; i < Math.min(src.length, targetLen); i++) {
    out[i] = sanitizeSculptValue(src[i], defaultVal, unitScale);
  }
  return out;
}

export function normalizeMeasureAssignments(raw: unknown, targetMeasures: number): boolean[] {
  const safeMeasures = Math.max(1, Math.floor(Number(targetMeasures) || 1));
  if (!raw) return Array(safeMeasures).fill(false);

  if (!Array.isArray(raw)) {
    const normalized = Array(safeMeasures).fill(false);
    if (typeof raw === 'object') {
      Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
        const mIdx = parseInt(k, 10);
        if (!isNaN(mIdx) && mIdx >= 0 && mIdx < safeMeasures) normalized[mIdx] = Boolean(v);
      });
    }
    return normalized;
  }

  if (raw.length > 0 && typeof raw[0] === 'number') {
    const numList = raw as number[];
    const normalized = Array(safeMeasures).fill(false);
    const isOneBased = numList.some((n) => n === safeMeasures);
    numList.forEach((n) => {
      const idx = isOneBased ? n - 1 : n;
      if (idx >= 0 && idx < safeMeasures) normalized[idx] = true;
    });
    return normalized;
  }

  const bools = raw.map(Boolean);
  if (bools.length < safeMeasures) {
    const padVal = bools[0] || false;
    while (bools.length < safeMeasures) bools.push(padVal);
    return bools;
  }
  return bools.length > safeMeasures ? bools.slice(0, safeMeasures) : bools;
}

export function normalizePatternData(p: Pattern, targetMeasures: number): void {
  if (!p.notes) p.notes = Array(p.steps).fill('');
  if (!p.lyrics) p.lyrics = Array(p.steps).fill('');
  if (!p.activeSteps) p.activeSteps = Array(p.steps).fill(0);

  if (p.preRollActiveSteps && p.preRollActiveSteps === p.activeSteps) p.preRollActiveSteps = [...p.preRollActiveSteps];
  if (p.preRollLyrics && p.preRollLyrics === p.lyrics) p.preRollLyrics = [...p.preRollLyrics];
  if (p.preRollNotes && p.preRollNotes === p.notes) p.preRollNotes = [...p.preRollNotes];
  if (p.preRollVolumes && p.preRollVolumes === p.volumes) p.preRollVolumes = [...p.preRollVolumes];
  if (p.preRollDecays && p.preRollDecays === p.decays) p.preRollDecays = [...p.preRollDecays];

  p.measureAssignments = normalizeMeasureAssignments(p.measureAssignments, targetMeasures);

  if (p.vocalTransposeSteps !== undefined && p.vocalTransposeSteps !== null) {
    p.vocalTransposeSteps = sanitizeVocalTransposeSteps(p.vocalTransposeSteps, 0);
  }

  if (
    p.vocalMode === 'audio' || p.vocalMode === 'recorded' ||
    (p.vocalClip && p.vocalMode !== 'synth') || Boolean(p.hasVocalAudio) || Boolean(p.vocalAudioData) || Boolean(p.vocalAudioUrl)
  ) {
    p.vocalMode = 'micro';
  }

  p.volumes = sanitizeSculptArray(p.volumes, p.steps, 80, false);
  p.decays = sanitizeSculptArray(p.decays, p.steps, 100, false);
  p.microtimings = sanitizeSculptArray(p.microtimings, p.steps, 0, false);

  if (Array.isArray(p.preRollActiveSteps) && p.preRollActiveSteps.length > 0) {
    const preLen = p.preRollActiveSteps.length;
    if (p.preRollVolumes) p.preRollVolumes = sanitizeSculptArray(p.preRollVolumes, preLen, 80, false);
    if (p.preRollDecays) p.preRollDecays = sanitizeSculptArray(p.preRollDecays, preLen, 100, false);
  }

  if (Array.isArray(p.variations)) {
    p.variations.forEach((v: PatternVariation) => {
      const rawVar = v as PatternVariation & { stepVolumes?: StepSculptValue[]; stepDecays?: StepSculptValue[] };
      const vLen = Array.isArray(v.steps) && v.steps.length > 0 ? v.steps.length : p.steps;
      const srcVols = v.volumes ?? rawVar.stepVolumes, srcDecays = v.decays ?? rawVar.stepDecays;
      if (srcVols) { v.volumes = sanitizeSculptArray(srcVols, vLen, 80, false); delete rawVar.stepVolumes; }
      if (srcDecays) { v.decays = sanitizeSculptArray(srcDecays, vLen, 100, false); delete rawVar.stepDecays; }
    });
  }
}
