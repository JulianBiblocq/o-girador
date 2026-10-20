/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackGroup, Pattern, InstrumentConfig } from '../../types';
import { instrumentsConfig } from '../../data';
import { resolvePatternForMeasure } from './measurePatternHelpers';
import { extractVoiceSteps } from './voiceStepExtraction';
import { buildVoiceBlocks } from './voiceBlockHelpers';
import { drawVoiceRibbons } from './drawVoiceRibbons';
import { drawVoicePastilles } from './drawVoicePastilles';

export const drawToadaTrack = (
  ctx: CanvasRenderingContext2D,
  track: TrackGroup,
  currentInst: InstrumentConfig,
  isToada: boolean,
  currentRawTracks: TrackGroup[],
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
  soloPlayId: number | null | undefined,
  totalMeasures: number,
  isLoopRegionActive: boolean | undefined,
  loopStartMeasure: number | null | undefined,
  loopEndMeasure: number | null | undefined,
  activeVariationsRef: React.MutableRefObject<{ [trackId: number]: any }> | undefined,
  themeWood: string,
  themeBorder: string,
  themeText: string
): void => {
  let puxTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  let coroTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  let puxPattern = resolvePatternForMeasure(puxTrackObj, measureIdx, soloPlayId);
  let coroPattern = resolvePatternForMeasure(coroTrackObj, measureIdx, soloPlayId);

  if (isToada && !puxPattern && !coroPattern && activePattern) {
    if (currentInst.id === 'coro') coroPattern = activePattern;
    else puxPattern = activePattern;
  } else if (!isToada) {
    if (currentInst.id === 'coro') {
      coroPattern = activePattern;
      coroTrackObj = track;
    } else {
      puxPattern = activePattern;
      puxTrackObj = track;
    }
  }

  const totalM = totalMeasures || 1;
  let nextMeasureIdx: number;
  if (isLoopRegionActive && loopEndMeasure !== null && loopEndMeasure !== undefined && measureIdx === loopEndMeasure) {
    nextMeasureIdx = (loopStartMeasure !== null && loopStartMeasure !== undefined) ? loopStartMeasure : 0;
  } else {
    nextMeasureIdx = (measureIdx + 1) % totalM;
  }

  const nextPuxPattern = resolvePatternForMeasure(puxTrackObj, nextMeasureIdx, soloPlayId);
  const nextCoroPattern = resolvePatternForMeasure(coroTrackObj, nextMeasureIdx, soloPlayId);

  const hasSeparateVoiceTracks = Boolean(puxTrackObj || coroTrackObj);
  const puxPlayingSteps = (activeVariationsRef?.current && puxTrackObj)
    ? (activeVariationsRef.current[puxTrackObj.id] || puxPattern?.activeSteps)
    : puxPattern?.activeSteps;
  const coroPlayingSteps = (activeVariationsRef?.current && coroTrackObj)
    ? (activeVariationsRef.current[coroTrackObj.id] || coroPattern?.activeSteps)
    : coroPattern?.activeSteps;

  const { puxSteps, coroSteps } = extractVoiceSteps(
    effectiveStepCount,
    hasSeparateVoiceTracks,
    puxPattern,
    coroPattern,
    nextPuxPattern,
    nextCoroPattern,
    activePattern,
    currentInst,
    puxPlayingSteps,
    coroPlayingSteps,
    activePlayingSteps,
    soloPlayId
  );

  const puxBlocks = buildVoiceBlocks(puxSteps, effectiveStepCount);
  const coroBlocks = buildVoiceBlocks(coroSteps, effectiveStepCount);

  drawVoiceRibbons(ctx, centerX, centerY, tRad, stepAngles, effectiveStepCount, puxBlocks, coroBlocks, dynamicScale);

  const trackLabel = track.customName || currentInst.name || (isToada ? 'Toada' : 'Voix');
  drawVoicePastilles(
    ctx,
    centerX,
    centerY,
    tRad,
    stepAngles,
    effectiveStepCount,
    currentStep,
    puxSteps,
    coroSteps,
    dynamicScale,
    isEco,
    themeWood,
    themeBorder,
    themeText,
    trackLabel
  );

  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;
  ctx.restore();
};
