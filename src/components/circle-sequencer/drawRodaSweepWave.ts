/**
 * Dessine l'onde douce / écume parcheminée de balayage à +180° (6h d'écart avec la baguette)
 * au ras de la peau de l'alfaia (#e2d8c3), visuellement distincte de l'aiguille principale.
 */
export function drawRodaSweepWave(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  sweepRatio: number | null,
  isEco: boolean
): void {
  if (sweepRatio === null || isEco) return;

  const sweepAngle = -Math.PI / 2 + sweepRatio * Math.PI * 2;
  const trailSpanRad = 0.16; // ~9° de sillage d'écume douce derrière le front d'onde

  ctx.save();

  // Sillage d'écume parcheminée au ras de la peau
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, sweepAngle - trailSpanRad, sweepAngle, false);
  ctx.arc(centerX, centerY, innerRadius, sweepAngle, sweepAngle - trailSpanRad, true);
  ctx.closePath();
  ctx.fillStyle = 'rgba(194, 94, 56, 0.09)';
  ctx.fill();

  // Front d'onde gravé finement en pointillé doux (non confondable avec la baguette)
  const xIn = centerX + Math.cos(sweepAngle) * innerRadius;
  const yIn = centerY + Math.sin(sweepAngle) * innerRadius;
  const xOut = centerX + Math.cos(sweepAngle) * outerRadius;
  const yOut = centerY + Math.sin(sweepAngle) * outerRadius;

  ctx.beginPath();
  ctx.moveTo(xIn, yIn);
  ctx.lineTo(xOut, yOut);
  ctx.strokeStyle = 'rgba(139, 42, 26, 0.32)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Petit croissant d'écume sur l'anneau extérieur
  ctx.beginPath();
  ctx.arc(xOut, yOut, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(194, 94, 56, 0.45)';
  ctx.fill();

  ctx.restore();
}
