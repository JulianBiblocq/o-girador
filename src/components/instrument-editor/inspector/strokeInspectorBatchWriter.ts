import { Pattern, PatternVariation, StepSculptValue, TrackGroup } from '../../../types';
import { instrumentsConfig } from '../../../data';
import {
  NOMINAL_STEP_VOLUME,
  getDefaultStrokeDecay,
  getMinStrokeDecay,
  isLegacyUnitScaleArray,
  matchesInspectorStroke,
  normalizeSculptScalar,
} from './strokeInspectorScope';

function updateStepParamArray(
  steps: readonly unknown[], rawValues: readonly StepSculptValue[] | undefined, stroke: string,
  instId: string | undefined, targetVal: number, minVal: number, defaultVal: number, isPercDecay: boolean
): StepSculptValue[] {
  const unitScale = isLegacyUnitScaleArray(rawValues, isPercDecay);
  return steps.map((step, idx) => {
    const cur = rawValues?.[idx];
    if (Array.isArray(step)) {
      const m0 = matchesInspectorStroke(step[0], stroke, instId);
      const m1 = matchesInspectorStroke(step[1], stroke, instId);
      const v0 = normalizeSculptScalar(Array.isArray(cur) ? cur[0] : cur, defaultVal, minVal, unitScale);
      const v1 = normalizeSculptScalar(Array.isArray(cur) ? cur[1] : cur, defaultVal, minVal, unitScale);
      return [m0 ? targetVal : v0, m1 ? targetVal : v1];
    }
    const normSingle = normalizeSculptScalar(Array.isArray(cur) ? cur[0] : cur, defaultVal, minVal, unitScale);
    if (matchesInspectorStroke(step, stroke, instId)) {
      return Array.isArray(cur) ? [targetVal, targetVal] : targetVal;
    }
    return Array.isArray(cur)
      ? [normSingle, normalizeSculptScalar(cur[1], defaultVal, minVal, unitScale)]
      : normSingle;
  });
}

export function applyStrokeParamToTrack(
  track: TrackGroup, param: 'volume' | 'decay', stroke: string, isVoice: boolean, clampedTarget: number
): TrackGroup {
  const instId = instrumentsConfig[track.instrumentIdx]?.id;
  const minVal = param === 'volume' ? 0 : getMinStrokeDecay(isVoice);
  const defaultVal = param === 'volume' ? NOMINAL_STEP_VOLUME : getDefaultStrokeDecay(isVoice);
  const isPercDecay = param === 'decay' && !isVoice;

  return {
    ...track,
    patterns: (track.patterns || []).map((p: Pattern) => {
      const baseArr = param === 'volume' ? p.volumes : p.decays;
      const nextMain = updateStepParamArray(p.activeSteps || [], baseArr, stroke, instId, clampedTarget, minVal, defaultVal, isPercDecay);
      const hasPreRoll = Array.isArray(p.preRollActiveSteps) && p.preRollActiveSteps.length > 0;
      const nextPre = hasPreRoll
        ? updateStepParamArray(p.preRollActiveSteps!, param === 'volume' ? p.preRollVolumes : p.preRollDecays, stroke, instId, clampedTarget, minVal, defaultVal, isPercDecay)
        : undefined;
      const nextVars = p.variations?.map((v: PatternVariation) => {
        const rawVar = v as PatternVariation & { stepVolumes?: StepSculptValue[]; stepDecays?: StepSculptValue[] };
        const varSteps = Array.isArray(v.steps) && v.steps.length > 0 ? v.steps : [];
        if (varSteps.length === 0) return v;
        const seedArr = param === 'volume' ? (v.volumes ?? rawVar.stepVolumes ?? p.volumes) : (v.decays ?? rawVar.stepDecays ?? p.decays);
        const updatedVarArr = updateStepParamArray(varSteps, seedArr, stroke, instId, clampedTarget, minVal, defaultVal, isPercDecay);
        const cleaned = { ...rawVar, [param === 'volume' ? 'volumes' : 'decays']: updatedVarArr };
        if (param === 'volume') delete cleaned.stepVolumes;
        else delete cleaned.stepDecays;
        return cleaned;
      });
      return {
        ...p,
        ...(param === 'volume' ? { volumes: nextMain } : { decays: nextMain }),
        ...(hasPreRoll ? (param === 'volume' ? { preRollVolumes: nextPre } : { preRollDecays: nextPre }) : {}),
        ...(nextVars ? { variations: nextVars } : {}),
      };
    }),
  };
}
