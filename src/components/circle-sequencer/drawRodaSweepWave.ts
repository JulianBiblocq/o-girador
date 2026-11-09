const STRAW_PALETTE = [
  { r: 208, g: 176, b: 120, baseA: 0.55 }, // Paille dorée
  { r: 140, g: 107, b: 72, baseA: 0.45 },  // Chanvre
  { r: 244, g: 236, b: 216, baseA: 0.60 }, // Écume claire
];

/**
 * Dessine le balai de paille organique (Vassoura de Palha) à +180° (6h d'écart avec la baguette) :
 * - Halo angulaire large (~32°) en 12 fines tranches à bords 100 % estompés (courbe sin²), zéro bord dur.
 * - 16 brins de paille arqués qui balaient la peau d'Alfaia (#e2d8c3) entre le médaillon et le cerclage.
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
  const totalSpanRad = 0.56; // ~32° d'éventail total
  const startAngle = sweepAngle - totalSpanRad * 0.65;
  const slices = 12;
  const sliceSpan = totalSpanRad / slices;

  ctx.save();

  // 1. Halo estompé en 12 tranches jointives (courbe en cloche sin² : 0.0 -> max -> 0.0)
  for (let s = 0; s < slices; s++) {
    const t = (s + 0.5) / slices;
    const bell = Math.pow(Math.sin(t * Math.PI), 2);
    const alpha = bell * 0.14;
    if (alpha <= 0.005) continue;

    const a0 = startAngle + s * sliceSpan - 0.004;
    const a1 = startAngle + (s + 1) * sliceSpan + 0.004;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, a0, a1, false);
    ctx.arc(centerX, centerY, innerRadius, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = `rgba(198, 158, 102, ${alpha.toFixed(3)})`;
    ctx.fill();
  }

  // 2. 16 brins de paille organiques (Vassoura de Palha) au cœur de l'éventail
  const strawCount = 16;
  const usableRadius = outerRadius - innerRadius - 18;
  for (let i = 0; i < strawCount; i++) {
    const frac = (i + 0.5) / strawCount;
    const rMid = innerRadius + 9 + frac * usableRadius;
    const jitter = Math.sin(i * 4.7 + 1.3) * 0.5 + Math.cos(i * 2.9) * 0.5;
    const angleOffset = jitter * (totalSpanRad * 0.34);
    const centerBell = Math.cos((angleOffset / (totalSpanRad * 0.5)) * (Math.PI * 0.5));
    const brinAngle = sweepAngle - totalSpanRad * 0.12 + angleOffset;

    const radialHalf = 14 + (i % 4) * 5;
    const r0 = Math.max(innerRadius + 4, rMid - radialHalf);
    const r1 = Math.min(outerRadius - 4, rMid + radialHalf);
    const bendRad = 0.055 + (i % 3) * 0.018;

    const x0 = centerX + Math.cos(brinAngle - bendRad) * r0;
    const y0 = centerY + Math.sin(brinAngle - bendRad) * r0;
    const xc = centerX + Math.cos(brinAngle + bendRad * 0.45) * rMid;
    const yc = centerY + Math.sin(brinAngle + bendRad * 0.45) * rMid;
    const x1 = centerX + Math.cos(brinAngle - bendRad * 0.25) * r1;
    const y1 = centerY + Math.sin(brinAngle - bendRad * 0.25) * r1;

    const tone = STRAW_PALETTE[i % STRAW_PALETTE.length];
    const finalAlpha = Math.max(0.08, tone.baseA * Math.max(0.25, centerBell));

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(xc, yc, x1, y1);
    ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${finalAlpha.toFixed(3)})`;
    ctx.lineWidth = i % 3 === 0 ? 1.6 : 1.15;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();
}
