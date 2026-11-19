import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState, isToadaBus, useSequencerStore } from '../../stores/useSequencerStore';
import {
  computeMeasurePatternStepOffset,
  computeRodaStepAngles,
  getRodaMeasureGeometry,
  resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
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
  const localStep = live.step;
  const measureIdx =
    live && live.step >= 0
      ? live.measure
      : pendingTargetMeasureRef.current !== null
        ? pendingTargetMeasureRef.current
        : stateVal.currentMeasure;

  const activeTimeSig = stateVal.measureTimeSigs
    ? stateVal.measureTimeSigs[measureIdx] || stateVal.timeSig || '4/4'
    : stateVal.timeSig || '4/4';
  const measureGeom = getRodaMeasureGeometry(String(activeTimeSig));
  const localTicks = (localStep >= 0 && live.maxTicks > 0) ? live.maxTicks : measureGeom.maxTicks;
  const isPlaying = Boolean(localStep >= 0 && stateVal.isPlaying);
  const playheadRatio = live.ratio !== undefined && localStep >= 0 ? live.ratio : (localStep >= 0 && localTicks > 0 ? localStep / localTicks : 0);

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
    const rawPlayingSteps =
      activePattern && activeVariationsRef?.current
        ? activeVariationsRef.current[track.id] || activePattern.activeSteps
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

    const currentStep = localStep >= 0
      ? getPhysicalStepFromRatio(playheadRatio, activePattern, effectiveStepCount, measureGeom.beatsCount, beatRes)
      : -1;
    const isMutedByConsole = stateVal.soloPatternPlayId == null && getEffectiveMuteState(localRawTracks, track.id);

    ctx.save();
    if (isMutedByConsole) ctx.globalAlpha = 0.26;
    if (isVoiceOrToada) {
      drawToadaTrack(
        ctx, track, currentInst, isToada, localRawTracks, activePattern as any, activePlayingSteps,
        stepAngles, effectiveStepCount, currentStep, tRad, centerX, centerY, dynamicScale, isEco,
        measureIdx, stateVal.soloPatternPlayId, stateVal.totalMeasures, stateVal.isLoopRegionActive,
        stateVal.loopStartMeasure, stateVal.loopEndMeasure, activeVariationsRef, themeWood, themeBorder, themeText, beatRes
      );
    } else {
      drawPercussionTrack(
        ctx, track, currentInst, activePattern, activePlayingSteps, stepAngles, effectiveStepCount,
        currentStep, tRad, centerX, centerY, dynamicScale, isEco, measureIdx, localRawTracks,
        activeVariationsRef, stateVal.isLeftHanded || false, themeWood, themeBorder, themeText,
        isPlaying, playheadRatio, stateVal.soloPatternPlayId ?? null, totalRings, stepOffset
      );
    }
    ctx.restore();
  });
}
