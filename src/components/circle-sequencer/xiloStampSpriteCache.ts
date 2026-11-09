import { applyCordelInkedPatina } from '../../utils/cordelPatina';

const MAX_CACHE_ENTRIES = 256;
const SPRITE_DPR = 2;
const stampCache = new Map<string, HTMLCanvasElement>();

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function computeGougePolygonPoints(cx: number, cy: number, radius: number, seed: number): Array<{ x: number; y: number }> {
  const facets = 13;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < facets; i++) {
    const baseAngle = (i / facets) * Math.PI * 2;
    const pseudo = Math.sin(seed * 0.019 + i * 2.39996) * 0.58 + Math.cos(seed * 0.037 + i * 4.13) * 0.42;
    const r = radius * (1 + pseudo * 0.082);
    const a = baseAngle + pseudo * 0.035;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function traceStraightFacetedPolygon(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
}

export interface XiloStampSprite {
  canvas: HTMLCanvasElement;
  logicalSize: number;
}

export function getOrCreateXiloStampSprite(
  fillColor: string, txtColor: string, text: string,
  radiusSize: number, dynamicScale: number, isAccentRing: boolean = false
): XiloStampSprite | null {
  if (typeof document === 'undefined') return null;

  const inkedFill = applyCordelInkedPatina(fillColor || '#1a1a1a');
  const qRadius = Math.max(4, Math.round(radiusSize * 2) / 2);
  const qScale = Math.round(dynamicScale * 20) / 20;
  const key = `v2_${inkedFill}_${txtColor}_${text}_${qRadius}_${qScale}_${isAccentRing ? 1 : 0}`;
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

  // 1. Fond patiné taillé au canif + micro-entailles de grain de peau (#e2d8c3 à 0.55)
  sCtx.save();
  traceStraightFacetedPolygon(sCtx, pts);
  sCtx.fillStyle = inkedFill;
  sCtx.fill();
  sCtx.clip();

  sCtx.fillStyle = 'rgba(226, 216, 195, 0.55)';
  for (let n = 0; n < 3; n++) {
    const idx = ((seed + n * 4) % pts.length + pts.length) % pts.length;
    const pA = pts[idx];
    const pB = pts[(idx + 1) % pts.length];
    const mx = (pA.x + pB.x) * 0.5, my = (pA.y + pB.y) * 0.5;
    const vx = cx - mx, vy = cy - my;
    sCtx.beginPath();
    sCtx.moveTo(pA.x * 0.72 + pB.x * 0.28, pA.y * 0.72 + pB.y * 0.28);
    sCtx.lineTo(mx + vx * 0.26, my + vy * 0.26);
    sCtx.lineTo(pA.x * 0.28 + pB.x * 0.72, pA.y * 0.28 + pB.y * 0.72);
    sCtx.closePath();
    sCtx.fill();
  }

  sCtx.strokeStyle = 'rgba(226, 216, 195, 0.35)';
  sCtx.lineWidth = 1.0;
  sCtx.beginPath();
  sCtx.moveTo(cx - qRadius * 0.72, cy - qRadius * 0.28);
  sCtx.lineTo(cx + qRadius * 0.65, cy - qRadius * 0.36);
  sCtx.stroke();
  sCtx.restore();

  // 2. Contour d'encre noire (#1a1a1a) irrégulier (1.1px d'un côté, 1.8px du côté appuyé)
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
    const baseLarge = qRadius < 10.5 ? (text.length > 1 ? 13 : 17) : (text.length > 1 ? 15 : 19);
    const fontSize = Math.max(9, Math.floor(baseLarge * qScale * 0.9));
    sCtx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
    sCtx.fillStyle = txtColor;
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    const textY = cy + 1.5;
    if (['↑', '↓', '←', '→'].includes(text)) {
      sCtx.strokeStyle = txtColor;
      sCtx.lineWidth = 2.2;
      sCtx.strokeText(text, cx, textY);
    }
    sCtx.fillText(text, cx, textY);
  }

  stampCache.set(key, canvas);
  return { canvas, logicalSize };
}
