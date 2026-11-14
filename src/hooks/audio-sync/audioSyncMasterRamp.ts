
import { masterVolumeNode } from './audioEngineNodes';
import { isMasterVolumeBypassedHelper } from '../../utils/automationBypassHelper';
import { masterDbToLinearGain, resolveUnderlyingLinearAudioParam } from '../../utils/audio/channelFaderLinearRamp';

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
    const baseMasterGain = masterDbToLinearGain(masterVolVal);
    const rawTarget = state.measureVols[currentMeasureIdx] !== undefined ? state.measureVols[currentMeasureIdx] : 100;
    const rawPrev = state.measureVols[prevMeasureIdx] !== undefined ? state.measureVols[prevMeasureIdx] : 100;
    const trans = state.measureVolTransitions?.[currentMeasureIdx] || 'immediate';

    const startG = Math.max(0, baseMasterGain * (rawPrev / 100));
    const endG = Math.max(0, baseMasterGain * (rawTarget / 100));
    const gainParam = resolveUnderlyingLinearAudioParam(masterVolumeNode.gain) || masterVolumeNode.gain;

    gainParam.cancelScheduledValues(time);
    if (startG !== endG && trans !== 'immediate') {
      gainParam.setValueAtTime(startG, time);
      if (trans === 'bezier') {
        try {
          gainParam.setValueCurveAtTime(makeEaseCurve(startG, endG), time, measureDurationSec);
        } catch (_) {
          gainParam.linearRampToValueAtTime(endG, time + measureDurationSec);
        }
      } else {
        gainParam.linearRampToValueAtTime(endG, time + measureDurationSec);
      }
    } else {
      gainParam.setValueAtTime(endG, time);
    }
  } catch (_) {}
}
