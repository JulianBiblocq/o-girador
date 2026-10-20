import { getMaxTicks } from '../../data';
import { pushVisualTick } from '../../audio/visualTickBuffer';
import { playCountInBeep } from '../../audio/nativeSynths';

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

    if (!isRunwayMeasure) {
      for (let b = 0; b < beatsCount; b++) {
        const beatTime = measureStart + b * beatDurationSec;
        pushVisualTick({
          drawTime: beatTime,
          step: 0,
          measure: targetM,
          maxTicks: getMaxTicks(targetSig as any),
          ratio: 0,
          visualStep16: b * 4,
          visualStep12: b * 3,
          time: beatTime,
          iteration: 1,
          measureStartTime: measureStart,
          measureDuration: measureCycleDurationSec,
          targetStartTime: beatTime,
          isPreRoll: true,
          preRollBeat: b,
          preRollMeasureIndex: mIdx,
          preRollTotalMeasures: measuresCount,
        });
      }
    } else {
      const runwayStepDurationSec = measureCycleDurationSec / 16;
      for (let s = 0; s < 16; s++) {
        const stepTime = measureStart + s * runwayStepDurationSec;
        const beatIdx = Math.floor(s / 4);
        const subRatio = (s % 4) / 4;
        pushVisualTick({
          drawTime: stepTime,
          step: 0,
          measure: targetM,
          maxTicks: getMaxTicks(targetSig as any),
          ratio: subRatio,
          visualStep16: s,
          visualStep12: Math.floor((s / 16) * 12),
          time: stepTime,
          iteration: 1,
          measureStartTime: measureStart,
          measureDuration: measureCycleDurationSec,
          targetStartTime: stepTime,
          isPreRoll: true,
          preRollBeat: beatIdx,
          preRollMeasureIndex: mIdx,
          preRollTotalMeasures: measuresCount,
        });
      }
    }
  }
}
