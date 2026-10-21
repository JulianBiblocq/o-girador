/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentConfig, TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { resolveSatellites } from './percussionSatelliteHelpers';
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
  for (let i = 0; i < effectiveStepCount; i++) {
    const stepAngle = stepAngles[i];
    const x = centerX + Math.cos(stepAngle) * tRad;
    const y = centerY + Math.sin(stepAngle) * tRad;

    const satellites = resolveSatellites(
      track,
      i,
      measureIdx,
      rawTracks,
      activeVariationsRef,
      localLeftHanded
    );

    const rawMasterState = activePlayingSteps[i];
    const isRas = Array.isArray(rawMasterState) && rawMasterState.length === 2;
    const masterState = isRas ? rawMasterState[0] : rawMasterState;

    const pastille = resolveStepPastilleData(
      masterState,
      satellites,
      currentInst,
      track,
      rawTracks,
      instrumentsConfig,
      localLeftHanded,
      dynamicScale
    );

    if (!pastille.hasEvent) continue;

    const maxAllowedRadius = (Math.PI * tRad / effectiveStepCount) * 0.85;
    const finalRadiusSize = Math.min(pastille.radiusSize, maxAllowedRadius);

    drawSplitStepPastille(
      ctx,
      x,
      y,
      finalRadiusSize,
      pastille.isSplit,
      pastille.isRightHalfOnly,
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
  }

  // Label de la piste au pas 0
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

  ctx.restore();
};
