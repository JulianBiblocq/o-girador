import React, { useRef, useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import { livePlayheadZoomState } from '../../utils/timeline/timelineZoomUtils';

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
    livePlayheadZoomState.liveMeasureW = measureWidth;
    if (!isActive || useSequencerStore.getState().isPlaying) return;
    const scrollEl = document.getElementById('timeline-scroll-container');
    if (!scrollEl) return;
    const curM = useSequencerStore.getState().currentMeasure || 0;
    const curLeft = measureLeftPositions?.[curM] ?? (curM * measureWidth);
    const curW = measureWidths?.[curM] ?? measureWidth;
    const isVis = curLeft >= scrollEl.scrollLeft;
    const t = `translate3d(${headerWidth + curLeft}px, 0, 0)`;
    if (playheadRef.current) Object.assign(playheadRef.current.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: t });
    if (measureHighlightRef.current) Object.assign(measureHighlightRef.current.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: t, width: `${curW}px` });
  }, [measureWidth, measureWidths, measureLeftPositions, headerWidth, isActive, playheadRef, measureHighlightRef]);

  useEffect(() => {
    if (!isActive) return;
    const scrollEl = document.getElementById('timeline-scroll-container');
    if (!scrollEl) return;
    scrollEl.style.scrollBehavior = 'auto';
    layout.current.vw = scrollEl.clientWidth - headerWidth;
    layout.current.lastScrollX = scrollEl.scrollLeft;

    const ro = new ResizeObserver(entries => { if (entries[0]) layout.current.vw = entries[0].contentRect.width - headerWidth; });
    ro.observe(scrollEl);
    const checkPlayheadVisibility = (currentX: number) => {
      if (playheadRef.current) playheadRef.current.style.visibility = currentX >= scrollEl.scrollLeft ? 'visible' : 'hidden';
    };
    const onScroll = () => {
      layout.current.lastScrollX = scrollEl.scrollLeft;
      if (lastExactXRef.current >= 0) checkPlayheadVisibility(lastExactXRef.current);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    const getLiveScale = () => (measureWRef.current > 0 && livePlayheadZoomState.liveMeasureW > 0) ? livePlayheadZoomState.liveMeasureW / measureWRef.current : 1;

    const applyPos = (curM: number) => {
      const scale = getLiveScale();
      const curLeft = (leftsRef.current?.[curM] ?? (curM * measureWRef.current)) * scale;
      const curW = (widthsRef.current?.[curM] ?? measureWRef.current) * scale;
      lastExactXRef.current = curLeft;
      livePlayheadZoomState.measure = curM; livePlayheadZoomState.ratio = 0;
      const isVis = curLeft >= scrollEl.scrollLeft;
      const t = `translate3d(${headerWidth + curLeft}px, 0, 0)`;
      if (playheadRef.current) Object.assign(playheadRef.current.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: t });
      if (measureHighlightRef.current) Object.assign(measureHighlightRef.current.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: t, width: `${curW}px` });
    };

    if (!useSequencerStore.getState().isPlaying) applyPos(useSequencerStore.getState().currentMeasure || 0);

    const unsubStore = useSequencerStore.subscribe((state, prev) => {
      if (!state.isPlaying && (state.currentMeasure !== prev.currentMeasure || prev.isPlaying)) applyPos(state.currentMeasure);
    });

    const handleTick = (d: any) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, iteration = 1, isPaused, isNavigation, measureStartTime, measureDuration, isPreRoll } = d;
      const el = playheadRef.current;
      if (!el) return;
      if (livePlayheadZoomState.lastScrollX >= 0) {
        layout.current.lastScrollX = livePlayheadZoomState.lastScrollX;
        livePlayheadZoomState.lastScrollX = -1;
      }
      const scale = getLiveScale();
      const mLeft = (leftsRef.current?.[measure] ?? (measure * measureWRef.current)) * scale;
      const mW = (widthsRef.current?.[measure] ?? measureWRef.current) * scale;

      if (step < 0 || isPreRoll || isPaused) {
        const curM = (isPaused && !isNavigation) ? (useSequencerStore.getState().currentMeasure ?? measure) : measure;
        live.current = { step: -1, measure: curM, ratio: 0, iteration: 1, measureStartTime: 0, measureDuration: 0 };
        livePlayheadZoomState.measure = curM; livePlayheadZoomState.ratio = 0; livePlayheadZoomState.measureDuration = 0;
        const curX = isPaused && isNavigation ? mLeft + ratio * mW : (leftsRef.current?.[curM] ?? (curM * measureWRef.current)) * scale;
        lastExactXRef.current = curX;
        const isVis = curX >= scrollEl.scrollLeft;
        const t = `translate3d(${headerWidth + curX}px, 0, 0)`;
        Object.assign(el.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: t });
        if (measureHighlightRef.current) Object.assign(measureHighlightRef.current.style, { display: isPreRoll ? 'block' : 'none', visibility: isVis ? 'visible' : 'hidden', transform: t, width: `${mW}px` });
        return;
      }

      const exactX = mLeft + ratio * mW;
      const prevExactX = lastExactXRef.current;
      lastExactXRef.current = exactX;
      Object.assign(livePlayheadZoomState, { measure, ratio, measureDuration: measureDuration ?? live.current.measureDuration, lastTickPerfMs: performance.now() });

      const isVis = exactX >= scrollEl.scrollLeft;
      Object.assign(el.style, { display: 'block', visibility: isVis ? 'visible' : 'hidden' });
      if (measureHighlightRef.current) {
        Object.assign(measureHighlightRef.current.style, { display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: `translate3d(${headerWidth + mLeft}px, 0, 0)`, width: `${mW}px` });
      }
      const isNewM = live.current.measure !== measure || live.current.iteration !== iteration || live.current.step < 0 || !live.current.measureStartTime;
      live.current = { step, measure, ratio, iteration, measureStartTime: isNewM ? (measureStartTime || live.current.measureStartTime) : live.current.measureStartTime, measureDuration: measureDuration ?? live.current.measureDuration };
      const dx = prevExactX >= 0 ? exactX - prevExactX : 0;

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
