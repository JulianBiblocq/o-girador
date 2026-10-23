
import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import { drawTrackRing } from './drawTrackRings';
import { resolveBeatsFromTimeSig, computeStepAngles } from './circleGeometry';
import { drawToadaTrack } from './drawToadaTrack';
import { drawPercussionTrack } from './drawPercussionTrack';

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

  activeVisibleTracks.forEach((track, visibleIdx) => {
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || track.isHidden || inst.id === 'apito') return;

    const activePatternId = getLiveActivePatternId(track);
    if (activePatternId === null) return;

    let activePattern: Pattern | null | undefined = null;
    let ownerTrack = track;
    const isToada = isToadaBus(track);

    if (isToada) {
      const pux = localRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = localRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      if (pux) {
        activePattern = pux.patterns.find(p => p.id === activePatternId);
        if (activePattern) ownerTrack = pux;
      }
      if (!activePattern && coro) {
        activePattern = coro.patterns.find(p => p.id === activePatternId);
        if (activePattern) ownerTrack = coro;
      }
    } else {
      activePattern = track.patterns.find(p => p.id === activePatternId);
    }
    if (!activePattern) return;

    const currentInst = instrumentsConfig[ownerTrack.instrumentIdx] || inst;
    const activePlayingSteps = (activeVariationsRef?.current)
      ? (activeVariationsRef.current[track.id] || activePattern.activeSteps)
      : activePattern.activeSteps;

    const hasAnyNotes = activePlayingSteps.some((s: any) => s !== 0);
    const tRad = drawTrackRing(ctx, track, visibleIdx, activeVisibleTracks.length, centerX, centerY, localRawTracks, themeBorder, hasAnyNotes);

    const measureIdx = (live && live.step >= 0)
      ? live.measure
      : (pendingTargetMeasureRef.current !== null ? pendingTargetMeasureRef.current : stateVal.currentMeasure);

    const activeTimeSig = stateVal.measureTimeSigs ? (stateVal.measureTimeSigs[measureIdx] || stateVal.timeSig || '4/4') : (stateVal.timeSig || '4/4');
    const patSteps = activePattern.steps || 16;
    const resolvedBeats = resolveBeatsFromTimeSig(String(activeTimeSig), patSteps);
    const stepAngles = computeStepAngles(resolvedBeats, activePattern.beatResolutions);

    const effectiveStepCount = stepAngles.length;
    const currentStep = (localStep >= 0) ? Math.floor((localStep / localTicks) * effectiveStepCount) : -1;

    if (isToada || currentInst.type === 'voice') {
      drawToadaTrack(
        ctx, track, currentInst, isToada, localRawTracks, activePattern, activePlayingSteps,
        stepAngles, effectiveStepCount, currentStep, tRad, centerX, centerY, dynamicScale, isEco,
        measureIdx, stateVal.soloPatternPlayId, stateVal.totalMeasures, stateVal.isLoopRegionActive,
        stateVal.loopStartMeasure, stateVal.loopEndMeasure, activeVariationsRef, themeWood, themeBorder, themeText
      );
    } else {
      drawPercussionTrack(
        ctx, track, currentInst, activePattern, activePlayingSteps, stepAngles, effectiveStepCount,
        currentStep, tRad, centerX, centerY, dynamicScale, isEco, measureIdx, localRawTracks,
        activeVariationsRef, stateVal.isLeftHanded || false, themeWood, themeBorder, themeText
      );
    }
  });
}
