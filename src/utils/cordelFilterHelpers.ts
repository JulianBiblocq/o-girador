/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Fonctions auxiliaires pour les filtres et compression d'images Cordel (< 60 lignes).
 */

export const compressRawFrameForArchive = (base64Img: string, maxDim = 360, quality = 0.6): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      if (!ctx) return resolve(base64Img);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Img);
    img.src = base64Img;
  });

export function detectSubjectBox(img: HTMLImageElement): { boxSize: number; cx: number; cy: number } | null {
  const sc = document.createElement('canvas');
  const scale = 100 / Math.max(img.width, img.height);
  sc.width = img.width * scale;
  sc.height = img.height * scale;
  const sctx = sc.getContext('2d');
  if (!sctx) return null;

  sctx.drawImage(img, 0, 0, sc.width, sc.height);
  const sData = sctx.getImageData(0, 0, sc.width, sc.height).data;
  let bgSum = 0;
  const corners = [0, sc.width - 1, (sc.height - 1) * sc.width, (sc.height - 1) * sc.width + sc.width - 1];
  corners.forEach((idx) => {
    const j = idx * 4;
    bgSum += 0.299 * sData[j] + 0.587 * sData[j + 1] + 0.114 * sData[j + 2];
  });
  const thresholdVal = bgSum / 4 - 20;
  let minX = sc.width, maxX = 0, minY = sc.height, maxY = 0;
  for (let y = 0; y < sc.height; y++) {
    for (let x = 0; x < sc.width; x++) {
      const idx = (y * sc.width + x) * 4;
      const lum = 0.299 * sData[idx] + 0.587 * sData[idx + 1] + 0.114 * sData[idx + 2];
      if (lum < thresholdVal) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  minX /= scale; maxX /= scale; minY /= scale; maxY /= scale;
  if (minX <= maxX && minY <= maxY && Math.max(maxX - minX, maxY - minY) > 0) {
    return {
      boxSize: Math.max(maxX - minX, maxY - minY),
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }
  return null;
}
