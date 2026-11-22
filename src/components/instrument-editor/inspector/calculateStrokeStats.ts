import { PatternVariation, StepSculptValue, Track } from '../../../types';
import { instrumentsConfig } from '../../../data';
import {
  NOMINAL_STEP_VOLUME,
  getDefaultStrokeDecay,
  getMinStrokeDecay,
  isLegacyUnitScaleArray,
  matchesInspectorStroke,
  normalizeSculptScalar,
} from './strokeInspectorScope';

export function calculateStrokeStats(
  trackOrTracks: Track | Track[] | undefined,
  stroke: string,
  isVoice: boolean,
  strokeDefaults: Record<string, { volume?: number; decay?: number }>,
  primaryTrackId?: number | string
): { avgVolume: number; avgDecay: number } {
  const defaultDecay = getDefaultStrokeDecay(isVoice);
  const minDecay = getMinStrokeDecay(isVoice);
  const tracksList = Array.isArray(trackOrTracks) ? trackOrTracks : (trackOrTracks ? [trackOrTracks] : []);
  if (tracksList.length === 0) return { avgVolume: NOMINAL_STEP_VOLUME, avgDecay: defaultDecay };

  let volSum = 0;
  let decaySum = 0;
  let hitCount = 0;

  const scanSteps = (
    steps: readonly unknown[] | undefined,
    vols: readonly StepSculptValue[] | undefined,
    decays: readonly StepSculptValue[] | undefined,
    instId: string | undefined
  ) => {
    if (!Array.isArray(steps) || steps.length === 0) return;
    const volUnit = isLegacyUnitScaleArray(vols, false);
    const decayUnit = isLegacyUnitScaleArray(decays, !isVoice);

    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      const v = vols?.[idx];
      const d = decays?.[idx];
      if (Array.isArray(step)) {
        if (matchesInspectorStroke(step[0], stroke, instId)) {
          volSum += normalizeSculptScalar(Array.isArray(v) ? v[0] : v, NOMINAL_STEP_VOLUME, 0, volUnit);
          decaySum += normalizeSculptScalar(Array.isArray(d) ? d[0] : d, defaultDecay, minDecay, decayUnit);
          hitCount++;
        }
        if (matchesInspectorStroke(step[1], stroke, instId)) {
          volSum += normalizeSculptScalar(Array.isArray(v) ? v[1] : v, NOMINAL_STEP_VOLUME, 0, volUnit);
          decaySum += normalizeSculptScalar(Array.isArray(d) ? d[1] : d, defaultDecay, minDecay, decayUnit);
          hitCount++;
        }
      } else if (matchesInspectorStroke(step, stroke, instId)) {
        volSum += normalizeSculptScalar(Array.isArray(v) ? v[0] : v, NOMINAL_STEP_VOLUME, 0, volUnit);
        decaySum += normalizeSculptScalar(Array.isArray(d) ? d[0] : d, defaultDecay, minDecay, decayUnit);
        hitCount++;
      }
    }
  };

  for (let tIdx = 0; tIdx < tracksList.length; tIdx++) {
    const t = tracksList[tIdx];
    const instId = instrumentsConfig[t.instrumentIdx]?.id;
    (t.patterns || []).forEach((p) => {
      scanSteps(p.activeSteps, p.volumes, p.decays, instId);
      if (Array.isArray(p.preRollActiveSteps) && p.preRollActiveSteps.length > 0) {
        scanSteps(p.preRollActiveSteps, p.preRollVolumes, p.preRollDecays, instId);
      }
      p.variations?.forEach((v: PatternVariation) => {
        if (!Array.isArray(v.steps) || v.steps.length === 0) return;
        const rawVar = v as PatternVariation & { stepVolumes?: StepSculptValue[]; stepDecays?: StepSculptValue[] };
        scanSteps(v.steps, v.volumes ?? rawVar.stepVolumes ?? p.volumes, v.decays ?? rawVar.stepDecays ?? p.decays, instId);
      });
    });
  }

  if (hitCount > 0) {
    return {
      avgVolume: Math.max(0, Math.min(100, Math.round(volSum / hitCount))),
      avgDecay: Math.max(minDecay, Math.min(100, Math.round(decaySum / hitCount))),
    };
  }

  const refId = primaryTrackId ?? tracksList[0].id;
  const defaults = strokeDefaults[`${refId}:${stroke}`] ?? strokeDefaults[`${tracksList[0].id}:${stroke}`];
  return {
    avgVolume: defaults?.volume !== undefined ? Math.max(0, Math.min(100, Math.round(defaults.volume))) : NOMINAL_STEP_VOLUME,
    avgDecay: defaults?.decay !== undefined ? Math.max(minDecay, Math.min(100, Math.round(defaults.decay))) : defaultDecay,
  };
}
