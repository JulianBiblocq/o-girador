import { getOrCreateRodaSweepSprite } from './rodaSweepSpriteCache';

/**
 * Dessine le faisceau de balayage progressif de la Roda à +180° (6h d'écart avec la baguette)
 * via 1 seul `drawImage` rotatif depuis le sprite pré-rendu (`rodaSweepSpriteCache`).
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
  const sprite = getOrCreateRodaSweepSprite(innerRadius, outerRadius);
  if (!sprite) return;

  const sweepAngle = -Math.PI / 2 + sweepRatio * Math.PI * 2;
  const half = sprite.logicalSize * 0.5;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(sweepAngle);
  ctx.drawImage(sprite.canvas, -half, -half, sprite.logicalSize, sprite.logicalSize);
  ctx.restore();
}
