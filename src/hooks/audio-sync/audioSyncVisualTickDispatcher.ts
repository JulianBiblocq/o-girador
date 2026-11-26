import React from 'react';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { getLockedVisualDelaySec, pushVisualTick } from '../../audio/visualTickBuffer';
import { getMeasureDurationSec } from '../../utils/meterTiming';

export interface VisualTickDispatchParams {
  time: number;
  stepIdx: number;
  currentTicks: number;
  currentMeasureIdx: number;
  totalMeasures: number;
  soloPatternPlayId: number | null;
  measureTimeSigs: Record<number, string>;
  measureBpms: number[];
  anchoredMeasureStartSecRef: React.MutableRefObject<number>;
  anchoredMeasureIdxRef: React.MutableRefObject<number>;
  sectionIteration: number;
  loopIteration?: number;
  measureSeqId?: number;
  isDocHidden: boolean;
}

let lastAnchoredSeqId = -1;
let lastAnchoredMeasureDurSec = 0;

export function dispatchVisualTick(params: VisualTickDispatchParams): void {
  const {
    time,
    stepIdx,
    currentTicks,
    currentMeasureIdx,
    totalMeasures,
    measureTimeSigs,
    measureBpms,
    anchoredMeasureStartSecRef,
    anchoredMeasureIdxRef,
    sectionIteration,
    loopIteration = 1,
    measureSeqId,
    isDocHidden,
  } = params;

  const safeTicks = isNaN(currentTicks) || currentTicks <= 0 ? 96 : currentTicks;
  const stepForUI = isNaN(stepIdx) ? 0 : (stepIdx % safeTicks);
  const measureForUI = isNaN(currentMeasureIdx) || currentMeasureIdx < 0 ? 0 : currentMeasureIdx;
  const ratioVal = stepForUI / safeTicks;

  const visualDelay = getLockedVisualDelaySec();
  const drawTime = time + visualDelay;

  const timeSigOfMeasure = measureTimeSigs[measureForUI % (totalMeasures || 1)] || '4/4';
  const beatsInMeasure = getBeatsPerMeasure(timeSigOfMeasure);
  const currentBeatIndex = Math.min(beatsInMeasure - 1, Math.max(0, Math.floor(ratioVal * beatsInMeasure)));
  const currentMeasureBpmRaw = measureBpms[measureForUI % (totalMeasures || 1)];
  const currentMeasureBpm = isNaN(currentMeasureBpmRaw) || currentMeasureBpmRaw <= 0 ? 100 : currentMeasureBpmRaw;
  const measureDurationSec = getMeasureDurationSec(timeSigOfMeasure, currentMeasureBpm);

  const effSeqId = measureSeqId ?? 0;
  const didTempoChangeInBar = lastAnchoredMeasureDurSec > 0 && Math.abs(measureDurationSec - lastAnchoredMeasureDurSec) > 1e-6;
  const isNewMeasureSync =
    stepForUI === 0 ||
    measureForUI !== anchoredMeasureIdxRef.current ||
    (effSeqId > 0 && effSeqId !== lastAnchoredSeqId) ||
    anchoredMeasureStartSecRef.current <= 0 ||
    didTempoChangeInBar;

  if (isNewMeasureSync) {
    anchoredMeasureStartSecRef.current = drawTime - ratioVal * measureDurationSec;
    anchoredMeasureIdxRef.current = measureForUI;
    lastAnchoredSeqId = effSeqId;
    lastAnchoredMeasureDurSec = measureDurationSec;
  }
  const measureStartTimeSec = anchoredMeasureStartSecRef.current;

  if (!isDocHidden) {
    pushVisualTick({
      drawTime,
      step: stepForUI,
      measure: measureForUI,
      maxTicks: safeTicks,
      ratio: ratioVal,
      visualStep16: Math.floor(ratioVal * 16) % 16,
      visualStep12: Math.floor(ratioVal * 12) % 12,
      time: drawTime,
      audioTime: time,
      iteration: sectionIteration,
      loopIteration,
      measureStartTime: measureStartTimeSec,
      measureDuration: measureDurationSec,
      isPreRoll: false,
      preRollMeasureIndex: 0,
      preRollTotalMeasures: 1,
      preRollBeat: currentBeatIndex,
      measureSeqId: effSeqId,
    });
  }
}
