import { useState, useEffect, useRef, useCallback } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getLastAudibleTick, getLiveOrStoreMeasure, subscribeToTick, unsubscribeFromTick } from '../audio/visualTickBuffer';
import { SongSection } from '../types';

/**
 * Suit l'index de macro-section active avec `0` re-render intra-section pendant la lecture.
 */
export function useLiveSectionIndex(sections: SongSection[], isActive = true): {
  activeSecIdx: number;
  activeSecIdxRef: React.MutableRefObject<number>;
} {
  const storeMeasure = useSequencerStore((s) => s.currentMeasure);
  const isPlaying = useSequencerStore((s) => s.isPlaying);

  const findSecIdx = useCallback((m: number) => {
    const idx = sections.findIndex((s) => m >= s.startMeasure && m <= s.endMeasure);
    return idx >= 0 ? idx : 0;
  }, [sections]);

  const [activeSecIdx, setActiveSecIdx] = useState<number>(() => findSecIdx(getLiveOrStoreMeasure(storeMeasure)));
  const activeSecIdxRef = useRef(activeSecIdx);
  activeSecIdxRef.current = activeSecIdx;

  useEffect(() => {
    if (!isPlaying) {
      const next = findSecIdx(storeMeasure);
      activeSecIdxRef.current = next;
      setActiveSecIdx(next);
    }
  }, [isPlaying, storeMeasure, findSecIdx]);

  useEffect(() => {
    if (!isActive || !isPlaying || sections.length === 0) return;
    const sync = (m: number) => {
      const next = findSecIdx(m);
      if (next !== activeSecIdxRef.current) {
        activeSecIdxRef.current = next;
        setActiveSecIdx(next);
      }
    };
    const last = getLastAudibleTick();
    if (last && last.step >= 0 && !last.isPreRoll) sync(last.measure);
    const onTick = (evt: any) => {
      if (evt && evt.step >= 0 && !evt.isPreRoll) sync(evt.measure ?? 0);
    };
    subscribeToTick(onTick);
    return () => unsubscribeFromTick(onTick);
  }, [isActive, isPlaying, sections, findSecIdx]);

  return { activeSecIdx, activeSecIdxRef };
}
