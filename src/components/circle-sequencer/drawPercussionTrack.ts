import { InstrumentConfig, TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import {
  areStepValuesEqual,
  resolveSlaveStepOpacity,
  SlaveFocusContext,
} from '../../utils/slaveStepOpacityResolver';
import { resolveStepPastilleData } from './resolveStepPastilleData';
import { drawSplitStepPastille } from './drawSplitStepPastille';
import { drawRasSubStep } from './drawRasSubStep';

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
  themeText: string
): void => {
  const storeState = useSequencerStore.getState();
  const focusCtx: SlaveFocusContext = {
    isFocusActive: storeState.isFocusActive,
    focusTrackId: storeState.focusTrackId,
    referenceTrackId: storeState.referenceTrackId,
    activeAoVivoTrackId: storeState.activeAoVivoTrackId,
    editingTrackId: storeState.editingTrackId,
    mobileViewMode: storeState.mobileViewMode,
  };

  for (let i = 0; i < effectiveStepCount; i++) {
    const stepAngle = stepAngles[i];
    const x = centerX + Math.cos(stepAngle) * tRad;
    const y = centerY + Math.sin(stepAngle) * tRad;

    const rawMasterState = activePlayingSteps?.[i] ?? 0;
    const baseState = activePattern?.activeSteps?.[i] ?? 0;
    const isVariationStep = !areStepValuesEqual(rawMasterState, baseState);
    const isRas = Array.isArray(rawMasterState) && rawMasterState.length === 2;
    const masterState = isRas ? rawMasterState[0] : rawMasterState;

    const pastille = resolveStepPastilleData(
      masterState,
      [],
      currentInst,
      track,
      rawTracks,
      instrumentsConfig,
      localLeftHanded,
      dynamicScale
    );

    if (!pastille.hasEvent) continue;

    const stepOpacity = isVariationStep
      ? 1.0
      : resolveSlaveStepOpacity({
          track,
          allTracks: rawTracks,
          measureIdx,
          stepIdx: i,
          ownStepVal: rawMasterState,
          focusCtx,
          activeVariationsMap: activeVariationsRef?.current,
        });

    const maxAllowedRadius = ((Math.PI * tRad) / effectiveStepCount) * 0.85;
    const finalRadiusSize = Math.min(pastille.radiusSize, maxAllowedRadius);

    ctx.save();
    ctx.globalAlpha = stepOpacity;

    if (isVariationStep && !isEco) {
      ctx.beginPath();
      ctx.arc(x, y, finalRadiusSize + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#c25e38';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawSplitStepPastille(
      ctx,
      x,
      y,
      finalRadiusSize,
      false,
      false,
      pastille.leftFillColor,
      pastille.rightFillColor,
      pastille.leftText,
      pastille.rightText,
      pastille.leftTxtColor,
      pastille.rightTxtColor,
      i === currentStep,
      isEco,
      themeWood,
      themeBorder,
      dynamicScale
    );

    if (isRas) {
      const anglePerStep = stepAngles[1] ? stepAngles[1] - stepAngles[0] : (Math.PI * 2) / effectiveStepCount;
      drawRasSubStep(
        ctx,
        rawMasterState[1],
        stepAngle,
        anglePerStep,
        centerX,
        centerY,
        tRad,
        currentInst,
        track,
        rawTracks,
        instrumentsConfig,
        localLeftHanded,
        dynamicScale,
        themeBorder
      );
    }

    ctx.restore();
  }

  if (!isEco) {
    const x0 = centerX + Math.cos(stepAngles[0]) * tRad;
    const y0 = centerY + Math.sin(stepAngles[0]) * tRad;
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = themeText;
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left';
    const labelText = track.customName || currentInst.name;
    ctx.fillText(labelText, x0 + 20, y0 + 3);
    ctx.restore();
  }
};
