
import { useState, useRef, useEffect } from 'react';

export function useRodaMeasureNavigationState(currentMeasure: number) {
  const [pendingTargetMeasure, setPendingTargetMeasure] = useState<number | null>(null);
  const pendingTargetMeasureRef = useRef<number | null>(null);
  const [pendingTargetExpandedIndex, setPendingTargetExpandedIndex] = useState<number | null>(null);
  const pendingTargetExpandedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setPendingTargetMeasure(null);
    pendingTargetMeasureRef.current = null;
    setPendingTargetExpandedIndex(null);
    pendingTargetExpandedIndexRef.current = null;
  }, [currentMeasure]);

  return {
    pendingTargetMeasure,
    setPendingTargetMeasure,
    pendingTargetMeasureRef,
    pendingTargetExpandedIndex,
    setPendingTargetExpandedIndex,
    pendingTargetExpandedIndexRef,
  };
}
