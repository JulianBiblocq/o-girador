import React, { useRef, useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePerformanceStore } from '../../stores/usePerformanceStore';

export interface UsePlayheadFollowerOptions {
  playheadRef: React.RefObject<HTMLDivElement | null>;
  measureHighlightRef: React.RefObject<HTMLDivElement | null>;
  headerWidth: number; measureWidth: number;
  measureWidths?: number[]; measureLeftPositions?: number[]; isActive?: boolean;
}

export function usePlayheadFollower({
  playheadRef, measureHighlightRef, headerWidth, measureWidth,
  measureWidths, measureLeftPositions, isActive = true,
}: UsePlayheadFollowerOptions) {
  const live = useRef({ step: -1, measure: 0, ratio: 0, iteration: 1, measureStartTime: 0, measureDuration: 0 });
  const layout = useRef({ vw: 0, lastScrollX: 0 });
  const lastExactXRef = useRef(-1);
  const widthsRef = useRef(measureWidths), leftsRef = useRef(measureLeftPositions), measureWRef = useRef(measureWidth);
  widthsRef.current = measureWidths; leftsRef.current = measureLeftPositions; measureWRef.current = measureWidth;

  useEffect(() => {
    if (!isActive) return;
    const scrollEl = document.getElementById('timeline-scroll-container');
    if (!scrollEl) return;
    scrollEl.style.scrollBehavior = 'auto';
    layout.current.vw = scrollEl.clientWidth - headerWidth;
    layout.current.lastScrollX = scrollEl.scrollLeft;

    const ro = new ResizeObserver(entries => { if (entries[0]) layout.current.vw = entries[0].contentRect.width - headerWidth; });
    ro.observe(scrollEl);
    const onScroll = () => { layout.current.lastScrollX = scrollEl.scrollLeft; };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    const applyPos = (curM: number) => {
      const curLeft = leftsRef.current?.[curM] ?? (curM * measureWRef.current);
      const t = `translate3d(${headerWidth + curLeft}px, 0, 0)`;
      if (playheadRef.current) Object.assign(playheadRef.current.style, { transition: 'none', display: 'block', transform: t });
      if (measureHighlightRef.current) Object.assign(measureHighlightRef.current.style, { transition: 'none', display: 'block', transform: t, width: `${widthsRef.current?.[curM] ?? measureWRef.current}px` });
    };

    if (!useSequencerStore.getState().isPlaying) applyPos(useSequencerStore.getState().currentMeasure || 0);

    const unsubStore = useSequencerStore.subscribe((state, prev) => {
      if (!state.isPlaying && (state.currentMeasure !== prev.currentMeasure || prev.isPlaying)) applyPos(state.currentMeasure);
    });

    const handleTick = (d: any) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, iteration = 1, isPaused, isNavigation, measureStartTime, measureDuration, isPreRoll } = d;
      const el = playheadRef.current;
      if (!el) return;
      const mLeft = leftsRef.current?.[measure] ?? (measure * measureWRef.current);
      const mW = widthsRef.current?.[measure] ?? measureWRef.current;

      if (step < 0 || isPreRoll || isPaused) {
        const curM = (isPaused && !isNavigation) ? (useSequencerStore.getState().currentMeasure ?? measure) : measure;
        const curX = isPaused && isNavigation ? mLeft + ratio * mW : (leftsRef.current?.[curM] ?? (curM * measureWRef.current));
        lastExactXRef.current = curX;
        const t = `translate3d(${headerWidth + curX}px, 0, 0)`;
        Object.assign(el.style, { transition: 'none', display: 'block', transform: t });
        if (measureHighlightRef.current) Object.assign(measureHighlightRef.current.style, { display: isPreRoll ? 'block' : 'none', transform: t, width: `${mW}px` });
        return;
      }

      el.style.display = 'block';
      if (measureHighlightRef.current) {
        measureHighlightRef.current.style.display = 'block';
        measureHighlightRef.current.style.transform = `translate3d(${headerWidth + mLeft}px, 0, 0)`;
        measureHighlightRef.current.style.width = `${mW}px`;
      }

      const exactX = mLeft + ratio * mW;
      const isNewM = live.current.measure !== measure || live.current.iteration !== iteration || live.current.step < 0;
      live.current = { step, measure, ratio, iteration, measureStartTime: isNewM ? (measureStartTime || live.current.measureStartTime) : live.current.measureStartTime, measureDuration: measureDuration ?? live.current.measureDuration };
      const dx = exactX - lastExactXRef.current;
      lastExactXRef.current = exactX;

      if (layout.current.vw > 0 && scrollEl) {
        const isRupture = dx < 0 || Math.abs(dx) > mW * 0.5;
        const target = isRupture ? Math.max(0, exactX - layout.current.vw * 0.1) : (exactX > layout.current.lastScrollX + layout.current.vw - (mW * 1.2) || exactX < layout.current.lastScrollX) ? Math.max(0, exactX - layout.current.vw * 0.15) : null;
        if (target !== null) { scrollEl.scrollLeft = target; layout.current.lastScrollX = target; }
      }

      if (usePerformanceStore.getState().disablePlayheadRAF) {
        el.style.transition = 'none'; el.style.transform = `translate3d(${headerWidth + exactX}px, 0, 0)`;
      } else if (isNewM && measureDuration && measureDuration > 0) {
        el.style.transition = 'none'; el.style.transform = `translate3d(${headerWidth + exactX}px, 0, 0)`;
        requestAnimationFrame(() => {
          if (playheadRef.current) {
            playheadRef.current.style.transition = `transform ${Math.max(0.1, (1 - ratio) * measureDuration)}s linear`;
            playheadRef.current.style.transform = `translate3d(${headerWidth + mLeft + mW}px, 0, 0)`;
          }
        });
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubStore(); unsubscribeFromTick(handleTick); ro.disconnect();
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [headerWidth, isActive, playheadRef, measureHighlightRef]);
}
