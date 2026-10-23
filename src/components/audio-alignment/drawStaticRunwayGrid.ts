
import { Pattern } from '../../types/store.types';

export function drawStaticRunwayGrid(params: {
  ctx: CanvasRenderingContext2D;
  temps1Px: number;
  isCompoundPrev: boolean;
  height: number;
  yCenter: number;
  pattern: Pattern;
}) {
  const { ctx, temps1Px, isCompoundPrev, height, yCenter, pattern } = params;
  const stepsCountPrev = isCompoundPrev ? 12 : 16;
  const stepPxPrev = temps1Px / stepsCountPrev;

  for (let s = 0; s < stepsCountPrev; s++) {
    const xPos = s * stepPxPrev;
    const isBeatPrev = s % (isCompoundPrev ? 3 : 4) === 0;
    ctx.strokeStyle = isBeatPrev ? 'rgba(42, 93, 78, 0.25)' : 'rgba(26, 26, 26, 0.1)';
    ctx.lineWidth = isBeatPrev ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(xPos, 0);
    ctx.lineTo(xPos, height);
    ctx.stroke();

    if (pattern.preRollActiveSteps && pattern.preRollActiveSteps[s]) {
      ctx.fillStyle = '#2a5d4e';
      ctx.beginPath();
      ctx.arc(xPos + stepPxPrev / 2, yCenter, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.stroke();

      const preSyl = pattern.preRollLyrics?.[s];
      if (preSyl) {
        ctx.font = 'bold 11px monospace, sans-serif';
        ctx.fillStyle = '#2a5d4e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(preSyl, xPos + stepPxPrev / 2, yCenter - 8);
      }
    }
  }
}
