import { applyCordelInkedPatina } from '../../utils/cordelPatina';

const MAX_CACHE_ENTRIES = 256;
const SPRITE_DPR = 2;
const stampCache = new Map<string, HTMLCanvasElement>();

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function computeGougePolygonPoints(cx: number, cy: number, radius: number, seed: number): Array<{ x: number; y: number }> {
  const facets = 13, pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < facets; i++) {
    const baseAngle = (i / facets) * Math.PI * 2;
    const pseudo = Math.sin(seed * 0.019 + i * 2.39996) * 0.58 + Math.cos(seed * 0.037 + i * 4.13) * 0.42;
    const r = radius * (1 + pseudo * 0.082), a = baseAngle + pseudo * 0.035;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function traceStraightFacetedPolygon(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export interface XiloStampSprite { canvas: HTMLCanvasElement; logicalSize: number; }

export function getOrCreateXiloStampSprite(
  fillColor: string, txtColor: string, text: string,
  radiusSize: number, dynamicScale: number, isAccentRing: boolean = false
): XiloStampSprite | null {
  if (typeof document === 'undefined') return null;

  const inkedFill = applyCordelInkedPatina(fillColor || '#1a1a1a');
  const qRadius = Math.max(4, Math.round(radiusSize * 2) / 2);
  const qScale = Math.round(dynamicScale * 20) / 20;
  const key = `v4_${inkedFill}_${txtColor}_${text}_${qRadius}_${qScale}_${isAccentRing ? 1 : 0}`;
  const logicalSize = Math.ceil((qRadius + 6) * 2);

  const existing = stampCache.get(key);
  if (existing) return { canvas: existing, logicalSize };
  if (stampCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = stampCache.keys().next().value;
    if (oldestKey) stampCache.delete(oldestKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = logicalSize * SPRITE_DPR;
  canvas.height = logicalSize * SPRITE_DPR;
  const sCtx = canvas.getContext('2d');
  if (!sCtx) return null;

  sCtx.scale(SPRITE_DPR, SPRITE_DPR);
  const cx = logicalSize * 0.5, cy = logicalSize * 0.5;
  const seed = hashString(`${inkedFill}:${text}`);
  const pts = computeGougePolygonPoints(cx, cy, qRadius, seed);

  // 1. Fond patiné franc taillé au canif + rainures de veinage du bois (sans voile beige)
  sCtx.save();
  traceStraightFacetedPolygon(sCtx, pts);
  sCtx.fillStyle = inkedFill;
  sCtx.fill();
  sCtx.clip();

  sCtx.strokeStyle = 'rgba(26, 26, 26, 0.20)';
  sCtx.lineWidth = 1.0;
  sCtx.beginPath();
  sCtx.moveTo(cx - qRadius * 0.85, cy - qRadius * 0.35);
  sCtx.quadraticCurveTo(cx, cy - qRadius * 0.48, cx + qRadius * 0.85, cy - qRadius * 0.30);
  sCtx.moveTo(cx - qRadius * 0.85, cy + qRadius * 0.32);
  sCtx.quadraticCurveTo(cx, cy + qRadius * 0.44, cx + qRadius * 0.85, cy + qRadius * 0.28);
  sCtx.stroke();

  sCtx.strokeStyle = 'rgba(244, 236, 216, 0.16)';
  sCtx.lineWidth = 0.9;
  sCtx.beginPath();
  sCtx.moveTo(cx - qRadius * 0.82, cy - qRadius * 0.18);
  sCtx.quadraticCurveTo(cx, cy - qRadius * 0.08, cx + qRadius * 0.82, cy - qRadius * 0.22);
  sCtx.moveTo(cx - qRadius * 0.78, cy + qRadius * 0.48);
  sCtx.quadraticCurveTo(cx, cy + qRadius * 0.58, cx + qRadius * 0.78, cy + qRadius * 0.45);
  sCtx.stroke();

  sCtx.fillStyle = 'rgba(244, 236, 216, 0.24)';
  for (let n = 0; n < 2; n++) {
    const idx = ((seed + n * 5) % pts.length + pts.length) % pts.length;
    const pA = pts[idx], pB = pts[(idx + 1) % pts.length];
    const mx = (pA.x + pB.x) * 0.5, my = (pA.y + pB.y) * 0.5;
    sCtx.beginPath();
    sCtx.moveTo(pA.x * 0.76 + pB.x * 0.24, pA.y * 0.76 + pB.y * 0.24);
    sCtx.lineTo(mx + (cx - mx) * 0.18, my + (cy - my) * 0.18);
    sCtx.lineTo(pA.x * 0.24 + pB.x * 0.76, pA.y * 0.24 + pB.y * 0.76);
    sCtx.closePath();
    sCtx.fill();
  }
  sCtx.restore();

  // 2. Contour d'encre noire (#1a1a1a) irrégulier (1.1px d'un côté, 1.85px du côté appuyé)
  traceStraightFacetedPolygon(sCtx, pts);
  sCtx.lineWidth = isAccentRing ? 2.1 : 1.1;
  sCtx.strokeStyle = isAccentRing ? '#f59e0b' : '#1a1a1a';
  sCtx.stroke();

  if (!isAccentRing) {
    sCtx.beginPath();
    const startIdx = seed % pts.length;
    sCtx.moveTo(pts[startIdx].x, pts[startIdx].y);
    for (let k = 1; k <= 7; k++) {
      const p = pts[(startIdx + k) % pts.length];
      sCtx.lineTo(p.x, p.y);
    }
    sCtx.lineWidth = 1.85;
    sCtx.strokeStyle = '#1a1a1a';
    sCtx.stroke();
  }

  // 3. Symbole gravé au centre
  if (text) {
    const fontSize = Math.max(9, Math.round(qRadius * (text.length > 1 ? 0.88 : 1.12)));
    sCtx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
    sCtx.fillStyle = txtColor;
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    const textY = cy + 1.5;
    if (['↑', '↓', '←', '→'].includes(text)) {
      sCtx.strokeStyle = txtColor;
      sCtx.lineWidth = Math.max(1.8, qRadius * 0.11);
      sCtx.strokeText(text, cx, textY);
    }
    sCtx.fillText(text, cx, textY);
  }

  stampCache.set(key, canvas);
  return { canvas, logicalSize };
}
