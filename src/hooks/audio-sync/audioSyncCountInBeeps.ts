import { getMaxTicks } from '../../data';
import { pushVisualTick } from '../../audio/visualTickBuffer';
import { playCountInBeep } from '../../audio/nativeSynths';
import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';
import { getBeatsCount, isCompoundMeter } from '../../utils/meterTiming';

export interface CountInBeepsParams {
  t0: number;
  measuresCount: number;
  beatsCount: number;
  beatDurationSec: number;
  measureCycleDurationSec: number;
  targetM: number;
  targetSig: string;
}

export function scheduleCountInBeepsAndTicks(p: CountInBeepsParams): void {
  const { t0, measuresCount, beatsCount, beatDurationSec, measureCycleDurationSec, targetM, targetSig } = p;
  const totalBeats = measuresCount * beatsCount;

  for (let i = 0; i < totalBeats; i++) {
    const beepTime = t0 + i * beatDurationSec;
    const isDownbeat = (i % beatsCount) === 0;
    const isFinalBeat = (i === totalBeats - 1);
    const freq = isFinalBeat ? 1400 : isDownbeat ? 1200 : 800;
    playCountInBeep(beepTime, freq, isDownbeat || isFinalBeat);
  }

  for (let mIdx = 0; mIdx < measuresCount; mIdx++) {
    const measureStart = t0 + mIdx * measureCycleDurationSec;
    const isRunwayMeasure = (mIdx === measuresCount - 1);

    const btOffsetSec = getBluetoothVisualOffsetSec();
    if (!isRunwayMeasure) {
      for (let b = 0; b < beatsCount; b++) {
        const beatTime = measureStart + b * beatDurationSec;
        const visualBeatTime = beatTime + btOffsetSec;
        pushVisualTick({
          drawTime: visualBeatTime,
          step: 0,
          measure: targetM,
          maxTicks: getMaxTicks(targetSig as any),
          ratio: 0,
          visualStep16: b * 4,
          visualStep12: b * 3,
          time: visualBeatTime,
          iteration: 1,
          measureStartTime: measureStart + btOffsetSec,
          measureDuration: measureCycleDurationSec,
          targetStartTime: visualBeatTime,
          isPreRoll: true,
          preRollBeat: b,
          preRollMeasureIndex: mIdx,
          preRollTotalMeasures: measuresCount,
        });
      }
    } else {
      const beatsInTarget = getBeatsCount(targetSig);
      const stepsPerBeat = isCompoundMeter(targetSig) ? 3 : 4;
      const totalStepsInMeasure = beatsInTarget * stepsPerBeat;
      const runwayStepDurationSec = measureCycleDurationSec / totalStepsInMeasure;
      for (let s = 0; s < totalStepsInMeasure; s++) {
        const stepTime = measureStart + s * runwayStepDurationSec;
        const visualStepTime = stepTime + btOffsetSec;
        const beatIdx = Math.min(beatsInTarget - 1, Math.floor(s / stepsPerBeat));
        const subRatio = (s % stepsPerBeat) / stepsPerBeat;
        pushVisualTick({
          drawTime: visualStepTime,
          step: 0,
          measure: targetM,
          maxTicks: getMaxTicks(targetSig as any),
          ratio: subRatio,
          visualStep16: Math.floor((s / totalStepsInMeasure) * 16),
          visualStep12: Math.floor((s / totalStepsInMeasure) * 12),
          time: visualStepTime,
          iteration: 1,
          measureStartTime: measureStart + btOffsetSec,
          measureDuration: measureCycleDurationSec,
          targetStartTime: visualStepTime,
          isPreRoll: true,
          preRollBeat: beatIdx,
          preRollMeasureIndex: mIdx,
          preRollTotalMeasures: measuresCount,
        });
      }
    }
  }
}
