import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState, isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import {
  computeMeasurePatternStepOffset, computeRodaStepAngles, getRodaMeasureGeometry, resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveEffectivePatternStepsForSoloOrLive } from '../../utils/soloVariationMatcher';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { drawTrackRing } from './drawTrackRings';
import { getPhysicalStepFromRatio } from './measurePatternHelpers';
import { isRodaDrawableTrack } from './sortTracksByRodaOrder';
import { drawToadaTrack } from './drawToadaTrack';
import { drawPercussionTrack } from './drawPercussionTrack';
import { computeContinuousSweepRatio } from './rodaSweepMath';
import { drawRodaSweepWave } from './drawRodaSweepWave';
import { syncLiveVariationRodaVisualFrame } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';

export function renderTrackStepLayer(
  ctx: CanvasRenderingContext2D, activeVisibleTracks: TrackGroup[], localRawTracks: TrackGroup[],
  themeBorder: string, themeWood: string, themeText: string,
  getLiveActivePatternId: (t: TrackGroup) => number | null, livePlaybackRef: React.MutableRefObject<any>,
  stateVal: any, pendingTargetMeasureRef: React.MutableRefObject<number | null>,
  activeVariationsRef: React.MutableRefObject<{ [trackId: number]: any }> | undefined,
  dynamicScale: number, isEco: boolean, centerX: number, centerY: number, interpolatedRatio?: number
): void {
  const live = livePlaybackRef.current, localStep = live ? live.step : -1;
  const isPlaying = Boolean(stateVal.isPlaying && (live as any)?.isPlaying !== false && !live?.isPreRoll && localStep >= 0);
  const isFrozen = !isPlaying && frozenPlaybackState.active, isPlayheadActive = isPlaying || isFrozen;

  const measureIdx = isFrozen
    ? frozenPlaybackState.measure
    : isPlaying ? live.measure : pendingTargetMeasureRef.current !== null ? pendingTargetMeasureRef.current : stateVal.currentMeasure;

  const activeTimeSig = stateVal.measureTimeSigs ? stateVal.measureTimeSigs[measureIdx] || stateVal.timeSig || '4/4' : stateVal.timeSig || '4/4';
  const measureGeom = getRodaMeasureGeometry(String(activeTimeSig));
  const localTicks = isPlaying && live.maxTicks > 0 ? live.maxTicks : measureGeom.maxTicks;
  const fallbackRatio = live?.ratio !== undefined ? live.ratio : (localTicks > 0 ? localStep / localTicks : 0);
  const playheadRatio = isFrozen
    ? frozenPlaybackState.progress
    : isPlaying
      ? (typeof interpolatedRatio === 'number' ? interpolatedRatio : fallbackRatio)
      : -1;

  const liveSeqId = isPlaying && typeof live?.measureSeqId === 'number' ? live.measureSeqId : 0;
  syncLiveVariationRodaVisualFrame(isPlayheadActive, measureIdx, Math.max(0, playheadRatio), activeVariationsRef, liveSeqId);

  const rodaTracks = activeVisibleTracks.filter(isRodaDrawableTrack), totalRings = rodaTracks.length;
  const rodaSweepMode = useSequencerStore.getState().rodaSweepMode || 'sweep6h';
  if (totalRings > 0 && rodaSweepMode === 'sweep6h' && isPlayheadActive) {
    const sweepRatio = computeContinuousSweepRatio(isPlayheadActive, playheadRatio, rodaSweepMode, measureIdx, undefined, stateVal.measureTimeSigs, stateVal.timeSig);
    drawRodaSweepWave(ctx, centerX, centerY, 130, 512, sweepRatio, isEco);
  }
  const soloId = stateVal.soloPatternPlayId ?? null;

  rodaTracks.forEach((track, ringIndex) => {
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst) return;
    const activePatternId = getLiveActivePatternId(track);
    let activePattern: Pattern | null | undefined = null, ownerTrack = track;
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
    const canHaveLiveVar = Boolean(isPlayheadActive && activePattern?.variations?.length && (soloId !== null || activePattern.measureAllowVariations?.[measureIdx] !== false));
    const { steps: rawPlayingSteps, beatResolutions: varBeatRes } = resolveEffectivePatternStepsForSoloOrLive({
      pattern: activePattern, trackId: track.id, tracks: localRawTracks, soloPatternPlayId: soloId,
      soloPatternVariationId: stateVal.soloPatternVariationId ?? null, liveStepsMap: activeVariationsRef?.current, canUseLiveVariation: canHaveLiveVar,
    });

    const beatRes = resolveActiveBeatResolutions(String(activeTimeSig), activePattern ? { ...activePattern, beatResolutions: varBeatRes } : null);
    const stepAngles = computeRodaStepAngles(String(activeTimeSig), beatRes), effectiveStepCount = stepAngles.length;
    const samePtnPred = soloId !== null ? undefined : (m: number) => resolveActivePattern(track, localRawTracks, m, false, null)?.id === activePattern?.id;
    const stepOffset = computeMeasurePatternStepOffset(activePattern, effectiveStepCount, measureIdx, samePtnPred);
    const activePlayingSteps = rawPlayingSteps && stepOffset > 0 ? rawPlayingSteps.slice(stepOffset, stepOffset + effectiveStepCount) : rawPlayingSteps;

    const hasAnyNotes = Boolean(activePlayingSteps && activePlayingSteps.slice(0, effectiveStepCount).some((s: any) => s !== 0));
    const tRad = drawTrackRing(ctx, track, ringIndex, totalRings, centerX, centerY, localRawTracks, themeBorder, hasAnyNotes);
    const isVoiceOrToada = isToada || currentInst.type === 'voice';
    if (!activePattern && !isVoiceOrToada && !isPlayheadActive) return;

    const currentStep = !isPlayheadActive || (isPlaying && localStep < 0)
      ? -1 : getPhysicalStepFromRatio(playheadRatio, activePattern, effectiveStepCount, measureGeom.beatsCount, beatRes);

    ctx.save();
    if (soloId == null && getEffectiveMuteState(localRawTracks, track.id)) ctx.globalAlpha = 0.26;
    if (isVoiceOrToada) {
      drawToadaTrack(ctx, track, currentInst, isToada, localRawTracks, activePattern as any, activePlayingSteps, stepAngles, effectiveStepCount, currentStep, tRad, centerX, centerY, dynamicScale, isEco, measureIdx, soloId, stateVal.totalMeasures, stateVal.isLoopRegionActive, stateVal.loopStartMeasure, stateVal.loopEndMeasure, isPlayheadActive ? activeVariationsRef : undefined, themeWood, themeBorder, themeText, beatRes);
    } else {
      drawPercussionTrack(ctx, track, currentInst, activePattern, activePlayingSteps, stepAngles, effectiveStepCount, currentStep, tRad, centerX, centerY, dynamicScale, isEco, measureIdx, localRawTracks, isPlayheadActive ? activeVariationsRef : undefined, stateVal.isLeftHanded || false, themeWood, themeBorder, themeText, isPlayheadActive, Math.max(0, playheadRatio), soloId, totalRings, stepOffset);
    }
    ctx.restore();
  });
}
