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

export function predictAoVivoNextMeasureIdx(
  measure: number,
  soloPlayId: number | null,
  state: Record<string, any>
): number | null {
  if (soloPlayId !== null && soloPlayId !== undefined) return measure;
  const totalM = Math.max(1, state.totalMeasures || 1);
  const lastM = totalM - 1;
  if (state.queuedMeasure !== null && state.queuedMeasure !== undefined) {
    return Math.max(0, Math.min(lastM, state.queuedMeasure));
  }

  const loopMode = state.loopMode ?? 'infinite';
  const loopIter = state.currentLoopIteration ?? 1;
  const isLooping = state.isLooping !== false;
  const exitReq = Boolean(state.isLoopExitRequested);
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

function sliceBarStepsForMeasure(
  concreteTrack: any,
  allTracks: any[],
  basePattern: any,
  effectivePattern: any,
  fullSteps: any[],
  sig: string,
  measureIdx: number,
  isSolo: boolean
): { slice: any[]; stepsPerMeasure: number; stepOffset: number; geom: ReturnType<typeof getRodaMeasureGeometry>; beatRes: number[] } {
  const geom = getRodaMeasureGeometry(sig);
  const beatRes = resolveActiveBeatResolutions(sig, effectivePattern);
  const stepsPerMeasure = Math.max(1, beatRes.reduce((acc, v) => acc + Math.max(1, v), 0) || geom.defaultSteps);
  const pred = isSolo ? undefined : (m: number) => resolveActivePattern(concreteTrack, allTracks, m, false, null)?.id === basePattern.id;
  const stepOffset = computeMeasurePatternStepOffset(effectivePattern, stepsPerMeasure, measureIdx, pred);
  const slice = Array.from({ length: stepsPerMeasure }, (_, i) => fullSteps[stepOffset + i] ?? 0);
  return { slice, stepsPerMeasure, stepOffset, geom, beatRes };
}

export function resolveAoVivoMeasureAndLookahead(params: {
  activeTrack: any;
  allTracks: any[];
  measure: number;
  ratio: number;
  soloPlayId: number | null;
  measureSeqId?: number;
  varMap?: Record<number, any>;
  state: Record<string, any>;
}) {
  const { activeTrack, allTracks, measure, ratio, soloPlayId, measureSeqId, varMap, state } = params;
  const isSolo = soloPlayId !== null && soloPlayId !== undefined;
  const concreteTrack =
    activeTrack?.isBusFolder || activeTrack?.isLinkFolder
      ? resolveMasterTrack(activeTrack.id, allTracks) ?? activeTrack
      : activeTrack;

  const currRes = resolveAoVivoPatternAndSteps(concreteTrack, allTracks, measure, soloPlayId, varMap, measureSeqId);
  if (!currRes.pattern || !currRes.effectivePattern) {
    return {
      pattern: null, effectivePattern: null, currSlice: [] as any[], lookaheadSteps: [] as any[],
      stepInMeasure: -1, targetStep: -1, stepsPerMeasure: 16, stepDurationMs: 150, nextMeasureIdx: null as number | null,
    };
  }

  const currentSig = state.measureTimeSigs?.[measure] || state.timeSig || '4/4';
  const currBar = sliceBarStepsForMeasure(concreteTrack, allTracks, currRes.pattern, currRes.effectivePattern, currRes.activePlayingSteps, currentSig, measure, isSolo);
  const stepInMeasure = Math.max(0, getPhysicalStepFromRatio(ratio, currRes.effectivePattern, currBar.stepsPerMeasure, currBar.geom.beatsCount, currBar.beatRes));
  const targetStep = currBar.stepOffset + stepInMeasure;

  const currentBpm = state.measureBpms?.[measure] || state.bpm || 100;
  const tickDurSec = getMeasureDurationSec(currentSig, currentBpm) / Math.max(1, currBar.geom.maxTicks);
  const stepTicks = getRodaStepDurationTicks(currentSig, currRes.effectivePattern, stepInMeasure);
  const stepDurationMs = Math.max(40, tickDurSec * stepTicks * 1000);

  const nextMeasureIdx = predictAoVivoNextMeasureIdx(measure, soloPlayId, state);
  let nextSlice: any[] = Array(16).fill(0);
  if (nextMeasureIdx !== null) {
    const nextSeqId = measureSeqId && measureSeqId > 0 ? measureSeqId + 1 : undefined;
    const fallbackNextMap = nextSeqId === undefined ? (getLiveVariationRodaSnapshots(nextMeasureIdx).nextStepsByTrackId ?? undefined) : undefined;
    const nextRes = resolveAoVivoPatternAndSteps(concreteTrack, allTracks, nextMeasureIdx, soloPlayId, fallbackNextMap, nextSeqId);
    if (nextRes.pattern && nextRes.effectivePattern) {
      const nextSig = state.measureTimeSigs?.[nextMeasureIdx] || state.timeSig || '4/4';
      nextSlice = sliceBarStepsForMeasure(concreteTrack, allTracks, nextRes.pattern, nextRes.effectivePattern, nextRes.activePlayingSteps, nextSig, nextMeasureIdx, isSolo).slice;
    }
  }

  return {
    pattern: currRes.pattern, effectivePattern: currRes.effectivePattern,
    currSlice: currBar.slice, lookaheadSteps: [...currBar.slice, ...nextSlice],
    stepInMeasure, targetStep, stepsPerMeasure: currBar.stepsPerMeasure, stepDurationMs, nextMeasureIdx,
  };
}
