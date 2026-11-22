/**
 * Clonage profond et inspection de vacuité des motifs Maître -> Esclave (< 100 lignes).
 */
import { instrumentsConfig } from '../data';
import { Pattern, PatternVariation, StepSculptValue, TrackGroup } from '../types';
import { normalizePatternStepsForTarget } from './patternPasteNormalizer';

export function isPatternStepsEmpty(steps?: readonly unknown[] | null): boolean {
  if (!Array.isArray(steps) || steps.length === 0) return true;
  return steps.every((s) =>
    Array.isArray(s)
      ? s.every((sub) => !sub || sub === 0 || sub === '0')
      : !s || s === 0 || s === '0'
  );
}

export function hasActivePatternVariations(ptn?: Partial<Pattern> | null): boolean {
  return Boolean(ptn?.variations?.some((v) => !isPatternStepsEmpty(v.steps)));
}

export function isPatternCompletelySilent(ptn?: Partial<Pattern> | null): boolean {
  return isPatternStepsEmpty(ptn?.activeSteps) && !hasActivePatternVariations(ptn);
}

function cloneSculptArray(
  arr: readonly StepSculptValue[] | undefined,
  stepsCount: number,
  fallback?: number
): StepSculptValue[] | undefined {
  if (!Array.isArray(arr)) {
    return fallback !== undefined ? Array(stepsCount).fill(fallback) : undefined;
  }
  return arr.map((v) =>
    Array.isArray(v) ? [Number(v[0] ?? fallback ?? 0), Number(v[1] ?? fallback ?? 0)] : Number(v ?? fallback ?? 0)
  );
}

function cloneVariationDeep(v: PatternVariation): PatternVariation {
  const len = v.steps?.length || 16;
  return {
    ...v,
    steps: (v.steps || []).map((s) => (Array.isArray(s) ? [String(s[0] ?? '0'), String(s[1] ?? '0')] : s)),
    ...(v.volumes ? { volumes: cloneSculptArray(v.volumes, len) } : {}),
    ...(v.decays ? { decays: cloneSculptArray(v.decays, len) } : {}),
    ...(v.microtimings ? { microtimings: cloneSculptArray(v.microtimings, len) } : {}),
    ...(v.beatResolutions ? { beatResolutions: [...v.beatResolutions] } : {}),
  };
}

export function cloneMasterPatternForSlave(
  mPtn: Pattern,
  slave: TrackGroup,
  copyAssigns: boolean[]
): Pattern {
  const steps = mPtn.steps || mPtn.activeSteps?.length || 16;
  const rawTimeSig = (mPtn as Pattern & { timeSig?: string }).timeSig;
  const cloned: Pattern = {
    ...mPtn,
    id: mPtn.id,
    name: mPtn.name,
    steps,
    activeSteps: (mPtn.activeSteps || Array(steps).fill(0)).map((s) =>
      Array.isArray(s) ? [String(s[0] ?? '0'), String(s[1] ?? '0')] : s
    ),
    lyrics: mPtn.lyrics ? [...mPtn.lyrics] : Array(steps).fill(''),
    notes: mPtn.notes ? [...mPtn.notes] : Array(steps).fill(''),
    volumes: cloneSculptArray(mPtn.volumes, steps, 70)!,
    decays: cloneSculptArray(mPtn.decays, steps, 100)!,
    microtimings: cloneSculptArray(mPtn.microtimings, steps, 0)!,
    ...(mPtn.beatResolutions ? { beatResolutions: [...mPtn.beatResolutions] } : {}),
    ...(mPtn.timeSignature ? { timeSignature: mPtn.timeSignature } : {}),
    ...(rawTimeSig ? ({ timeSig: rawTimeSig } as Partial<Pattern>) : {}),
    ...(mPtn.preRollActiveSteps
      ? {
          preRollActiveSteps: mPtn.preRollActiveSteps.map((s) =>
            Array.isArray(s) ? [String(s[0] ?? '0'), String(s[1] ?? '0')] : s
          ),
        }
      : {}),
    ...(mPtn.preRollLyrics ? { preRollLyrics: [...mPtn.preRollLyrics] } : {}),
    ...(mPtn.preRollNotes ? { preRollNotes: [...mPtn.preRollNotes] } : {}),
    ...(mPtn.preRollVolumes ? { preRollVolumes: cloneSculptArray(mPtn.preRollVolumes, mPtn.preRollVolumes.length) } : {}),
    ...(mPtn.preRollDecays ? { preRollDecays: cloneSculptArray(mPtn.preRollDecays, mPtn.preRollDecays.length) } : {}),
    ...(mPtn.preRollMicrotimings
      ? { preRollMicrotimings: cloneSculptArray(mPtn.preRollMicrotimings, mPtn.preRollMicrotimings.length) }
      : {}),
    variations: Array.isArray(mPtn.variations) ? mPtn.variations.map(cloneVariationDeep) : [],
    ...(mPtn.measureAllowVariations ? { measureAllowVariations: [...mPtn.measureAllowVariations] } : {}),
    measureAssignments: [...copyAssigns],
  };

  const slaveInstId = instrumentsConfig[slave.instrumentIdx]?.id;
  return normalizePatternStepsForTarget(cloned, slaveInstId);
}
