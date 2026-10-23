
import * as Tone from 'tone';
import { masterVolumeNode } from './audioEngineNodes';
import { isMasterVolumeBypassedHelper } from '../../utils/automationBypassHelper';

function makeEaseCurve(start: number, end: number, steps = 8): number[] {
  const curve: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    curve.push(start + (end - start) * (t * t * (3 - 2 * t)));
  }
  return curve;
}

export function scheduleMasterVolumeRamp(
  state: any,
  currentMeasureIdx: number,
  prevMeasureIdx: number,
  measureDurationSec: number,
  time: number
): void {
  const globalBypass = state.globalAutomationBypass;
  const isMasterBypassed = isMasterVolumeBypassedHelper(state.isMasterVolumeBypassed, globalBypass);
  if (isMasterBypassed || !state.measureVols?.length || !masterVolumeNode?.gain) return;

  try {
    const masterVolVal = state.masterVolume ?? 0;
    const baseMasterGain = masterVolVal <= -60 || !Number.isFinite(masterVolVal) ? 0 : Tone.dbToGain(masterVolVal);
    const rawTarget = state.measureVols[currentMeasureIdx] !== undefined ? state.measureVols[currentMeasureIdx] : 100;
    const rawPrev = state.measureVols[prevMeasureIdx] !== undefined ? state.measureVols[prevMeasureIdx] : 100;
    const trans = state.measureVolTransitions?.[currentMeasureIdx] || 'immediate';

    const startG = Math.max(0, baseMasterGain * (rawPrev / 100));
    const endG = Math.max(0, baseMasterGain * (rawTarget / 100));

    masterVolumeNode.gain.cancelScheduledValues(time);
    if (startG !== endG && trans !== 'immediate') {
      masterVolumeNode.gain.setValueAtTime(startG, time);
      if (trans === 'bezier') {
        try {
          masterVolumeNode.gain.setValueCurveAtTime(makeEaseCurve(startG, endG), time, measureDurationSec);
        } catch (_) {
          masterVolumeNode.gain.linearRampToValueAtTime(endG, time + measureDurationSec);
        }
      } else {
        masterVolumeNode.gain.linearRampToValueAtTime(endG, time + measureDurationSec);
      }
    } else {
      masterVolumeNode.gain.setValueAtTime(endG, time);
    }
  } catch (_) {}
}
