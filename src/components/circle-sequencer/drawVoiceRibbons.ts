
import { VoiceBlock } from './voiceBlockHelpers';
import { drawGouacheRibbon } from './drawGouacheRibbon';

export const drawVoiceRibbons = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  tRad: number,
  stepAngles: number[],
  effectiveStepCount: number,
  puxBlocks: VoiceBlock[],
  coroBlocks: VoiceBlock[],
  dynamicScale: number
): void => {
  const getStepSpan = (sIdx: number) => {
    if (sIdx < effectiveStepCount - 1) {
      return stepAngles[sIdx + 1] - stepAngles[sIdx];
    }
    return (-Math.PI / 2 + Math.PI * 2) - stepAngles[sIdx];
  };

  // Traînées Puxador
  puxBlocks.forEach(b => {
    const thetaStart = stepAngles[b.startIndex];
    const isWrapped = b.endIndex >= effectiveStepCount;
    const normEnd = isWrapped ? (b.endIndex % effectiveStepCount) : b.endIndex;
    const span = getStepSpan(normEnd);
    const baseEnd = isWrapped ? (stepAngles[normEnd] + Math.PI * 2) : stepAngles[normEnd];
    const thetaEnd = baseEnd + span * 0.88;
    const thetaFilEnd = baseEnd + span * 0.75;
    const ribbonColor = b.isAnacrusis ? 'rgba(194, 94, 56, 0.72)' : '#c25e38';
    drawGouacheRibbon(ctx, centerX, centerY, tRad, thetaStart, thetaEnd, thetaFilEnd, ribbonColor, dynamicScale);
  });

  // Traînées Coro
  coroBlocks.forEach(b => {
    const thetaStart = stepAngles[b.startIndex];
    const isWrapped = b.endIndex >= effectiveStepCount;
    const normEnd = isWrapped ? (b.endIndex % effectiveStepCount) : b.endIndex;
    const span = getStepSpan(normEnd);
    const baseEnd = isWrapped ? (stepAngles[normEnd] + Math.PI * 2) : stepAngles[normEnd];
    const thetaEnd = baseEnd + span * 0.88;
    const thetaFilEnd = baseEnd + span * 0.75;
    const ribbonColor = b.isAnacrusis ? 'rgba(42, 157, 143, 0.72)' : '#2a9d8f';
    drawGouacheRibbon(ctx, centerX, centerY, tRad, thetaStart, thetaEnd, thetaFilEnd, ribbonColor, dynamicScale);
  });
};
