/**
 * O Girador - Projection Pure de la Séquence d'Horizon (`M, M+1, M+2`) (< 130 lignes)
 * - Reproduit sans effet de bord la machine à états de `measureAdvanceHelper.ts`.
 * - Assure la soudure sample-accurate `startFrame(h) === endFrame(h - 1)`.
 */

import { getMeasureStartTick } from '../../../hooks/audio-sync/audioParamsCache';
import { MeasureTimingTable, buildMeasureTimingTable } from './percussionHorizonTiming';

export const WORKLET_HORIZON_MEASURES = 4;

export interface ProjectedHorizonMeasure {
  seqId: number;
  measureIdx: number;
  measureStartTick: number;
  timing: MeasureTimingTable;
  speedTrainerBpm?: number;
}

export interface HorizonProjectionInput {
  baseSeqId: number;
  startMeasureIdx: number;
  startFrame: number;
  sampleRate: number;
  totalMeasures: number;
  measureTimeSigs: Record<number, string> | string[];
  measureBpms: number[] | Record<number, number> | undefined;
  measureBpmTransitions?: Record<number, string>;
  fallbackBpm: number;
  soloPatternPlayId: number | null;
  queuedMeasure: number | null;
  isLooping: boolean;
  loopMode: number | 'infinite';
  currentLoopIteration: number;
  isLoopRegionActive: boolean;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
  isLoopExitRequested: boolean;
  isLoopBypassed: boolean;
  isSpeedTrainerActive?: boolean;
  speedTrainerBpm?: number;
  speedTrainerTourCount?: number;
  speedTrainerConfig?: { startBpm: number; targetBpm: number; bpmStep: number; loopInterval: number } | null;
  horizonCount?: number;
}

function advanceSpeedTrainerBpm(
  stBpm: number | undefined,
  stTour: number,
  cfg?: HorizonProjectionInput['speedTrainerConfig']
): { bpm: number | undefined; tour: number } {
  if (stBpm === undefined || !cfg) return { bpm: stBpm, tour: stTour };
  const nextTour = stTour + 1;
  if (stBpm < cfg.targetBpm && nextTour % cfg.loopInterval === 0) {
    return { bpm: Math.min(stBpm + cfg.bpmStep, cfg.targetBpm), tour: nextTour };
  }
  return { bpm: stBpm, tour: nextTour };
}

export function projectHorizonMeasures(input: HorizonProjectionInput): ProjectedHorizonMeasure[] {
  const count = input.horizonCount ?? WORKLET_HORIZON_MEASURES;
  const totalM = Math.max(1, input.totalMeasures || 1), lastM = totalM - 1;
  const result: ProjectedHorizonMeasure[] = [];

  let currM = ((input.startMeasureIdx % totalM) + totalM) % totalM;
  let currFrame = input.startFrame, queued = input.queuedMeasure;
  let loopIter = input.currentLoopIteration || 1;
  let loopBypassed = input.isLoopBypassed, exitReq = input.isLoopExitRequested;
  let stBpm = input.isSpeedTrainerActive ? (input.speedTrainerBpm || input.speedTrainerConfig?.startBpm) : undefined;
  let stTour = input.speedTrainerTourCount || 0;

  for (let h = 0; h < count; h++) {
    const seqId = input.baseSeqId + h;
    const timing = buildMeasureTimingTable({
      measureIdx: currM, startFrame: currFrame, sampleRate: input.sampleRate, totalMeasures: totalM,
      measureTimeSigs: input.measureTimeSigs, measureBpms: input.measureBpms,
      measureBpmTransitions: input.measureBpmTransitions, fallbackBpm: input.fallbackBpm, speedTrainerBpm: stBpm,
    });

    result.push({
      seqId, measureIdx: currM,
      measureStartTick: getMeasureStartTick(currM, input.measureTimeSigs as Record<number, string>),
      timing, speedTrainerBpm: stBpm,
    });
    currFrame = timing.endFrame;

    if (input.soloPatternPlayId !== null && input.soloPatternPlayId !== undefined) continue;
    if (queued !== null && queued !== undefined) {
      currM = Math.max(0, Math.min(lastM, queued));
      queued = null;
      continue;
    }

    const regionActive = Boolean(input.isLoopRegionActive && input.loopStartMeasure !== null && input.loopEndMeasure !== null);
    if (loopBypassed) {
      if (currM >= lastM) break;
      currM++;
    } else if (regionActive) {
      const lStart = input.loopStartMeasure!, lEnd = input.loopEndMeasure!;
      if (currM === lEnd) {
        const fixedReached = typeof input.loopMode === 'number' && input.loopMode > 0 && loopIter >= input.loopMode;
        if (exitReq || fixedReached || !input.isLooping) {
          exitReq = false; loopBypassed = true;
          if (lEnd >= lastM) break;
          currM = lEnd + 1;
        } else {
          loopIter++; currM = lStart;
          const nextSt = advanceSpeedTrainerBpm(stBpm, stTour, input.speedTrainerConfig);
          stBpm = nextSt.bpm; stTour = nextSt.tour;
        }
      } else { currM++; }
    } else if (currM >= lastM) {
      const isLinear1x = input.loopMode === 1 || !input.isLooping;
      const fixedReached = typeof input.loopMode === 'number' && input.loopMode > 0 && loopIter >= input.loopMode;
      if (exitReq || isLinear1x || fixedReached) break;
      loopIter++; currM = 0;
      const nextSt = advanceSpeedTrainerBpm(stBpm, stTour, input.speedTrainerConfig);
      stBpm = nextSt.bpm; stTour = nextSt.tour;
    } else { currM++; }
  }
  return result;
}
