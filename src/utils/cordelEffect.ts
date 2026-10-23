/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Traitement d'image style Cordel (Xilogravura) (< 115 lignes).
 */
import { computeBackgroundMask, computeLuminance, renderCordelPixels } from './cordelSobelKernel';
import { detectSubjectBox, compressRawFrameForArchive } from './cordelFilterHelpers';

export { compressRawFrameForArchive } from './cordelFilterHelpers';

export interface CordelOptions {
  zoom: number; // 50 to 300
  detail: number; // 10 to 150 (conservé pour rétrocompatibilité)
  shadow: number; // 50 to 220 (conservé pour rétrocompatibilité)
  brightness?: number; // -50 to +50
  threshold?: number; // 20 to 220 (Seuil d'encrage, défaut 128)
  sobelContrast?: number; // 0 to 100 %
  bgRemovalMode?: 'none' | 'green' | 'white';
  bgTolerance?: number; // 10 à 90 (défaut : 40)
  woodGrain?: number; // 0 à 100, défaut 10 (intensité du grain bois cordel)
  lockFraming?: boolean; // verrouillage du cadrage pour import par lot (défaut true)
  isMirror: boolean;
  isFrame: boolean;
  posX: number; // -100 to 100
  posY: number; // -100 to 100
}

export const defaultCordelOptions: CordelOptions = {
  zoom: 120, detail: 60, shadow: 128, brightness: 0, threshold: 128,
  sobelContrast: 50, bgRemovalMode: 'none', bgTolerance: 40, woodGrain: 10,
  lockFraming: true, isMirror: true, isFrame: false, posX: 0, posY: 0,
};

export const processCordelEffectBase64 = (base64Img: string, options: CordelOptions, outSize = 200): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { try { resolve(processCordelEffect(img, options, outSize)); } catch (e) { reject(e); } };
    img.onerror = reject;
    img.src = base64Img;
  });

export const processCordelEffect = (img: HTMLImageElement, options: CordelOptions, outSize = 200): string => {
  const isSquare = Math.abs(img.width - img.height) < 2;
  let cx = img.width / 2;
  let cy = img.height / 2;
  let boxSize = Math.min(img.width, img.height);
  const lockFraming = options.lockFraming !== false;

  if (!isSquare && !lockFraming) {
    const detected = detectSubjectBox(img);
    if (detected) {
      boxSize = detected.boxSize;
      cx = detected.cx;
      cy = detected.cy;
    }
  }

  const cropSize = (boxSize * 1.3) / (options.zoom / 100);
  const maxShiftX = Math.max(cropSize / 2, (img.width - cropSize) / 2);
  const maxShiftY = Math.max(cropSize / 2, (img.height - cropSize) / 2);
  const shiftX = (options.isMirror ? 1 : -1) * (options.posX / 100) * maxShiftX;
  const shiftY = -(options.posY / 100) * maxShiftY;
  const sX = cx - cropSize / 2 + shiftX;
  const sY = cy - cropSize / 2 + shiftY;

  const workSize = Math.max(outSize * 2, Math.min(720, Math.max(360, Math.max(img.width, img.height))));
  const tc = document.createElement('canvas');
  tc.width = workSize; tc.height = workSize;
  const tctx = tc.getContext('2d', { willReadFrequently: true });
  if (!tctx) return '';

  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, workSize, workSize);
  if (options.isMirror) { tctx.translate(workSize, 0); tctx.scale(-1, 1); }
  tctx.drawImage(img, sX, sY, cropSize, cropSize, 0, 0, workSize, workSize);

  const imgData = tctx.getImageData(0, 0, workSize, workSize);
  const isBg = computeBackgroundMask(imgData.data, workSize, options.bgRemovalMode ?? 'none', options.bgTolerance ?? 40);
  const gray = computeLuminance(imgData.data, workSize, isBg, options.brightness ?? 0);

  const sobelPct = options.sobelContrast !== undefined ? options.sobelContrast : (options.detail !== undefined ? Math.round((options.detail / 150) * 100) : 55);
  const clampedSobel = Math.min(100, Math.max(0, sobelPct));
  const detailSensibility = clampedSobel === 0 ? 9999 : 400 - (clampedSobel / 100) * 380;
  const inkThreshold = options.threshold !== undefined ? options.threshold : (options.shadow ?? 128);

  const finalImgData = renderCordelPixels(gray, isBg, workSize, outSize, {
    clampedSobel, detailSensibility, inkThreshold, isFrame: options.isFrame, woodGrain: options.woodGrain,
  });

  const wc = document.createElement('canvas');
  wc.width = workSize; wc.height = workSize;
  const wctx = wc.getContext('2d');
  if (!wctx) return '';
  wctx.putImageData(finalImgData, 0, 0);

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = outSize; targetCanvas.height = outSize;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return '';
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';
  targetCtx.drawImage(wc, 0, 0, outSize, outSize);

  return targetCanvas.toDataURL('image/jpeg', 0.85);
};
