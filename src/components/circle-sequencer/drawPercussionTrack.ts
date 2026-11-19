import { InstrumentConfig, TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { areStepValuesEqual, resolveSlaveStepOpacity, SlaveFocusContext } from '../../utils/slaveStepOpacityResolver';
import { getStepAngularSpan, normalizeTimeSig } from '../../utils/rodaTimeSigGeometry';
import { resolveStepPastilleData } from './resolveStepPastilleData';
import { drawSplitStepPastille } from './drawSplitStepPastille';
import { drawRasSubStep } from './drawRasSubStep';
import { resolveTrackStepsForMeasure, buildCandidateAnglesForSweep, resolveStepSweepBlend } from './rodaSweepMath';

export const drawPercussionTrack = (
  ctx: CanvasRenderingContext2D,
  track: TrackGroup,
  currentInst: InstrumentConfig,
  activePattern: Pattern | null | undefined,
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
  totalTracks: number = 7,
  stepOffset: number = 0
): void => {
  const st = useSequencerStore.getState();
  const focusCtx: SlaveFocusContext = {
    isFocusActive: st.isFocusActive, focusTrackId: st.focusTrackId, referenceTrackId: st.referenceTrackId,
    activeAoVivoTrackId: st.activeAoVivoTrackId, editingTrackId: st.editingTrackId, mobileViewMode: st.mobileViewMode,
  };

  const totalM = st.totalMeasures || 1;
  const isAtLoopEnd = st.isLoopRegionActive && st.loopEndMeasure !== null && measureIdx === st.loopEndMeasure && !st.isLoopExitRequested;
  const fallbackNextM = isAtLoopEnd ? (st.loopStartMeasure ?? 0) : (measureIdx + 1) % totalM;
  const nextMeasureIdx = st.queuedMeasure !== null && st.queuedMeasure !== undefined ? st.queuedMeasure : fallbackNextM;
  const snapshots = getLiveVariationRodaSnapshots(nextMeasureIdx);
  const currTimeSig = normalizeTimeSig(st.measureTimeSigs?.[measureIdx] || st.timeSig || '4/4');

  const nextResolved = resolveTrackStepsForMeasure(track, rawTracks, nextMeasureIdx, soloPatternPlayId, isPlaying ? snapshots.nextStepsByTrackId : null, st.measureTimeSigs, st.timeSig);
  const prevResolved = isPlaying && snapshots.hasPrevMeasure && snapshots.prevMeasureIdx !== null
    ? resolveTrackStepsForMeasure(track, rawTracks, snapshots.prevMeasureIdx, soloPatternPlayId, snapshots.prevStepsByTrackId, st.measureTimeSigs, st.timeSig)
    : { activeSteps: [], baseSteps: [], pattern: null, stepAngles: [], stepCount: effectiveStepCount, timeSig: currTimeSig };

  const rawBaseCurr = activePattern?.activeSteps || [];
  const currentBaseSteps = stepOffset > 0 ? rawBaseCurr.slice(stepOffset, stepOffset + effectiveStepCount) : rawBaseCurr;

  const drawSingleStateAtStep = (
    rawState: any, baseState: any, mIdx: number, stepIdx: number, stepCountForM: number,
    anglesForM: readonly number[], stepAngle: number, x: number, y: number, blendWeight: number
  ) => {
    const isRas = Array.isArray(rawState) && rawState.length === 2;
    const masterState = isRas ? rawState[0] : rawState;
    const pastille = resolveStepPastilleData(
      masterState, [], currentInst, track, rawTracks, instrumentsConfig,
      localLeftHanded, dynamicScale, totalTracks, tRad, stepCountForM
    );
    if (!pastille.hasEvent) return;

    const patForM = mIdx === measureIdx ? activePattern : (mIdx === nextMeasureIdx ? nextResolved.pattern : prevResolved.pattern);
    const canVaryM = Boolean(isPlaying && patForM?.variations?.length && (soloPatternPlayId !== null || patForM.measureAllowVariations?.[mIdx] !== false));
    const isVariationStep = canVaryM && !areStepValuesEqual(rawState, baseState);
    const varMapForM = !isPlaying ? undefined : (mIdx === measureIdx ? (snapshots.currentStepsByTrackId || activeVariationsRef?.current) : (mIdx === nextMeasureIdx ? snapshots.nextStepsByTrackId : snapshots.prevStepsByTrackId));
    const slaveOpacity = isVariationStep
      ? 1.0
      : resolveSlaveStepOpacity({ track, allTracks: rawTracks, measureIdx: mIdx, stepIdx, ownStepVal: rawState, focusCtx, activeVariationsMap: varMapForM });
    const finalAlpha = slaveOpacity * blendWeight;
    if (finalAlpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = finalAlpha;
    ctx.strokeStyle = themeBorder || '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    let hitIntensity = 0;
    if (isPlaying && !isEco) {
      const stickAngle = -Math.PI / 2 + playheadRatio * Math.PI * 2;
      const deltaRad = ((stickAngle - stepAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const decayArcRad = 0.52;
      if (deltaRad <= decayArcRad) hitIntensity = Math.pow(1 - deltaRad / decayArcRad, 1.55);
    }

    const isCurrentImpact = Boolean(isPlaying && currentStep >= 0 && mIdx === measureIdx && stepIdx === currentStep);
    drawSplitStepPastille(
      ctx, x, y, pastille.radiusSize, false, false,
      pastille.leftFillColor, pastille.rightFillColor, pastille.leftText, pastille.rightText,
      pastille.leftTxtColor, pastille.rightTxtColor, isCurrentImpact, isEco,
      themeWood, themeBorder, dynamicScale, hitIntensity, isVariationStep
    );

    if (isRas) {
      const anglePerStepM = anglesForM.length > 0 ? getStepAngularSpan(anglesForM, stepIdx) : (Math.PI * 2) / Math.max(1, stepCountForM);
      drawRasSubStep(ctx, rawState[1], stepAngle, anglePerStepM, centerX, centerY, tRad, currentInst, track, rawTracks, instrumentsConfig, localLeftHanded, dynamicScale, themeBorder, isPlaying, playheadRatio, isEco);
    }
    ctx.restore();
  };

  const resolveAnglesForM = (mIdx: number) =>
    mIdx === measureIdx ? stepAngles : (mIdx === nextMeasureIdx ? nextResolved.stepAngles : prevResolved.stepAngles);

  const canSweepNext = currTimeSig === nextResolved.timeSig;
  const canSweepPrev = Boolean(isPlaying && snapshots.hasPrevMeasure && snapshots.prevMeasureIdx !== null && currTimeSig === prevResolved.timeSig);
  const candidates = buildCandidateAnglesForSweep(stepAngles, nextResolved.stepAngles, prevResolved.stepAngles, isPlaying, st.rodaSweepMode, canSweepNext, canSweepPrev);
  for (let i = 0; i < candidates.length; i++) {
    const { p, angle: stepAngle } = candidates[i];
    const x = centerX + Math.cos(stepAngle) * tRad, y = centerY + Math.sin(stepAngle) * tRad;
    const blend = resolveStepSweepBlend({
      p, isPlaying, playheadRatio, rodaSweepMode: st.rodaSweepMode,
      currentMeasureIdx: measureIdx, nextMeasureIdx, prevMeasureIdx: snapshots.prevMeasureIdx, hasPrevMeasure: snapshots.hasPrevMeasure,
      currStepCount: effectiveStepCount, currentActiveSteps: activePlayingSteps || [], currentBaseSteps, currStepAngles: stepAngles, currTimeSig,
      nextStepCount: nextResolved.stepCount, nextActiveSteps: nextResolved.activeSteps, nextBaseSteps: nextResolved.baseSteps, nextStepAngles: nextResolved.stepAngles, nextTimeSig: nextResolved.timeSig,
      prevStepCount: prevResolved.stepCount, prevActiveSteps: prevResolved.activeSteps, prevBaseSteps: prevResolved.baseSteps, prevStepAngles: prevResolved.stepAngles, prevTimeSig: prevResolved.timeSig,
    });

    drawSingleStateAtStep(blend.primaryState, blend.primaryBaseState, blend.primaryMeasureIdx, blend.primaryStepIdx, blend.primaryStepCount, resolveAnglesForM(blend.primaryMeasureIdx), stepAngle, x, y, blend.primaryAlpha);
    if (blend.isBlending && blend.secondaryMeasureIdx !== undefined && blend.secondaryAlpha) {
      drawSingleStateAtStep(blend.secondaryState, blend.secondaryBaseState, blend.secondaryMeasureIdx, blend.secondaryStepIdx ?? 0, blend.secondaryStepCount ?? effectiveStepCount, resolveAnglesForM(blend.secondaryMeasureIdx), stepAngle, x, y, blend.secondaryAlpha);
    }
  }

  if (!isEco && stepAngles.length > 0) {
    const x0 = centerX + Math.cos(stepAngles[0]) * tRad, y0 = centerY + Math.sin(stepAngles[0]) * tRad;
    ctx.save();
    ctx.globalAlpha = 1.0; ctx.fillStyle = themeText; ctx.font = 'bold 10px serif'; ctx.textAlign = 'left';
    ctx.fillText(track.customName || currentInst.name, x0 + 20, y0 + 3);
    ctx.restore();
  }
};
