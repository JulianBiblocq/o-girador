import { useEffect } from 'react';
import { TimeSignature, SongSection } from '../../types';
import { getExpandedMeasures } from '../../utils/measureHelpers';

export interface MeasureSyncEffectsProps {
  totalMeasuresRef: { current: number };
  timeSig: TimeSignature;
  bpm: number;
  totalMeasures: number;
  songSections: SongSection[];
  measureSignals: (string | null)[];
  lastExpandedRef: { current: { baseMeasure: number; iteration: number }[] };
  pendingStructureActionRef: { current: { type: 'insert' | 'delete'; measureIdx: number } | null };
  setMeasureTimeSigs: (updater: (prev: TimeSignature[]) => TimeSignature[]) => void;
  setMeasureBpms: (updater: (prev: number[]) => number[]) => void;
  setMeasureBpmTransitions: (updater: (prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[]) => void;
  setMeasureVols: (updater: (prev: number[]) => number[]) => void;
  setMeasureVolTransitions: (updater: (prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[]) => void;
  setMeasureSignals: (updater: (prev: (string | null)[]) => (string | null)[]) => void;
}

export function useMeasureSyncEffects({
  totalMeasuresRef, timeSig, bpm, totalMeasures, songSections, measureSignals,
  lastExpandedRef, pendingStructureActionRef, setMeasureTimeSigs, setMeasureBpms,
  setMeasureBpmTransitions, setMeasureVols, setMeasureVolTransitions, setMeasureSignals
}: MeasureSyncEffectsProps): void {
  useEffect(() => {
    const total = totalMeasuresRef.current;
    setMeasureTimeSigs((prev: TimeSignature[]) => {
      const arr = [...prev];
      if (arr.length === total) return prev;
      while (arr.length < total) arr.push(timeSig);
      if (arr.length > total) arr.length = total;
      return arr;
    });

    setMeasureBpms((prev: number[]) => {
      const arr = [...prev];
      if (arr.length === total) return prev;
      while (arr.length < total) arr.push(bpm);
      if (arr.length > total) arr.length = total;
      return arr;
    });

    setMeasureBpmTransitions((prev: ('immediate' | 'ramp' | 'bezier')[]) => {
      const arr = [...prev];
      if (arr.length === total) return prev;
      while (arr.length < total) arr.push('immediate');
      if (arr.length > total) arr.length = total;
      return arr;
    });

    setMeasureVols((prev: number[]) => {
      const arr = [...prev];
      if (arr.length === total) return prev;
      while (arr.length < total) arr.push(100);
      if (arr.length > total) arr.length = total;
      return arr;
    });

    setMeasureVolTransitions((prev: ('immediate' | 'ramp' | 'bezier')[]) => {
      const arr = [...prev];
      if (arr.length === total) return prev;
      while (arr.length < total) arr.push('immediate');
      if (arr.length > total) arr.length = total;
      return arr;
    });
  }, [timeSig, bpm, setMeasureTimeSigs, setMeasureBpms, setMeasureBpmTransitions, setMeasureVols, setMeasureVolTransitions, totalMeasuresRef]);

  useEffect(() => {
    const expanded = getExpandedMeasures(totalMeasures, songSections);
    const prevExpanded = lastExpandedRef.current;
    const action = pendingStructureActionRef.current;
    pendingStructureActionRef.current = null;

    let adjustedPrev = prevExpanded;
    if (action) {
      if (action.type === 'insert') {
        adjustedPrev = prevExpanded.map((item) => item.baseMeasure >= action.measureIdx ? { ...item, baseMeasure: item.baseMeasure + 1 } : item);
      } else if (action.type === 'delete') {
        adjustedPrev = prevExpanded.filter((item) => item.baseMeasure !== action.measureIdx).map((item) => item.baseMeasure > action.measureIdx ? { ...item, baseMeasure: item.baseMeasure - 1 } : item);
      }
    }
    lastExpandedRef.current = expanded;

    if (measureSignals.length !== expanded.length) {
      setMeasureSignals((prev: (string | null)[]) => expanded.map((item) => {
        if (adjustedPrev.length === 0 || prev.length !== adjustedPrev.length) {
          if (item.iteration === 1 && item.baseMeasure < prev.length) return prev[item.baseMeasure];
          return null;
        }
        const oldIdx = adjustedPrev.findIndex((oldItem) => oldItem.baseMeasure === item.baseMeasure && oldItem.iteration === item.iteration);
        return oldIdx !== -1 ? prev[oldIdx] : null;
      }));
    }
  }, [totalMeasures, songSections, measureSignals, setMeasureSignals, lastExpandedRef, pendingStructureActionRef]);
}
