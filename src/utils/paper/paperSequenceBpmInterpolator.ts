/**
 * Interpolation mathématique des BPMs et signatures de la séquence papier (< 100 lignes).
 */
import { PaperSequenceItem, PatternMetricOverride } from '../../types/paperWorkshop.types';

export interface InterpolatedSequenceResult {
  measureBpms: number[];
  measureBpmTransitions: string[];
}

export function resolveNextSectionBpm(
  items: PaperSequenceItem[],
  idx: number,
  globalBpm: number
): number {
  const item = items[idx];
  const nextItem = items[idx + 1];
  if (nextItem) {
    return nextItem.customBpm && nextItem.customBpm > 0 ? nextItem.customBpm : globalBpm;
  }
  return item?.targetBpmOverride && item.targetBpmOverride > 0
    ? item.targetBpmOverride
    : (item?.customBpm && item.customBpm > 0 ? item.customBpm : globalBpm);
}

export function interpolateSequenceBpms(
  sequenceItems: PaperSequenceItem[],
  globalBpm: number,
  totalMeasures: number
): InterpolatedSequenceResult {
  const measureBpms: number[] = Array(totalMeasures).fill(globalBpm);
  const measureBpmTransitions: string[] = Array(totalMeasures).fill('immediate');

  if (!sequenceItems || sequenceItems.length === 0) {
    return { measureBpms, measureBpmTransitions };
  }

  let mStart = 0;

  for (let i = 0; i < sequenceItems.length; i++) {
    const item = sequenceItems[i];
    const n = Math.max(1, item.repeatCount || 1);
    const startBpm = item.customBpm && item.customBpm > 0 ? item.customBpm : globalBpm;
    const nextItem = sequenceItems[i + 1];
    const nextBpm = nextItem
      ? (nextItem.customBpm && nextItem.customBpm > 0 ? nextItem.customBpm : globalBpm)
      : (item.targetBpmOverride && item.targetBpmOverride > 0 ? item.targetBpmOverride : startBpm);

    for (let k = 0; k < n; k++) {
      const mIdx = mStart + k;
      if (mIdx >= totalMeasures) break;

      if (!item.tempoRamp) {
        measureBpms[mIdx] = startBpm;
        measureBpmTransitions[mIdx] = 'immediate';
      } else {
        const bpmVal = n === 1
          ? Math.round((startBpm + nextBpm) / 2)
          : Math.round(startBpm + (k / n) * (nextBpm - startBpm));
        measureBpms[mIdx] = bpmVal;
        measureBpmTransitions[mIdx] = 'linear';
      }
    }

    mStart += n;
    if (mStart >= totalMeasures) break;
  }

  // Si des mesures résiduelles existent au-delà de la somme des repeats
  if (mStart < totalMeasures) {
    const lastBpm = measureBpms[Math.max(0, mStart - 1)] || globalBpm;
    for (let m = mStart; m < totalMeasures; m++) {
      measureBpms[m] = lastBpm;
      measureBpmTransitions[m] = 'immediate';
    }
  }

  return { measureBpms, measureBpmTransitions };
}

export function resolvePatternTimeSignatures(
  sequence: string[],
  patterns: Record<string, any>,
  metricOverrides?: Record<string, PatternMetricOverride>,
  globalTimeSig = '4/4'
): string[] {
  return sequence.map((secName) => {
    if (metricOverrides?.[secName]?.timeSignature) {
      return metricOverrides[secName].timeSignature!;
    }
    const secMap = patterns?.[secName];
    if (secMap && typeof secMap === 'object') {
      const lengths = Object.values(secMap).filter(Array.isArray).map((arr) => (arr as any[]).length);
      if (lengths.length > 0) {
        const maxLen = Math.max(...lengths);
        if (maxLen === 8) return '2/4';
        if (maxLen === 6) return '6/8';
        if (maxLen === 12) return '12/8';
      }
    }
    return globalTimeSig;
  });
}
