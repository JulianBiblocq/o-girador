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

function traceGougeCarvedPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, seed: number): void {
  const facets = 14;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < facets; i++) {
    const baseAngle = (i / facets) * Math.PI * 2;
    const pseudo = Math.sin(seed * 0.017 + i * 2.39996) * 0.5 + Math.cos(seed * 0.031 + i * 4.1) * 0.5;
    const r = radius * (1 + pseudo * 0.036);
    const a = baseAngle + pseudo * 0.022;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }

  ctx.beginPath();
  ctx.moveTo((pts[facets - 1].x + pts[0].x) * 0.5, (pts[facets - 1].y + pts[0].y) * 0.5);
  for (let i = 0; i < facets; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % facets];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) * 0.5, (curr.y + next.y) * 0.5);
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

  const qRadius = Math.max(4, Math.round(radiusSize * 2) / 2);
  const qScale = Math.round(dynamicScale * 20) / 20;
  const key = `${fillColor}_${txtColor}_${text}_${qRadius}_${qScale}_${isAccentRing ? 1 : 0}`;
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
  const seed = hashString(`${fillColor}:${text}`);

  // 1. Fond coloré taillé à la gouge + absorption parchemin (#e2d8c3) + micro-veines de bois
  sCtx.save();
  traceGougeCarvedPolygon(sCtx, cx, cy, qRadius, seed);
  sCtx.fillStyle = fillColor || '#1a1a1a';
  sCtx.fill();
  sCtx.clip();

  sCtx.fillStyle = 'rgba(226, 216, 195, 0.11)';
  sCtx.fillRect(0, 0, logicalSize, logicalSize);

  sCtx.strokeStyle = 'rgba(244, 236, 216, 0.14)';
  sCtx.lineWidth = 0.9;
  sCtx.beginPath();
  sCtx.moveTo(cx - qRadius * 0.75, cy - qRadius * 0.32);
  sCtx.quadraticCurveTo(cx, cy - qRadius * 0.44, cx + qRadius * 0.72, cy - qRadius * 0.25);
  sCtx.moveTo(cx - qRadius * 0.65, cy + qRadius * 0.38);
  sCtx.quadraticCurveTo(cx, cy + qRadius * 0.28, cx + qRadius * 0.68, cy + qRadius * 0.42);
  sCtx.stroke();

  sCtx.strokeStyle = 'rgba(26, 26, 26, 0.10)';
  sCtx.lineWidth = 0.8;
  sCtx.beginPath();
  sCtx.moveTo(cx - qRadius * 0.8, cy + qRadius * 0.05);
  sCtx.quadraticCurveTo(cx, cy - qRadius * 0.06, cx + qRadius * 0.8, cy + qRadius * 0.08);
  sCtx.stroke();
  sCtx.restore();

  // 2. Double filet d'encre noire franc (#1a1a1a) toujours contrasté sur la peau claire #e2d8c3
  traceGougeCarvedPolygon(sCtx, cx, cy, qRadius, seed);
  sCtx.lineWidth = isAccentRing ? 2.2 : 1.6;
  sCtx.strokeStyle = isAccentRing ? '#f59e0b' : '#1a1a1a';
  sCtx.stroke();

  traceGougeCarvedPolygon(sCtx, cx, cy, qRadius * 0.84, seed ^ 0x9e3779b9);
  sCtx.lineWidth = 0.75;
  sCtx.strokeStyle = 'rgba(26, 26, 26, 0.28)';
  sCtx.stroke();

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
