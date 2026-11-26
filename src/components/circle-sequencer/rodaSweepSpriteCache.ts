/**
 * rodaSweepSpriteCache.ts — Pré-rendu hors-écran unique du Balai de Paille 6h (< 115 lignes).
 * Élimine les 26 `arc/fill`, 144 `sin/cos` et 18 `stroke` par trame au profit d'1 seul `drawImage` rotatif.
 */
const BRISTLE_TIP_RATIOS = [
  0.91, 0.44, 0.96, 0.76, 0.92, 0.32, 0.98, 0.88, 0.67,
  0.94, 0.55, 0.96, 0.97, 0.84, 0.90, 0.92, 0.95, 0.93,
];
const BRISTLE_PHASES = [
  0.2, 2.1, 1.3, 3.8, 2.5, 0.9, 0.8, 4.5, 1.7,
  3.4, 5.2, 1.9, 2.8, 4.1, 4.2, 0.5, 2.9, 5.1,
];
const BRISTLE_AMPS = [
  0.015, 0.012, 0.018, 0.014, 0.013, 0.011, 0.019, 0.016, 0.013,
  0.014, 0.012, 0.017, 0.016, 0.015, 0.016, 0.014, 0.018, 0.014,
];

interface SweepSpriteEntry {
  key: string;
  canvas: HTMLCanvasElement;
  logicalSize: number;
}

let cachedSweepSprite: SweepSpriteEntry | null = null;

export function getOrCreateRodaSweepSprite(innerRadius: number, outerRadius: number): SweepSpriteEntry | null {
  if (typeof document === 'undefined') return null;
  const logicalSize = Math.ceil((outerRadius + 8) * 2);
  const key = `${innerRadius}_${outerRadius}`;
  if (cachedSweepSprite && cachedSweepSprite.key === key) {
    return cachedSweepSprite;
  }

  const canvas = document.createElement('canvas');
  canvas.width = logicalSize;
  canvas.height = logicalSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = logicalSize * 0.5;
  const cy = logicalSize * 0.5;
  const totalSpanRad = 0.58;
  const startAngle = -totalSpanRad * 0.58;
  const slices = 18;
  const sliceSpan = totalSpanRad / slices;

  for (let s = 0; s < slices; s++) {
    const t = (s + 0.5) / slices;
    const bell = Math.pow(Math.sin(t * Math.PI), 2);
    if (bell <= 0.005) continue;

    const a0 = startAngle + s * sliceSpan - 0.0012;
    const a1 = startAngle + (s + 1) * sliceSpan + 0.0012;

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, a0, a1, false);
    ctx.arc(cx, cy, innerRadius, a1, a0, true);
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

  const radialSpan = outerRadius - innerRadius;
  const collarHalfSpan = (3.0 * Math.PI) / 180;
  const fanHalfSpan = (10.5 * Math.PI) / 180;
  const bristleCount = BRISTLE_TIP_RATIOS.length;
  const segments = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < bristleCount; i++) {
    const u = (i - (bristleCount - 1) * 0.5) / ((bristleCount - 1) * 0.5);
    const tipRatio = BRISTLE_TIP_RATIOS[i];
    const thetaCollar = u * collarHalfSpan;
    const thetaTip = u * (collarHalfSpan + (fanHalfSpan - collarHalfSpan) * tipRatio);
    const rStart = innerRadius + radialSpan * 0.015;
    const rTip = innerRadius + radialSpan * tipRatio;
    const amp = BRISTLE_AMPS[i];
    const phase = BRISTLE_PHASES[i];

    ctx.beginPath();
    for (let k = 0; k <= segments; k++) {
      const t = k / segments;
      const r = rStart + (rTip - rStart) * t;
      const baseTheta = thetaCollar + (thetaTip - thetaCollar) * Math.pow(t, 1.12);
      const waveOffset = amp * Math.sin(2.5 * Math.PI * t + phase) * Math.min(1, t * 2.2);
      const theta = baseTheta + waveOffset;
      const px = cx + Math.cos(theta) * r;
      const py = cy + Math.sin(theta) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.lineWidth = i % 2 === 0 ? 1.35 : 1.15;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(42, 26, 14, 0.62)' : 'rgba(202, 156, 78, 0.68)';
    ctx.stroke();
  }

  cachedSweepSprite = { key, canvas, logicalSize };
  return cachedSweepSprite;
}
