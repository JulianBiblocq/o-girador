
export function drawTrimOverlay(params: {
  ctx: CanvasRenderingContext2D;
  currentBufferPxWidth: number;
  height: number;
  trimStartSec: number;
  trimEndSec: number;
  pixelsPerSecond: number;
}) {
  const { ctx, currentBufferPxWidth, height, trimStartSec, trimEndSec, pixelsPerSecond } = params;

  ctx.clearRect(0, 0, currentBufferPxWidth, height);
  const startPx = trimStartSec * pixelsPerSecond;
  const endPx = trimEndSec * pixelsPerSecond;

  ctx.fillStyle = 'rgba(26, 26, 26, 0.55)';
  ctx.fillRect(0, 0, startPx, height);
  if (endPx < currentBufferPxWidth) {
    ctx.fillRect(endPx, 0, currentBufferPxWidth - endPx, height);
  }

  ctx.strokeStyle = '#2a5d4e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(startPx, 0);
  ctx.lineTo(startPx, height);
  ctx.stroke();

  ctx.fillStyle = '#2a5d4e';
  ctx.fillRect(startPx, 0, 68, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('TRIM DÉBUT', startPx + 4, 11);

  ctx.strokeStyle = '#8b2a1a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(endPx, 0);
  ctx.lineTo(endPx, height);
  ctx.stroke();

  const labelEndWidth = 58;
  const labelEndX = Math.max(0, endPx - labelEndWidth);
  ctx.fillStyle = '#8b2a1a';
  ctx.fillRect(labelEndX, 0, labelEndWidth, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('TRIM FIN', labelEndX + 5, 11);
}
