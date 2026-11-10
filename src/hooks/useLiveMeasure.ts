import { useState, useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { subscribeToTick, unsubscribeFromTick, getLiveOrStoreMeasure, getLiveOrStoreLoopIteration } from '../audio/visualTickBuffer';

export function useLiveMeasure(isActive = true): number {
  const storeMeasure = useSequencerStore((s) => s.currentMeasure);
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const [liveMeasure, setLiveMeasure] = useState<number>(() => getLiveOrStoreMeasure(storeMeasure));
  const lastMeasureRef = useRef<number>(liveMeasure);

  useEffect(() => {
    if (!isPlaying) {
      lastMeasureRef.current = storeMeasure;
      setLiveMeasure(storeMeasure);
    }
  }, [isPlaying, storeMeasure]);

  useEffect(() => {
    if (!isActive || !isPlaying) return;
    const initial = getLiveOrStoreMeasure(useSequencerStore.getState().currentMeasure);
    lastMeasureRef.current = initial;
    setLiveMeasure(initial);

    const handleTick = (evt: any) => {
      if (!evt || evt.step < 0 || evt.isPreRoll) return;
      const m = typeof evt.measure === 'number' ? evt.measure : 0;
      if (m !== lastMeasureRef.current) {
        lastMeasureRef.current = m;
        setLiveMeasure(m);
      }
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [isActive, isPlaying]);

  return isPlaying && isActive ? liveMeasure : storeMeasure;
}

export function useLiveLoopIteration(isActive = true): number {
  const storeIter = useSequencerStore((s) => s.currentLoopIteration ?? 1);
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const [liveIter, setLiveIter] = useState<number>(() => getLiveOrStoreLoopIteration(storeIter));
  const lastIterRef = useRef<number>(liveIter);

  useEffect(() => {
    if (!isPlaying) {
      lastIterRef.current = storeIter;
      setLiveIter(storeIter);
    }
  }, [isPlaying, storeIter]);

  useEffect(() => {
    if (!isActive || !isPlaying) return;
    const initial = getLiveOrStoreLoopIteration(useSequencerStore.getState().currentLoopIteration ?? 1);
    lastIterRef.current = initial;
    setLiveIter(initial);

    const handleTick = (evt: any) => {
      if (!evt || evt.step < 0 || evt.isPreRoll) return;
      const iter = typeof evt.loopIteration === 'number' ? evt.loopIteration : 1;
      if (iter !== lastIterRef.current) {
        lastIterRef.current = iter;
        setLiveIter(iter);
      }
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [isActive, isPlaying]);

  return isPlaying && isActive ? liveIter : storeIter;
}

