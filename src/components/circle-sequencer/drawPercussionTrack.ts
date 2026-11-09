import { InstrumentConfig, TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { areStepValuesEqual, resolveSlaveStepOpacity, SlaveFocusContext } from '../../utils/slaveStepOpacityResolver';
import { resolveStepPastilleData } from './resolveStepPastilleData';
import { drawSplitStepPastille } from './drawSplitStepPastille';
import { drawRasSubStep } from './drawRasSubStep';
import { resolveTrackStepsForMeasure, resolveStepSweepBlend } from './rodaSweepMath';

export const drawPercussionTrack = (
  ctx: CanvasRenderingContext2D,
  track: TrackGroup,
  currentInst: InstrumentConfig,
  activePattern: Pattern,
  activePlayingSteps: any,
  stepAngles: number[],
  effectiveStepCount: number,
  currentStep: number,
  tRad: number,
  centerX: number,
  centerY: number,
  dynamicScale: number,
  isEco: boolean,
  measureIdx: number,
  rawTracks: TrackGroup[],
  activeVariationsRef: React.MutableRefObject<{ [trackId: number]: any }> | undefined,
  localLeftHanded: boolean,
  themeWood: string,
  themeBorder: string,
  themeText: string,
  isPlaying: boolean = false,
  playheadRatio: number = 0,
  soloPatternPlayId: number | null = null,
  totalTracks: number = 7
): void => {
  const st = useSequencerStore.getState();
  const focusCtx: SlaveFocusContext = {
    isFocusActive: st.isFocusActive, focusTrackId: st.focusTrackId, referenceTrackId: st.referenceTrackId,
    activeAoVivoTrackId: st.activeAoVivoTrackId, editingTrackId: st.editingTrackId, mobileViewMode: st.mobileViewMode,
  };

  const snapshots = getLiveVariationRodaSnapshots();
  const totalM = st.totalMeasures || 1;
  const isAtLoopEnd = st.isLoopRegionActive && st.loopEndMeasure !== null && measureIdx === st.loopEndMeasure && !st.isLoopExitRequested;
  const fallbackNextM = isAtLoopEnd ? (st.loopStartMeasure ?? 0) : (measureIdx + 1) % totalM;
  const nextMeasureIdx = st.queuedMeasure !== null && st.queuedMeasure !== undefined ? st.queuedMeasure : (snapshots.nextMeasureIdx ?? fallbackNextM);

  const nextResolved = resolveTrackStepsForMeasure(track, rawTracks, nextMeasureIdx, soloPatternPlayId, snapshots.nextStepsByTrackId);
  const prevResolved = snapshots.hasPrevMeasure && snapshots.prevMeasureIdx !== null
    ? resolveTrackStepsForMeasure(track, rawTracks, snapshots.prevMeasureIdx, soloPatternPlayId, snapshots.prevStepsByTrackId)
    : { activeSteps: [], baseSteps: [], pattern: null };

  const anglePerStep = stepAngles[1] ? stepAngles[1] - stepAngles[0] : (Math.PI * 2) / effectiveStepCount;

  const drawSingleStateAtStep = (rawState: any, baseState: any, mIdx: number, stepIdx: number, stepAngle: number, x: number, y: number, blendWeight: number) => {
    const isRas = Array.isArray(rawState) && rawState.length === 2;
    const masterState = isRas ? rawState[0] : rawState;
    const pastille = resolveStepPastilleData(
      masterState, [], currentInst, track, rawTracks, instrumentsConfig,
      localLeftHanded, dynamicScale, totalTracks, tRad, effectiveStepCount
    );
    if (!pastille.hasEvent) return;

    const isVariationStep = !areStepValuesEqual(rawState, baseState);
    const slaveOpacity = isVariationStep
      ? 1.0
      : resolveSlaveStepOpacity({ track, allTracks: rawTracks, measureIdx: mIdx, stepIdx, ownStepVal: rawState, focusCtx, activeVariationsMap: activeVariationsRef?.current });
    const finalAlpha = slaveOpacity * blendWeight;
    if (finalAlpha <= 0.01) return;

    const finalRadiusSize = pastille.radiusSize;
    ctx.save();
    ctx.globalAlpha = finalAlpha;

    let hitIntensity = 0;
    if (isPlaying && !isEco) {
      const stickAngle = -Math.PI / 2 + playheadRatio * Math.PI * 2;
      const deltaRad = ((stickAngle - stepAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const decayArcRad = 0.52;
      if (deltaRad <= decayArcRad) {
        hitIntensity = Math.pow(1 - deltaRad / decayArcRad, 1.55);
      }
    }

    drawSplitStepPastille(
      ctx, x, y, finalRadiusSize, false, false,
      pastille.leftFillColor, pastille.rightFillColor, pastille.leftText, pastille.rightText,
      pastille.leftTxtColor, pastille.rightTxtColor, stepIdx === currentStep, isEco,
      themeWood, themeBorder, dynamicScale, hitIntensity, isVariationStep
    );

    if (isRas) {
      drawRasSubStep(ctx, rawState[1], stepAngle, anglePerStep, centerX, centerY, tRad, currentInst, track, rawTracks, instrumentsConfig, localLeftHanded, dynamicScale, themeBorder, isPlaying, playheadRatio, isEco);
    }
    ctx.restore();
  };

  for (let i = 0; i < effectiveStepCount; i++) {
    const stepAngle = stepAngles[i];
    const x = centerX + Math.cos(stepAngle) * tRad;
    const y = centerY + Math.sin(stepAngle) * tRad;

    const blend = resolveStepSweepBlend({
      stepIdx: i, stepAngle, isPlaying, playheadRatio, rodaSweepMode: st.rodaSweepMode,
      currentMeasureIdx: measureIdx, nextMeasureIdx, prevMeasureIdx: snapshots.prevMeasureIdx, hasPrevMeasure: snapshots.hasPrevMeasure,
      currentActiveSteps: activePlayingSteps || [], currentBaseSteps: activePattern?.activeSteps || [],
      nextActiveSteps: nextResolved.activeSteps, nextBaseSteps: nextResolved.baseSteps,
      prevActiveSteps: prevResolved.activeSteps, prevBaseSteps: prevResolved.baseSteps,
    });

    drawSingleStateAtStep(blend.primaryState, blend.primaryBaseState, blend.primaryMeasureIdx, i, stepAngle, x, y, blend.primaryAlpha);
    if (blend.isBlending && blend.secondaryMeasureIdx !== undefined && blend.secondaryAlpha) {
      drawSingleStateAtStep(blend.secondaryState, blend.secondaryBaseState, blend.secondaryMeasureIdx, i, stepAngle, x, y, blend.secondaryAlpha);
    }
  }

  if (!isEco) {
    const x0 = centerX + Math.cos(stepAngles[0]) * tRad;
    const y0 = centerY + Math.sin(stepAngles[0]) * tRad;
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = themeText;
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left';
    ctx.fillText(track.customName || currentInst.name, x0 + 20, y0 + 3);
    ctx.restore();
  }
};
