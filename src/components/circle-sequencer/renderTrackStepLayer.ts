import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import { drawTrackRing } from './drawTrackRings';
import { resolveBeatsFromTimeSig, computeStepAngles } from './circleGeometry';
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
  const localStep = live.step;
  const localTicks = live.maxTicks || 96;
  const isPlaying = Boolean(localStep >= 0 && stateVal.isPlaying);
  const playheadRatio = localStep >= 0 && localTicks > 0 ? localStep / localTicks : (live.ratio ?? 0);
  const measureIdx =
    live && live.step >= 0
      ? live.measure
      : pendingTargetMeasureRef.current !== null
        ? pendingTargetMeasureRef.current
        : stateVal.currentMeasure;

  syncLiveVariationRodaVisualFrame(isPlaying, measureIdx, playheadRatio, activeVariationsRef);

  const rodaSweepMode = useSequencerStore.getState().rodaSweepMode || 'sweep6h';
  if (rodaSweepMode === 'sweep6h' && isPlaying) {
    const sweepRatio = computeContinuousSweepRatio(isPlaying, playheadRatio, rodaSweepMode);
    drawRodaSweepWave(ctx, centerX, centerY, 130, 512, sweepRatio, isEco);
  }

  const rodaTracks = activeVisibleTracks.filter(isRodaDrawableTrack);
  const totalRings = rodaTracks.length;

  rodaTracks.forEach((track, ringIndex) => {
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst) return;

    const activePatternId = getLiveActivePatternId(track);
    let activePattern: Pattern | null | undefined = null;
    let ownerTrack = track;
    const isToada = isToadaBus(track);

    if (activePatternId !== null) {
      if (isToada) {
        const pux = localRawTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
        const coro = localRawTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
        if (pux) {
          activePattern = pux.patterns.find((p) => p.id === activePatternId);
          if (activePattern) ownerTrack = pux;
        }
        if (!activePattern && coro) {
          activePattern = coro.patterns.find((p) => p.id === activePatternId);
          if (activePattern) ownerTrack = coro;
        }
      } else {
        activePattern = track.patterns.find((p) => p.id === activePatternId);
        if (!activePattern && track.linkedToTrackId) {
          const parent = localRawTracks.find((t) => String(t.id) === String(track.linkedToTrackId));
          if (parent) {
            activePattern = parent.patterns.find((p) => p.id === activePatternId);
            if (activePattern) ownerTrack = parent;
          }
        }
      }
    }

    const currentInst = instrumentsConfig[ownerTrack.instrumentIdx] || inst;
    const activePlayingSteps =
      activePattern && activeVariationsRef?.current
        ? activeVariationsRef.current[track.id] || activePattern.activeSteps
        : activePattern?.activeSteps;

    const hasAnyNotes = Boolean(activePlayingSteps && activePlayingSteps.some((s: any) => s !== 0));
    const tRad = drawTrackRing(ctx, track, ringIndex, totalRings, centerX, centerY, localRawTracks, themeBorder, hasAnyNotes);

    const isVoiceOrToada = isToada || currentInst.type === 'voice';
    if (!activePattern && !isVoiceOrToada && !isPlaying) return;

    const activeTimeSig = stateVal.measureTimeSigs
      ? stateVal.measureTimeSigs[measureIdx] || stateVal.timeSig || '4/4'
      : stateVal.timeSig || '4/4';
    const patSteps = activePattern?.steps || 16;
    const resolvedBeats = resolveBeatsFromTimeSig(String(activeTimeSig), patSteps);
    const stepAngles = computeStepAngles(resolvedBeats, activePattern?.beatResolutions);

    const effectiveStepCount = stepAngles.length;
    const currentStep = localStep >= 0 ? Math.floor((localStep / localTicks) * effectiveStepCount) : -1;

    if (isVoiceOrToada) {
      drawToadaTrack(
        ctx, track, currentInst, isToada, localRawTracks, activePattern as any, activePlayingSteps,
        stepAngles, effectiveStepCount, currentStep, tRad, centerX, centerY, dynamicScale, isEco,
        measureIdx, stateVal.soloPatternPlayId, stateVal.totalMeasures, stateVal.isLoopRegionActive,
        stateVal.loopStartMeasure, stateVal.loopEndMeasure, activeVariationsRef, themeWood, themeBorder, themeText
      );
    } else {
      drawPercussionTrack(
        ctx, track, currentInst, activePattern, activePlayingSteps, stepAngles, effectiveStepCount,
        currentStep, tRad, centerX, centerY, dynamicScale, isEco, measureIdx, localRawTracks,
        activeVariationsRef, stateVal.isLeftHanded || false, themeWood, themeBorder, themeText,
        isPlaying, playheadRatio, stateVal.soloPatternPlayId ?? null, totalRings
      );
    }
  });
}
