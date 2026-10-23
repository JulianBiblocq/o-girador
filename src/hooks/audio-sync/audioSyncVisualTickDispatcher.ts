/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Tone from 'tone';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { pushVisualTick } from '../../audio/visualTickBuffer';

import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';

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
  isDocHidden: boolean;
}

export function dispatchVisualTick(params: VisualTickDispatchParams): void {
  const {
    time,
    stepIdx,
    currentTicks,
    currentMeasureIdx,
    totalMeasures,
    soloPatternPlayId,
    measureTimeSigs,
    measureBpms,
    anchoredMeasureStartSecRef,
    anchoredMeasureIdxRef,
    sectionIteration,
    isDocHidden,
  } = params;

  const safeTicks = isNaN(currentTicks) || currentTicks <= 0 ? 96 : currentTicks;
  const stepForUI = isNaN(stepIdx) ? 0 : (stepIdx % safeTicks);
  const measureForUI = soloPatternPlayId !== null ? 0 : (isNaN(currentMeasureIdx) ? 0 : currentMeasureIdx);
  const ratioVal = stepForUI / safeTicks;

  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const baseLatency = (typeof rawCtx?.outputLatency === 'number' && !isNaN(rawCtx.outputLatency)) ? rawCtx.outputLatency : 0.050;
  const visualDelay = baseLatency + getBluetoothVisualOffsetSec();
  const drawTime = time + visualDelay;

  const timeSigOfMeasure = measureTimeSigs[measureForUI % (totalMeasures || 1)] || '4/4';
  const beatsInMeasure = getBeatsPerMeasure(timeSigOfMeasure);
  const currentBeatIndex = Math.min(beatsInMeasure - 1, Math.max(0, Math.floor(ratioVal * beatsInMeasure)));
  const currentMeasureBpmRaw = measureBpms[measureForUI % (totalMeasures || 1)];
  const currentMeasureBpm = isNaN(currentMeasureBpmRaw) || currentMeasureBpmRaw <= 0 ? 100 : currentMeasureBpmRaw;
  const measureDurationSec = (beatsInMeasure * 60) / currentMeasureBpm;

  const isNewMeasureSync = stepForUI === 0 || measureForUI !== anchoredMeasureIdxRef.current || anchoredMeasureStartSecRef.current <= 0;
  if (isNewMeasureSync) {
    anchoredMeasureStartSecRef.current = drawTime - (ratioVal * measureDurationSec);
    anchoredMeasureIdxRef.current = measureForUI;
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
      iteration: sectionIteration,
      measureStartTime: measureStartTimeSec,
      measureDuration: measureDurationSec,
      isPreRoll: false,
      preRollMeasureIndex: 0,
      preRollTotalMeasures: 1,
      preRollBeat: currentBeatIndex,
    });
  }
}
