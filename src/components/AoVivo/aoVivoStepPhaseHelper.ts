import { angleToNormalizedRodaRatio, computeRodaStepAngles } from '../../utils/rodaTimeSigGeometry';

export interface AoVivoStepPhaseAnchor {
  subPhase: 0 | 1 | 'both';
  stepAnchorDrawSec?: number;
  stepAnchorAudioSec?: number;
}

export function resolveAoVivoStepPhaseAndAnchor(
  detail: any,
  bar: { currentSig: string; beatRes: readonly number[]; stepsPerMeasure: number },
  stepInMeasure: number,
  rawVal: any,
  ratio: number,
  isStepPreview: boolean
): AoVivoStepPhaseAnchor {
  const stepAngles = computeRodaStepAngles(bar.currentSig, bar.beatRes);
  const stepStartP = stepAngles[stepInMeasure] !== undefined
    ? angleToNormalizedRodaRatio(stepAngles[stepInMeasure])
    : stepInMeasure / Math.max(1, bar.stepsPerMeasure);
  const stepEndP = stepInMeasure + 1 < stepAngles.length
    ? angleToNormalizedRodaRatio(stepAngles[stepInMeasure + 1])
    : 1;

  const subPhase: 0 | 1 | 'both' = isStepPreview
    ? 'both'
    : (Array.isArray(rawVal) && ratio >= (stepStartP + stepEndP) * 0.5 - 1e-4 ? 1 : 0);

  const mDur = typeof detail.measureDuration === 'number' && detail.measureDuration > 0 ? detail.measureDuration : 0;
  const stepAnchorDrawSec = mDur > 0 && typeof detail.measureStartTime === 'number' && detail.measureStartTime > 0
    ? detail.measureStartTime + stepStartP * mDur
    : undefined;
  const stepAnchorAudioSec = stepAnchorDrawSec !== undefined && typeof detail.audioTime === 'number' && typeof detail.drawTime === 'number'
    ? detail.audioTime + (stepAnchorDrawSec - detail.drawTime)
    : undefined;

  return { subPhase, stepAnchorDrawSec, stepAnchorAudioSec };
}
