const STRAW_PALETTE = [
  { r: 55, g: 35, b: 18, baseA: 0.62, width: 1.9 },   // Chanvre / paille grillée foncée
  { r: 185, g: 130, b: 45, baseA: 0.68, width: 1.7 }, // Paille dorée chaude
  { r: 55, g: 35, b: 18, baseA: 0.62, width: 2.15 },  // Chanvre épais
  { r: 185, g: 130, b: 45, baseA: 0.68, width: 1.45 },// Paille dorée fine
];

/**
 * Dessine le balai de paille organique (Vassoura de Palha) à +180° (6h d'écart avec la baguette) :
 * - Halo angulaire contrasté (~33°) en 14 tranches à bords 100 % estompés (courbe sin²), cœur terre d'ombre / sépia
 *   bordé d'un sillage d'écume parchemin claire côté nouveaux pas, zéro bord dur.
 * - 24 brins de paille contrastés (chanvre foncé + paille dorée) qui balaient la peau (#e2d8c3).
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
  const totalSpanRad = 0.58; // ~33° d'éventail total
  const startAngle = sweepAngle - totalSpanRad * 0.65;
  const slices = 14;
  const sliceSpan = totalSpanRad / slices;

  ctx.save();

  // 1. Halo estompé en 14 tranches jointives (courbe en cloche sin² : 0.0 -> max -> 0.0)
  for (let s = 0; s < slices; s++) {
    const t = (s + 0.5) / slices;
    const bell = Math.pow(Math.sin(t * Math.PI), 2);
    if (bell <= 0.01) continue;

    const a0 = startAngle + s * sliceSpan - 0.004;
    const a1 = startAngle + (s + 1) * sliceSpan + 0.004;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, a0, a1, false);
    ctx.arc(centerX, centerY, innerRadius, a1, a0, true);
    ctx.closePath();

    // Sillage d'écume parchemin claire côté nouveaux pas (arrière du balai) + cœur terre d'ombre / sépia chaud
    if (t < 0.42) {
      const wakeBell = Math.pow(Math.sin((t / 0.42) * Math.PI), 2);
      ctx.fillStyle = `rgba(250, 244, 232, ${(wakeBell * 0.45).toFixed(3)})`;
      ctx.fill();
    }
    const sepiaAlpha = bell * 0.25;
    ctx.fillStyle = `rgba(95, 60, 28, ${sepiaAlpha.toFixed(3)})`;
    ctx.fill();
  }

  // 2. 24 brins de paille organiques contrastés (Vassoura de Palha) au cœur de l'éventail
  const strawCount = 24;
  const usableRadius = outerRadius - innerRadius - 16;
  for (let i = 0; i < strawCount; i++) {
    const frac = (i + 0.5) / strawCount;
    const rMid = innerRadius + 8 + frac * usableRadius;
    const jitter = Math.sin(i * 4.7 + 1.3) * 0.5 + Math.cos(i * 2.9) * 0.5;
    const angleOffset = jitter * (totalSpanRad * 0.35);
    const centerBell = Math.cos((angleOffset / (totalSpanRad * 0.5)) * (Math.PI * 0.5));
    const brinAngle = sweepAngle - totalSpanRad * 0.12 + angleOffset;

    const radialHalf = 16 + (i % 4) * 5;
    const r0 = Math.max(innerRadius + 3, rMid - radialHalf);
    const r1 = Math.min(outerRadius - 3, rMid + radialHalf);
    const bendRad = 0.058 + (i % 3) * 0.019;

    const x0 = centerX + Math.cos(brinAngle - bendRad) * r0;
    const y0 = centerY + Math.sin(brinAngle - bendRad) * r0;
    const xc = centerX + Math.cos(brinAngle + bendRad * 0.48) * rMid;
    const yc = centerY + Math.sin(brinAngle + bendRad * 0.48) * rMid;
    const x1 = centerX + Math.cos(brinAngle - bendRad * 0.26) * r1;
    const y1 = centerY + Math.sin(brinAngle - bendRad * 0.26) * r1;

    const tone = STRAW_PALETTE[i % STRAW_PALETTE.length];
    const finalAlpha = Math.max(0.14, tone.baseA * Math.max(0.32, centerBell));

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(xc, yc, x1, y1);
    ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${finalAlpha.toFixed(3)})`;
    ctx.lineWidth = tone.width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();
}
