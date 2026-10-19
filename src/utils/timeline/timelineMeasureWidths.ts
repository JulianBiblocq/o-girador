/**
 * timelineMeasureWidths.ts
 * Calcul géométrique pur des largeurs et coordonnées horizontales proportionnelles
 * des mesures pour la Timeline (2/4 = 50 %, 3/4 = 75 %, 4/4 = 100 %).
 * Plafond strict : < 100 lignes.
 */

export const getMeasureBeats = (
  measureIdx: number,
  measureTimeSigs?: Record<number, string>,
  defaultTimeSig: string = '4/4'
): number => {
  const sig = measureTimeSigs?.[measureIdx] || defaultTimeSig || '4/4';
  if (sig === '2/4' || sig === '6/8') return 2;
  if (sig === '3/4' || sig === '9/8') return 3;
  if (sig === '12/8') return 4;
  const parsed = parseInt(sig.split('/')[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
};

export const getMeasureWidthFactor = (beats: number): number => {
  return Math.max(0.25, Math.min(2.0, beats / 4));
};

export interface TimelinePositions {
  widths: number[];
  leftPositions: number[];
  totalContentW: number;
}

export const computeTimelinePositions = (
  totalMeasures: number,
  baseMeasureW: number,
  measureTimeSigs?: Record<number, string>,
  defaultTimeSig: string = '4/4'
): TimelinePositions => {
  const count = Math.max(1, totalMeasures);
  const widths = new Array<number>(count);
  const leftPositions = new Array<number>(count);

  let currentLeft = 0;
  for (let m = 0; m < count; m++) {
    const beats = getMeasureBeats(m, measureTimeSigs, defaultTimeSig);
    const factor = getMeasureWidthFactor(beats);
    const w = Math.round(baseMeasureW * factor);
    widths[m] = w;
    leftPositions[m] = currentLeft;
    currentLeft += w;
  }

  return { widths, leftPositions, totalContentW: currentLeft };
};

export const findMeasureIndexAtX = (
  targetX: number,
  leftPositions: number[],
  widths: number[]
): number => {
  const count = leftPositions.length;
  if (count === 0 || targetX <= 0) return 0;
  if (targetX >= (leftPositions[count - 1] + widths[count - 1])) return count - 1;

  // Binary search sur les positions cumulatives
  let low = 0, high = count - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const start = leftPositions[mid];
    const end = start + widths[mid];
    if (targetX >= start && targetX < end) return mid;
    if (targetX < start) high = mid - 1;
    else low = mid + 1;
  }
  return Math.max(0, Math.min(count - 1, low));
};

export const getSectionBounds = (
  startMeasure: number,
  endMeasure: number,
  leftPositions: number[],
  widths: number[]
): { left: number; width: number } => {
  const safeStart = Math.max(0, Math.min(startMeasure, leftPositions.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(endMeasure, widths.length - 1));
  const left = leftPositions[safeStart] ?? 0;
  const endRight = (leftPositions[safeEnd] ?? 0) + (widths[safeEnd] ?? 0);
  return { left, width: Math.max(0, endRight - left) };
};
