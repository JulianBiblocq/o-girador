/**
 * Prétraitement doux des photos de partition papier (< 130 lignes).
 * Redimensionnement (max 1600px), rotation 90°, rognage et auto-levels 2%-98%.
 */

export interface NormalizedCropRect {
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
}

export function applyAutoLevels(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const hist = new Uint32Array(256);
  const totalPixels = width * height;

  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[lum]++;
  }

  const p2Target = totalPixels * 0.02;
  const p98Target = totalPixels * 0.98;
  let p2 = 0;
  let p98 = 255;
  let accum = 0;

  for (let i = 0; i < 256; i++) {
    accum += hist[i];
    if (p2 === 0 && accum >= p2Target) p2 = i;
    if (accum >= p98Target) {
      p98 = i;
      break;
    }
  }

  // Sécurité pour éviter d'amplifier le bruit numérique
  if (p98 - p2 < 15) return;

  const range = p98 - p2;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      const stretched = Math.min(255, Math.max(0, Math.round(((v - p2) * 255) / range)));
      data[i + c] = stretched;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

export async function preprocessPaperImage(
  imageSource: string | HTMLImageElement,
  cropRect?: NormalizedCropRect,
  rotationDegrees: number = 0
): Promise<string> {
  const img = await resolveImageElement(imageSource);
  const isRotated90or270 = rotationDegrees % 180 !== 0;
  const origW = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
  const origH = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

  // 1. Calcul du rectangle source rogné dans l'image orientée
  const rx = cropRect ? Math.max(0, Math.min(1, cropRect.x)) : 0;
  const ry = cropRect ? Math.max(0, Math.min(1, cropRect.y)) : 0;
  const rw = cropRect ? Math.max(0.05, Math.min(1 - rx, cropRect.width)) : 1;
  const rh = cropRect ? Math.max(0.05, Math.min(1 - ry, cropRect.height)) : 1;

  const cropPixelW = origW * rw;
  const cropPixelH = origH * rh;

  // 2. Redimensionnement max 1600px sur le grand côté
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(cropPixelW, cropPixelH));
  const finalW = Math.max(1, Math.round(cropPixelW * scale));
  const finalH = Math.max(1, Math.round(cropPixelH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible de créer le contexte canvas 2D');

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-origW * rx, -origH * ry);

  // Appliquer la rotation
  if (rotationDegrees % 360 !== 0) {
    if (rotationDegrees % 360 === 90) {
      ctx.translate(origW, 0);
      ctx.rotate((90 * Math.PI) / 180);
    } else if (rotationDegrees % 360 === 180) {
      ctx.translate(origW, origH);
      ctx.rotate((180 * Math.PI) / 180);
    } else if (rotationDegrees % 360 === 270) {
      ctx.translate(0, origH);
      ctx.rotate((270 * Math.PI) / 180);
    }
  }

  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // 3. Normalisation douce des niveaux sans curseur manuel
  applyAutoLevels(ctx, finalW, finalH);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function resolveImageElement(src: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (typeof src !== 'string') return Promise.resolve(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
