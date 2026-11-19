import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState, isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import {
  computeMeasurePatternStepOffset, computeRodaStepAngles, getRodaMeasureGeometry, resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { drawTrackRing } from './drawTrackRings';
import { getPhysicalStepFromRatio } from './measurePatternHelpers';
import { isRodaDrawableTrack } from './sortTracksByRodaOrder';
import { drawToadaTrack } from './drawToadaTrack';
import { drawPercussionTrack } from './drawPercussionTrack';
import { computeContinuousSweepRatio } from './rodaSweepMath';
import { drawRodaSweepWave } from './drawRodaSweepWave';
import { syncLiveVariationRodaVisualFrame } from '../../hooks/audio-sync/liveVariationLookaheadEngine';

export function renderTrackStepLayer(
  ctx: CanvasRenderingContext2D,
  activeVisibleTracks: TrackGroup[],
  localRawTracks: TrackGroup[],
  themeBorder: string,
  themeWood: string,
  themeText: string,
  getLiveActivePatternId: (t: TrackGroup) => number | null,
  livePlaybackRef: React.MutableRefObject<any>,
  stateVal: any,
  pendingTargetMeasureRef: React.MutableRefObject<number | null>,
  activeVariationsRef: React.MutableRefObject<{ [trackId: number]: any }> | undefined,
  dynamicScale: number,
  isEco: boolean,
  centerX: number,
  centerY: number
): void {
  const live = livePlaybackRef.current;
  const localStep = live ? live.step : -1;
  const isPlaying = Boolean(stateVal.isPlaying && (live as any)?.isPlaying !== false && !live?.isPreRoll && localStep >= 0);
  const measureIdx = isPlaying
    ? live.measure
    : pendingTargetMeasureRef.current !== null
      ? pendingTargetMeasureRef.current
      : stateVal.currentMeasure;

  const activeTimeSig = stateVal.measureTimeSigs
    ? stateVal.measureTimeSigs[measureIdx] || stateVal.timeSig || '4/4'
    : stateVal.timeSig || '4/4';
  const measureGeom = getRodaMeasureGeometry(String(activeTimeSig));
  const localTicks = isPlaying && live.maxTicks > 0 ? live.maxTicks : measureGeom.maxTicks;
  const playheadRatio = isPlaying ? (live.ratio !== undefined ? live.ratio : (localTicks > 0 ? localStep / localTicks : 0)) : -1;

  syncLiveVariationRodaVisualFrame(isPlaying, measureIdx, Math.max(0, playheadRatio), activeVariationsRef);

  const seqState = useSequencerStore.getState();
  const rodaSweepMode = seqState.rodaSweepMode || 'sweep6h';
  if (rodaSweepMode === 'sweep6h' && isPlaying) {
    const sweepRatio = computeContinuousSweepRatio(isPlaying, playheadRatio, rodaSweepMode, measureIdx, undefined, stateVal.measureTimeSigs, stateVal.timeSig);
    drawRodaSweepWave(ctx, centerX, centerY, 130, 512, sweepRatio, isEco);
  }

  const rodaTracks = activeVisibleTracks.filter(isRodaDrawableTrack);
  const totalRings = rodaTracks.length;
  const soloId = stateVal.soloPatternPlayId ?? null;

  rodaTracks.forEach((track, ringIndex) => {
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst) return;

    const activePatternId = getLiveActivePatternId(track);
    let activePattern: Pattern | null | undefined = null;
    let ownerTrack = track;
    const isToada = isToadaBus(track);

    if (isToada) {
      if (activePatternId !== null) {
        const pux = localRawTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
        const coro = localRawTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
        if (pux) { activePattern = pux.patterns.find((p) => p.id === activePatternId); if (activePattern) ownerTrack = pux; }
        if (!activePattern && coro) { activePattern = coro.patterns.find((p) => p.id === activePatternId); if (activePattern) ownerTrack = coro; }
      }
    } else {
      activePattern = resolveActivePattern(track, localRawTracks, measureIdx, soloId !== null, soloId) as Pattern | null;
      if (!activePattern && activePatternId !== null) activePattern = track.patterns.find((p) => p.id === activePatternId);
      if (activePattern && !track.patterns.some((p) => p.id === activePattern!.id)) {
        ownerTrack = localRawTracks.find((t) => t.patterns.some((p) => p.id === activePattern!.id)) || track;
      }
    }

    const currentInst = instrumentsConfig[ownerTrack.instrumentIdx] || inst;
    const canHaveLiveVar = Boolean(
      isPlaying && activePattern?.variations?.length && (soloId !== null || activePattern.measureAllowVariations?.[measureIdx] !== false)
    );
    const rawPlayingSteps = canHaveLiveVar && activeVariationsRef?.current
      ? activeVariationsRef.current[track.id] || activePattern!.activeSteps
      : activePattern?.activeSteps;

    const beatRes = resolveActiveBeatResolutions(String(activeTimeSig), activePattern);
    const stepAngles = computeRodaStepAngles(String(activeTimeSig), beatRes);
    const effectiveStepCount = stepAngles.length;
    const stepOffset = computeMeasurePatternStepOffset(activePattern, effectiveStepCount, measureIdx);
    const activePlayingSteps = rawPlayingSteps && stepOffset > 0
      ? rawPlayingSteps.slice(stepOffset, stepOffset + effectiveStepCount)
      : rawPlayingSteps;

    const hasAnyNotes = Boolean(activePlayingSteps && activePlayingSteps.slice(0, effectiveStepCount).some((s: any) => s !== 0));
    const tRad = drawTrackRing(ctx, track, ringIndex, totalRings, centerX, centerY, localRawTracks, themeBorder, hasAnyNotes);

    const isVoiceOrToada = isToada || currentInst.type === 'voice';
    if (!activePattern && !isVoiceOrToada && !isPlaying) return;

    const currentStep = !isPlaying || localStep < 0
      ? -1
      : getPhysicalStepFromRatio(playheadRatio, activePattern, effectiveStepCount, measureGeom.beatsCount, beatRes);
    const isMutedByConsole = soloId == null && getEffectiveMuteState(localRawTracks, track.id);

    ctx.save();
    if (isMutedByConsole) ctx.globalAlpha = 0.26;
    if (isVoiceOrToada) {
      drawToadaTrack(
        ctx, track, currentInst, isToada, localRawTracks, activePattern as any, activePlayingSteps,
        stepAngles, effectiveStepCount, currentStep, tRad, centerX, centerY, dynamicScale, isEco,
        measureIdx, soloId, stateVal.totalMeasures, stateVal.isLoopRegionActive,
        stateVal.loopStartMeasure, stateVal.loopEndMeasure, isPlaying ? activeVariationsRef : undefined, themeWood, themeBorder, themeText, beatRes
      );
    } else {
      drawPercussionTrack(
        ctx, track, currentInst, activePattern, activePlayingSteps, stepAngles, effectiveStepCount,
        currentStep, tRad, centerX, centerY, dynamicScale, isEco, measureIdx, localRawTracks,
        isPlaying ? activeVariationsRef : undefined, stateVal.isLeftHanded || false, themeWood, themeBorder, themeText,
        isPlaying, Math.max(0, playheadRatio), soloId, totalRings, stepOffset
      );
    }
    ctx.restore();
  });
}
