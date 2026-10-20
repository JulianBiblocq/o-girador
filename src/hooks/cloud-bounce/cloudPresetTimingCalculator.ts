import { Preset } from '../../types';
import { getExpandedMeasures, getBeatsPerMeasure } from '../../utils/measureHelpers';

export interface PresetTimingCalculation {
  safeTenantId: string;
  numLoops: number;
  loopStart: number | null;
  loopEnd: number | null;
  isLoopRegionActive: boolean;
  expandedMeasures: Array<{ baseMeasure: number; iteration: number }>;
  dureeTotaleSec: number;
  totalDurationSec: number;
  measureStartTimes: number[];
  measureBpmsAbsolus: number[];
  measureBpmTransitionsAbsolus: string[];
  measureTimeSigsAbsolus: string[];
  sinaisDoMestreAbsolus: any[];
  expandedMeasuresData: any[];
}

export function calculatePresetTiming(
  presetData: Preset,
  storeState: any,
  baseBpm: number,
  currentUser: any,
  options?: any
): PresetTimingCalculation {
  const userGroupId = (currentUser as any)?.groupId;
  const rawTenantId = options?.tenantId || (presetData.metadata as any)?.tenantId || userGroupId || 'global';
  let safeTenantId = (rawTenantId || 'global').trim().toLowerCase();
  if (!safeTenantId || safeTenantId === 'undefined' || safeTenantId === 'null') safeTenantId = 'global';

  const rawLoopMode = options?.loopMode ?? storeState.loopMode ?? presetData.loopMode;
  let numLoops = 1;
  if (typeof rawLoopMode === 'number' && rawLoopMode > 0) numLoops = rawLoopMode;
  else if (typeof rawLoopMode === 'string' && !isNaN(parseInt(rawLoopMode, 10)) && parseInt(rawLoopMode, 10) > 0) numLoops = parseInt(rawLoopMode, 10);
  else if (rawLoopMode === 'infinite') numLoops = 2;

  const loopStart = options?.loopStartMeasure ?? storeState.loopStartMeasure ?? presetData.loopStartMeasure ?? null;
  const loopEnd = options?.loopEndMeasure ?? storeState.loopEndMeasure ?? presetData.loopEndMeasure ?? null;
  const isLoopRegionActive = Boolean(
    (options?.isLoopRegionActive ?? storeState.isLoopRegionActive ?? presetData.isLoopRegionActive) &&
    loopStart !== null && loopEnd !== null && loopStart <= loopEnd
  );

  const totalMeasures = Math.max(1, presetData.totalMeasures || storeState.totalMeasures || 16);
  let expandedMeasures = getExpandedMeasures(totalMeasures, presetData.songSections || [], {
    isLoopRegionActive, loopStartMeasure: loopStart, loopEndMeasure: loopEnd, loopMode: numLoops
  });

  if (!expandedMeasures || !Array.isArray(expandedMeasures) || expandedMeasures.length === 0) {
    expandedMeasures = Array.from({ length: totalMeasures }, (_, i) => ({ baseMeasure: i, iteration: 1 }));
  }

  let dureeTotaleSec = 0;
  const measureStartTimes: number[] = [];
  const measureBpmsAbsolus: number[] = [];
  const measureBpmTransitionsAbsolus: string[] = [];
  const measureTimeSigsAbsolus: string[] = [];

  for (let i = 0; i < expandedMeasures.length; i++) {
    measureStartTimes.push(dureeTotaleSec);
    const m = expandedMeasures[i].baseMeasure;
    const rawBpm = (presetData.measureBpms && typeof presetData.measureBpms[m] === 'number') ? presetData.measureBpms[m] : (presetData.bpm || baseBpm || 120);
    const currentMeasureBpm = (Number.isFinite(rawBpm) && rawBpm > 20) ? rawBpm : 120;
    measureBpmsAbsolus.push(currentMeasureBpm);

    const nextM = (i + 1 < expandedMeasures.length) ? expandedMeasures[i + 1].baseMeasure : m;
    const rawNextBpm = (presetData.measureBpms && typeof presetData.measureBpms[nextM] === 'number') ? presetData.measureBpms[nextM] : currentMeasureBpm;
    const nextMeasureBpm = (Number.isFinite(rawNextBpm) && rawNextBpm > 20) ? rawNextBpm : currentMeasureBpm;

    const transition = (presetData.measureBpmTransitions && presetData.measureBpmTransitions[m]) || 'immediate';
    measureBpmTransitionsAbsolus.push(transition);

    const timeSigStr = (presetData.measureTimeSigs && presetData.measureTimeSigs[m]) || presetData.timeSig || '4/4';
    measureTimeSigsAbsolus.push(timeSigStr);

    const beats = getBeatsPerMeasure(timeSigStr);
    if (transition === 'immediate' || currentMeasureBpm === nextMeasureBpm) {
      dureeTotaleSec += (60 / currentMeasureBpm) * beats;
    } else {
      dureeTotaleSec += (120 * beats) / (currentMeasureBpm + nextMeasureBpm);
    }
  }

  const totalDurationSec = dureeTotaleSec + 2.0;
  const mestreSignals = storeState.mestreSignals || [];
  const measureSignals = presetData.measureSignals || storeState.measureSignals || {};
  const sinaisDoMestreAbsolus: any[] = [];
  expandedMeasures.forEach((measureInfo, absoluteIndex) => {
    const signalId = (measureSignals as any)?.[measureInfo.baseMeasure];
    if (signalId) {
      const mestreSignal = mestreSignals.find((s: any) => s.id === signalId);
      if (mestreSignal) {
        sinaisDoMestreAbsolus.push({
          mesure: absoluteIndex,
          type: mestreSignal.name || 'Geste',
          description: mestreSignal.name || '',
          signalId: mestreSignal.id,
          imageUrl: mestreSignal.imageUrl || null
        });
      }
    }
  });

  const expandedMeasuresData = expandedMeasures.map((info, idx) => ({
    index: idx,
    baseMeasure: info.baseMeasure,
    iteration: info.iteration,
    bpm: measureBpmsAbsolus[idx],
    timeSig: measureTimeSigsAbsolus[idx],
    bpmTransition: measureBpmTransitionsAbsolus[idx]
  }));

  return {
    safeTenantId, numLoops, loopStart, loopEnd, isLoopRegionActive,
    expandedMeasures, dureeTotaleSec, totalDurationSec, measureStartTimes,
    measureBpmsAbsolus, measureBpmTransitionsAbsolus, measureTimeSigsAbsolus,
    sinaisDoMestreAbsolus, expandedMeasuresData
  };
}
