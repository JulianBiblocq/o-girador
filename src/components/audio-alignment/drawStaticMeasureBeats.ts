/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function drawStaticMeasureBeats(params: {
  ctx: CanvasRenderingContext2D;
  mStartPx: number;
  stepsCountM: number;
  stepPxM: number;
  width: number;
  height: number;
  isCompound: boolean;
}) {
  const { ctx, mStartPx, stepsCountM, stepPxM, width, height, isCompound } = params;
  const beatStepInterval = isCompound ? 3 : 4;

  for (let s = 0; s < stepsCountM; s++) {
    const xPos = mStartPx + s * stepPxM;
    if (xPos > width) break;
    const isBeat = s % beatStepInterval === 0;
    const beatNum = Math.floor(s / beatStepInterval) + 1;

    if (isBeat) {
      ctx.strokeStyle = 'rgba(139, 42, 26, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height);
      ctx.stroke();

      ctx.fillStyle = '#8b2a1a';
      ctx.fillRect(xPos, 0, 22, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`T${beatNum}`, xPos + 11, 7);
    } else {
      ctx.strokeStyle = 'rgba(26, 26, 26, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xPos, 14);
      ctx.lineTo(xPos, height);
      ctx.stroke();
    }
  }
}
