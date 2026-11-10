import React, { useRef, useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { getLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getAudioTime } from '../circle-sequencer/circleAudioTime';
import { livePlayheadZoomState } from '../../utils/timeline/timelineZoomUtils';

export interface UsePlayheadFollowerOptions {
  playheadRef: React.RefObject<HTMLDivElement | null>;
  measureHighlightRef: React.RefObject<HTMLDivElement | null>;
  headerWidth: number;
  measureWidth: number;
  measureWidths?: number[];
  measureLeftPositions?: number[];
  isActive?: boolean;
}

export function usePlayheadFollower({
  playheadRef, measureHighlightRef, headerWidth, measureWidth,
  measureWidths, measureLeftPositions, isActive = true,
}: UsePlayheadFollowerOptions) {
  const anchorRef = useRef({ step: -1, measure: 0, ratio: 0, iteration: 1, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: false, isPaused: false });
  const layout = useRef({ vw: 0, lastScrollX: 0 });
  const lastExactXRef = useRef(-1);
  const lastHighlightKeyRef = useRef('');
  const widthsRef = useRef(measureWidths), leftsRef = useRef(measureLeftPositions), measureWRef = useRef(measureWidth);
  widthsRef.current = measureWidths; leftsRef.current = measureLeftPositions; measureWRef.current = measureWidth;

  useEffect(() => {
    livePlayheadZoomState.liveMeasureW = measureWidth;
    if (!isActive || useSequencerStore.getState().isPlaying) return;
    const curM = useSequencerStore.getState().currentMeasure || 0;
    const curLeft = measureLeftPositions?.[curM] ?? (curM * measureWidth);
    const curW = Math.max(1, measureWidths?.[curM] ?? measureWidth);
    const isVis = curLeft >= layout.current.lastScrollX;
    const t = `translate3d(${headerWidth + curLeft}px, 0, 0)`;
    if (playheadRef.current) Object.assign(playheadRef.current.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: t });
    if (measureHighlightRef.current) Object.assign(measureHighlightRef.current.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: `${t} scaleX(${curW})` });
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
    const onScroll = () => {
      layout.current.lastScrollX = scrollEl.scrollLeft;
      if (lastExactXRef.current >= 0 && playheadRef.current) playheadRef.current.style.visibility = lastExactXRef.current >= layout.current.lastScrollX ? 'visible' : 'hidden';
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    const getLiveScale = () => (measureWRef.current > 0 && livePlayheadZoomState.liveMeasureW > 0) ? livePlayheadZoomState.liveMeasureW / measureWRef.current : 1;

    const applyStaticPos = (curM: number, ratioOffset = 0, showHighlight = true) => {
      const scale = getLiveScale();
      const mLeft = (leftsRef.current?.[curM] ?? (curM * measureWRef.current)) * scale;
      const mW = Math.max(1, (widthsRef.current?.[curM] ?? measureWRef.current) * scale);
      const curX = mLeft + ratioOffset * mW;
      lastExactXRef.current = curX;
      livePlayheadZoomState.measure = curM; livePlayheadZoomState.ratio = ratioOffset;
      const isVis = curX >= layout.current.lastScrollX;
      if (playheadRef.current) Object.assign(playheadRef.current.style, { transition: 'none', display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: `translate3d(${headerWidth + curX}px, 0, 0)` });
      if (measureHighlightRef.current) Object.assign(measureHighlightRef.current.style, { transition: 'none', display: showHighlight ? 'block' : 'none', visibility: isVis ? 'visible' : 'hidden', transform: `translate3d(${headerWidth + mLeft}px, 0, 0) scaleX(${mW})` });
      lastHighlightKeyRef.current = `${curM}_${mLeft}_${mW}_${showHighlight}`;
    };

    const lastTick = getLastAudibleTick();
    if (lastTick && useSequencerStore.getState().isPlaying) {
      anchorRef.current = { step: lastTick.step, measure: lastTick.measure, ratio: lastTick.ratio, iteration: lastTick.iteration || 1, time: lastTick.time, measureStartTime: lastTick.measureStartTime || 0, measureDuration: lastTick.measureDuration || 0, isPreRoll: Boolean(lastTick.isPreRoll), isPaused: false };
    } else if (!useSequencerStore.getState().isPlaying) {
      applyStaticPos(useSequencerStore.getState().currentMeasure || 0, 0, true);
    }

    const unsubStore = useSequencerStore.subscribe((state, prev) => {
      if (!state.isPlaying && (state.currentMeasure !== prev.currentMeasure || prev.isPlaying)) { anchorRef.current.step = -1; applyStaticPos(state.currentMeasure, 0, true); }
    });

    const handleTick = (d: any) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, iteration = 1, time = 0, isPaused, isNavigation, measureStartTime, measureDuration, isPreRoll } = d;
      if (livePlayheadZoomState.lastScrollX >= 0) { layout.current.lastScrollX = livePlayheadZoomState.lastScrollX; livePlayheadZoomState.lastScrollX = -1; }
      if (step < 0 || isPreRoll || isPaused) {
        const curM = (isPaused && !isNavigation) ? (useSequencerStore.getState().currentMeasure ?? measure) : measure;
        anchorRef.current = { step: -1, measure: curM, ratio: 0, iteration: 1, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: Boolean(isPreRoll), isPaused: Boolean(isPaused) };
        livePlayheadZoomState.measureDuration = 0;
        applyStaticPos(curM, isPaused && isNavigation ? ratio : 0, Boolean(isPreRoll));
        return;
      }
      const prev = anchorRef.current;
      const isNewM = prev.measure !== measure || prev.iteration !== iteration || prev.step < 0 || !prev.measureStartTime;
      anchorRef.current = { step, measure, ratio, iteration, time, measureStartTime: isNewM ? (measureStartTime || prev.measureStartTime) : prev.measureStartTime, measureDuration: measureDuration ?? prev.measureDuration, isPreRoll: false, isPaused: false };
    };

    let rafId: number | null = null;
    const renderRaf = () => {
      const a = anchorRef.current, el = playheadRef.current;
      if (el && a.step >= 0 && !a.isPreRoll && !a.isPaused && useSequencerStore.getState().isPlaying) {
        if (livePlayheadZoomState.lastScrollX >= 0) { layout.current.lastScrollX = livePlayheadZoomState.lastScrollX; livePlayheadZoomState.lastScrollX = -1; }
        const nowAudio = getAudioTime();
        let progress = a.ratio;
        if (a.measureDuration > 0 && a.measureStartTime > 0 && (nowAudio - a.time) >= -0.05 && (nowAudio - a.time) <= 0.25) {
          progress = Math.max(0, Math.min(1, (nowAudio - a.measureStartTime) / a.measureDuration));
        }
        const scale = getLiveScale();
        const mLeft = (leftsRef.current?.[a.measure] ?? (a.measure * measureWRef.current)) * scale;
        const mW = Math.max(1, (widthsRef.current?.[a.measure] ?? measureWRef.current) * scale);
        const exactX = mLeft + progress * mW, prevExactX = lastExactXRef.current;
        lastExactXRef.current = exactX;
        Object.assign(livePlayheadZoomState, { measure: a.measure, ratio: progress, measureDuration: a.measureDuration, lastTickPerfMs: performance.now() });
        const isVis = exactX >= layout.current.lastScrollX;
        el.style.display = 'block'; el.style.visibility = isVis ? 'visible' : 'hidden';
        el.style.transform = `translate3d(${headerWidth + exactX}px, 0, 0)`;
        const hKey = `${a.measure}_${mLeft}_${mW}_${isVis}`;
        if (measureHighlightRef.current && lastHighlightKeyRef.current !== hKey) {
          lastHighlightKeyRef.current = hKey;
          Object.assign(measureHighlightRef.current.style, { display: 'block', visibility: isVis ? 'visible' : 'hidden', transform: `translate3d(${headerWidth + mLeft}px, 0, 0) scaleX(${mW})` });
        }
        const dx = prevExactX >= 0 ? exactX - prevExactX : 0;
        if (!livePlayheadZoomState.isZooming && layout.current.vw > 0) {
          const isRupture = dx < -2 || Math.abs(dx) > mW * 0.5;
          const target = isRupture ? Math.max(0, exactX - layout.current.vw * 0.1) : (exactX > layout.current.lastScrollX + layout.current.vw - (mW * 1.2) || exactX < layout.current.lastScrollX) ? Math.max(0, exactX - layout.current.vw * 0.15) : null;
          if (target !== null) { scrollEl.scrollLeft = target; layout.current.lastScrollX = target; }
        }
      }
      rafId = requestAnimationFrame(renderRaf);
    };

    subscribeToTick(handleTick);
    rafId = requestAnimationFrame(renderRaf);
    return () => { if (rafId !== null) cancelAnimationFrame(rafId); unsubStore(); unsubscribeFromTick(handleTick); ro.disconnect(); scrollEl.removeEventListener('scroll', onScroll); };
  }, [headerWidth, isActive, playheadRef, measureHighlightRef]);
}
