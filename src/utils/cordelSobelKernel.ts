/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function computeBackgroundMask(
  data: Uint8ClampedArray,
  workSize: number,
  mode: 'none' | 'green' | 'white' = 'none',
  tolerance: number = 40
): Uint8Array {
  const isBackground = new Uint8Array(workSize * workSize);
  if (mode === 'none') return isBackground;

  const totalPixels = workSize * workSize;
  const factor = 1.75 - (tolerance / 100) * 0.65;
  const minGreen = Math.max(30, 75 - tolerance * 0.5);
  const whiteThreshold = 255 - tolerance * 1.5;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    if (mode === 'green') {
      if (g > minGreen && g > r * factor && g > b * factor) {
        isBackground[i] = 1;
      }
    } else if (mode === 'white') {
      if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
        isBackground[i] = 1;
      }
    }
  }
  return isBackground;
}

export function computeLuminance(
  data: Uint8ClampedArray,
  workSize: number,
  isBg: Uint8Array,
  brightness: number = 0
): Float32Array {
  const total = workSize * workSize;
  const gray = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    if (isBg[i] === 1) {
      gray[i] = 255;
    } else {
      const idx = i * 4;
      const r = Math.min(255, Math.max(0, data[idx] + brightness));
      const g = Math.min(255, Math.max(0, data[idx + 1] + brightness));
      const b = Math.min(255, Math.max(0, data[idx + 2] + brightness));
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }
  return gray;
}

export function renderCordelPixels(
  gray: Float32Array,
  isBg: Uint8Array,
  workSize: number,
  outSize: number,
  options: {
    clampedSobel: number;
    detailSensibility: number;
    inkThreshold: number;
    isFrame?: boolean;
    woodGrain?: number;
  }
): ImageData {
  const finalImgData = new ImageData(workSize, workSize);
  const fData = finalImgData.data;
  const frameBorder = Math.round(15 * (workSize / outSize));
  const grainFactor = (options.woodGrain ?? 10) / 100;

  for (let y = 0; y < workSize; y++) {
    for (let x = 0; x < workSize; x++) {
      const i = y * workSize + x;
      const outIdx = i * 4;
      let isInk = false;

      if (isBg[i] === 0) {
        const lum = gray[i];
        if (y > 0 && y < workSize - 1 && x > 0 && x < workSize - 1) {
          const tl = gray[i - workSize - 1], tc = gray[i - workSize], tr = gray[i - workSize + 1];
          const ml = gray[i - 1], mr = gray[i + 1];
          const bl = gray[i + workSize - 1], bc = gray[i + workSize], br = gray[i + workSize + 1];
          const dx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
          const dy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
          const edge = Math.sqrt(dx * dx + dy * dy);

          if (options.clampedSobel > 0 && edge > options.detailSensibility && lum < 248) {
            isInk = true;
          }
        }

        if (!isInk) {
          const normX = (x / workSize) * outSize;
          const normY = (y / workSize) * outSize;
          const groove = (Math.sin((normX - normY) * 0.4) * 15 + Math.sin(normY * 0.1) * 5) * grainFactor;
          const noise = ((Math.random() * 30) - 15) * grainFactor;
          if (lum + groove + noise < options.inkThreshold) {
            isInk = true;
          }
        }
      }

      if (options.isFrame && (x < frameBorder || x > workSize - 1 - frameBorder || y < frameBorder || y > workSize - 1 - frameBorder)) {
        isInk = Math.random() <= 0.8;
      }

      const col = isInk ? 25 : 232;
      fData[outIdx] = col;
      fData[outIdx + 1] = isInk ? 25 : 220;
      fData[outIdx + 2] = isInk ? 25 : 196;
      fData[outIdx + 3] = 255;
    }
  }
  return finalImgData;
}
