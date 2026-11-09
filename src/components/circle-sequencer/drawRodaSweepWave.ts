/**
 * Dessine le faisceau de balayage progressif de la Roda à +180° (6h d'écart avec la baguette)
 * façon « Balai de Paille de Lavagem » (vassoura de palha) :
 * 1. Halo angulaire doux en cloche sin²(pi*t) élargi de +20 % (bords 100 % fondus à 0).
 * 2. 9 brins de paille ondulés partant resserrés contre le médaillon central (±2.5°)
 *    et s'évasant en éventail vers le cerclage extérieur (±10°), avec ondulation sinusoïdale
 *    naturelle le long du rayon et alternance chanvre/encre (1.4px) et paille dorée (1.2px).
 */
const BRISTLE_TIP_RATIOS = [0.91, 0.96, 0.92, 0.98, 0.94, 0.97, 0.90, 0.95, 0.93];
const BRISTLE_PHASES = [0.2, 1.3, 2.5, 0.8, 3.4, 1.9, 4.2, 2.9, 5.1];
const BRISTLE_AMPS = [0.015, 0.018, 0.013, 0.019, 0.014, 0.017, 0.016, 0.018, 0.014];

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
  const totalSpanRad = 0.58; // Halo élargi de +20 % (~33.2°), bords fondus à 0
  const startAngle = sweepAngle - totalSpanRad * 0.58;
  const slices = 18;
  const sliceSpan = totalSpanRad / slices;

  ctx.save();

  // 1. Halo de fond ocre/crème en cloche sin²(pi * t)
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

  // 2. 9 brins de paille ondulés partant groupés du centre (±2.5°) et s'évasant vers le bord (±10°)
  const radialSpan = outerRadius - innerRadius;
  const collarHalfSpan = (2.5 * Math.PI) / 180; // ±2.5° au col lié
  const fanHalfSpan = (10.0 * Math.PI) / 180;   // ±10° aux pointes
  const segments = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < 9; i++) {
    const u = (i - 4) / 4; // [-1, 1]
    const thetaCollar = sweepAngle + u * collarHalfSpan;
    const thetaTip = sweepAngle + u * fanHalfSpan;
    const rStart = innerRadius + radialSpan * 0.015;
    const rTip = innerRadius + radialSpan * BRISTLE_TIP_RATIOS[i];
    const amp = BRISTLE_AMPS[i];
    const phase = BRISTLE_PHASES[i];

    ctx.beginPath();
    for (let k = 0; k <= segments; k++) {
      const t = k / segments;
      const r = rStart + (rTip - rStart) * t;
      const baseTheta = thetaCollar + (thetaTip - thetaCollar) * Math.pow(t, 1.12);
      const waveOffset = amp * Math.sin(2.5 * Math.PI * t + phase) * Math.min(1, t * 2.2);
      const theta = baseTheta + waveOffset;
      const px = centerX + Math.cos(theta) * r;
      const py = centerY + Math.sin(theta) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    if (i % 2 === 0) {
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(42, 26, 14, 0.62)';
    } else {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(202, 156, 78, 0.68)';
    }
    ctx.stroke();
  }

  ctx.restore();
}
