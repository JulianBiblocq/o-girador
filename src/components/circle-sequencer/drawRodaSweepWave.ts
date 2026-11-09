/**
 * Dessine le faisceau de balayage progressif de la Roda à +180° (6h d'écart avec la baguette) :
 * - Zéro arc ou demi-cercle tangentiel interne.
 * - Halo angulaire progressif très doux (18 fines tranches radiales jointives en cloche sin²(pi*t) de 0.0 à 0.20 max)
 *   en teinte ambre/sépia doux rgba(110, 72, 38, alpha) doublée d'un filet parchemin clair rgba(244, 236, 216, alpha * 1.4).
 * - Quelques stries droites purement radiales (orientées du centre vers l'extérieur le long de l'angle theta), très fines (1px) et discrètes.
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
  const totalSpanRad = 0.48; // ~27.5° d'éventail doux
  const startAngle = sweepAngle - totalSpanRad * 0.62;
  const slices = 18;
  const sliceSpan = totalSpanRad / slices;

  ctx.save();

  // 1. Halo angulaire progressif très doux (18 fines tranches radiales jointives, cloche sin²(pi * t))
  for (let s = 0; s < slices; s++) {
    const t = (s + 0.5) / slices;
    const bell = Math.pow(Math.sin(t * Math.PI), 2);
    if (bell <= 0.005) continue;

    const a0 = startAngle + s * sliceSpan - 0.0012;
    const a1 = startAngle + (s + 1) * sliceSpan + 0.0012;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, a0, a1, false);
    ctx.arc(centerX, centerY, innerRadius, a1, a0, true);
    ctx.closePath();

    const alpha = bell * 0.20;
    if (t < 0.46) {
      const wakeBell = Math.pow(Math.sin((t / 0.46) * Math.PI), 2);
      const wakeAlpha = Math.min(0.28, wakeBell * 0.20 * 1.4);
      ctx.fillStyle = `rgba(244, 236, 216, ${wakeAlpha.toFixed(3)})`;
      ctx.fill();
    }
    ctx.fillStyle = `rgba(110, 72, 38, ${alpha.toFixed(3)})`;
    ctx.fill();
  }

  // 2. Quelques stries droites purement radiales (orientées du centre vers l'extérieur le long de theta, 1px)
  const rayOffsets = [-0.14, -0.09, -0.05, -0.015, 0.02, 0.06, 0.10, 0.14];
  const radialSpan = outerRadius - innerRadius;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';

  for (let i = 0; i < rayOffsets.length; i++) {
    const offset = rayOffsets[i];
    const theta = sweepAngle - totalSpanRad * 0.10 + offset;
    const normDist = Math.min(1, Math.abs(offset) / 0.16);
    const rayBell = Math.pow(Math.cos(normDist * Math.PI * 0.5), 2);

    const rStart = innerRadius + radialSpan * (0.06 + (i % 3) * 0.08);
    const rEnd = outerRadius - radialSpan * (0.05 + ((i + 1) % 3) * 0.07);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    ctx.beginPath();
    ctx.moveTo(centerX + cosT * rStart, centerY + sinT * rStart);
    ctx.lineTo(centerX + cosT * rEnd, centerY + sinT * rEnd);
    ctx.strokeStyle = i % 2 === 0
      ? `rgba(95, 60, 28, ${(0.22 * rayBell).toFixed(3)})`
      : `rgba(244, 236, 216, ${(0.28 * rayBell).toFixed(3)})`;
    ctx.stroke();
  }

  ctx.restore();
}
