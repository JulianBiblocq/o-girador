import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { getMeasureDurationSec } from '../../utils/meterTiming';
import {
  computeMeasurePatternStepOffset,
  getRodaMeasureGeometry,
  getRodaStepDurationTicks,
  resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { getPhysicalStepFromRatio } from '../circle-sequencer/measurePatternHelpers';
import { resolveAoVivoPatternAndSteps } from './aoVivoReset';

const ZEROS_16: readonly number[] = Object.freeze(new Array(16).fill(0));

export function predictAoVivoNextMeasureIdx(
  measure: number,
  soloPlayId: number | null,
  state: Record<string, any>
): number | null {
  if (soloPlayId !== null && soloPlayId !== undefined) return measure;
  const totalM = Math.max(1, state.totalMeasures || 1), lastM = totalM - 1;
  if (state.queuedMeasure !== null && state.queuedMeasure !== undefined) {
    return Math.max(0, Math.min(lastM, state.queuedMeasure));
  }
  const loopMode = state.loopMode ?? 'infinite', loopIter = state.currentLoopIteration ?? 1;
  const isLooping = state.isLooping !== false, exitReq = Boolean(state.isLoopExitRequested);
  const regionActive = Boolean(
    state.isLoopRegionActive && state.loopStartMeasure !== null && state.loopEndMeasure !== null && !state.isLoopBypassed
  );
  if (state.isLoopBypassed) return measure >= lastM ? null : measure + 1;
  if (regionActive) {
    const lEnd = state.loopEndMeasure as number;
    if (measure === lEnd) {
      const fixedReached = typeof loopMode === 'number' && loopMode > 0 && loopIter >= loopMode;
      if (exitReq || fixedReached || !isLooping) return lEnd >= lastM ? null : lEnd + 1;
      return state.loopStartMeasure as number;
    }
    return measure + 1;
  }
  if (measure >= lastM) {
    const isLinear1x = loopMode === 1 || !isLooping;
    const fixedReached = typeof loopMode === 'number' && loopMode > 0 && loopIter >= loopMode;
    return exitReq || isLinear1x || fixedReached ? null : 0;
  }
  return measure + 1;
}

function sliceBarStepsAndDurations(
  concreteTrack: any, allTracks: any[], basePattern: any, effectivePattern: any,
  fullSteps: any[], sig: string, bpm: number, measureIdx: number, isSolo: boolean
) {
  const geom = getRodaMeasureGeometry(sig);
  const beatRes = resolveActiveBeatResolutions(sig, effectivePattern);
  const stepsPerMeasure = Math.max(1, beatRes.reduce((acc, v) => acc + Math.max(1, v), 0) || geom.defaultSteps);
  const pred = isSolo ? undefined : (m: number) => resolveActivePattern(concreteTrack, allTracks, m, false, null)?.id === basePattern.id;
  const stepOffset = computeMeasurePatternStepOffset(effectivePattern, stepsPerMeasure, measureIdx, pred);
  const tickDurMs = (getMeasureDurationSec(sig, bpm) * 1000) / Math.max(1, geom.maxTicks);
  const slice = new Array(stepsPerMeasure);
  const stepDursMs = new Array<number>(stepsPerMeasure);
  for (let i = 0; i < stepsPerMeasure; i++) {
    slice[i] = fullSteps[stepOffset + i] ?? 0;
    stepDursMs[i] = Math.max(40, tickDurMs * getRodaStepDurationTicks(sig, effectivePattern, i));
  }
  return { slice, stepDursMs, stepsPerMeasure, stepOffset, geom, beatRes, tickDurMs };
}

export function resolveAoVivoMeasureBarData(params: {
  activeTrack: any; allTracks: any[]; measure: number; soloPlayId: number | null;
  measureSeqId?: number; varMap?: Record<number, any>; state: Record<string, any>;
}) {
  const { activeTrack, allTracks, measure, soloPlayId, measureSeqId, varMap, state } = params;
  const isSolo = soloPlayId !== null && soloPlayId !== undefined;
  const concreteTrack = activeTrack?.isBusFolder || activeTrack?.isLinkFolder
    ? resolveMasterTrack(activeTrack.id, allTracks) ?? activeTrack
    : activeTrack;

  const currRes = resolveAoVivoPatternAndSteps(concreteTrack, allTracks, measure, soloPlayId, varMap, measureSeqId);
  if (!currRes.pattern || !currRes.effectivePattern) {
    return {
      concreteTrack, pattern: null, effectivePattern: null, effectiveMicrotimings: undefined as any[] | undefined,
      currSlice: [] as any[], lookaheadSteps: [] as any[], currStepDursMs: [] as number[], lookaheadDurationsMs: [] as number[],
      stepsPerMeasure: 16, stepOffset: 0, beatsCount: 4, maxTicks: 96, tickDurMs: 25, beatRes: [4, 4, 4, 4],
      currentSig: '4/4', nextMeasureIdx: null as number | null,
    };
  }

  const currentSig = state.measureTimeSigs?.[measure] || state.timeSig || '4/4';
  const currentBpm = state.measureBpms?.[measure] || state.bpm || 100;
  const currBar = sliceBarStepsAndDurations(concreteTrack, allTracks, currRes.pattern, currRes.effectivePattern, currRes.activePlayingSteps, currentSig, currentBpm, measure, isSolo);

  const nextMeasureIdx = predictAoVivoNextMeasureIdx(measure, soloPlayId, state);
  let nextSlice: readonly any[] = ZEROS_16;
  let nextDursMs: readonly number[] = currBar.stepDursMs;
  if (nextMeasureIdx !== null) {
    const nextSeqId = measureSeqId && measureSeqId > 0 ? measureSeqId + 1 : undefined;
    const fallbackNextMap = nextSeqId === undefined ? (getLiveVariationRodaSnapshots(nextMeasureIdx).nextStepsByTrackId ?? undefined) : undefined;
    const nextRes = resolveAoVivoPatternAndSteps(concreteTrack, allTracks, nextMeasureIdx, soloPlayId, fallbackNextMap, nextSeqId);
    if (nextRes.pattern && nextRes.effectivePattern) {
      const nextSig = state.measureTimeSigs?.[nextMeasureIdx] || state.timeSig || '4/4';
      const nextBpm = state.measureBpms?.[nextMeasureIdx] || state.bpm || 100;
      const nextBar = sliceBarStepsAndDurations(concreteTrack, allTracks, nextRes.pattern, nextRes.effectivePattern, nextRes.activePlayingSteps, nextSig, nextBpm, nextMeasureIdx, isSolo);
      nextSlice = nextBar.slice;
      nextDursMs = nextBar.stepDursMs;
    }
  }

  return {
    concreteTrack, pattern: currRes.pattern, effectivePattern: currRes.effectivePattern, effectiveMicrotimings: currRes.effectiveMicrotimings,
    currSlice: currBar.slice, lookaheadSteps: [...currBar.slice, ...nextSlice],
    currStepDursMs: currBar.stepDursMs, lookaheadDurationsMs: [...currBar.stepDursMs, ...nextDursMs],
    stepsPerMeasure: currBar.stepsPerMeasure, stepOffset: currBar.stepOffset, beatsCount: currBar.geom.beatsCount,
    maxTicks: currBar.geom.maxTicks, tickDurMs: currBar.tickDurMs, beatRes: currBar.beatRes, currentSig, nextMeasureIdx,
  };
}

export function resolveAoVivoMeasureAndLookahead(params: {
  activeTrack: any; allTracks: any[]; measure: number; ratio: number;
  soloPlayId: number | null; measureSeqId?: number; varMap?: Record<number, any>; state: Record<string, any>;
}) {
  const bar = resolveAoVivoMeasureBarData(params);
  if (!bar.pattern || !bar.effectivePattern) {
    return { ...bar, stepInMeasure: -1, targetStep: -1, stepDurationMs: 150 };
  }
  const stepInMeasure = Math.max(0, getPhysicalStepFromRatio(params.ratio, bar.effectivePattern, bar.stepsPerMeasure, bar.beatsCount, bar.beatRes));
  const targetStep = bar.stepOffset + stepInMeasure;
  const stepDurationMs = bar.currStepDursMs[stepInMeasure] ?? 150;
  return { ...bar, stepInMeasure, targetStep, stepDurationMs };
}
