import React, { useEffect, useRef, useContext } from 'react';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';

import { usePerformanceStore } from '../stores/usePerformanceStore';

const TimelinePlayheadComponent: React.FC<{ isActive?: boolean }> = ({ isActive = true }) => {
  const uiContext = useContext(TimelineUIContext);
  const playheadRef = useRef<HTMLDivElement>(null);

  const livePlaybackRef = useRef<{
    step: number;
    measure: number;
    ratio: number;
    measureStartTime?: number;
    measureDuration?: number;
  }>({
    step: -1,
    measure: 0,
    ratio: 0,
    measureStartTime: 0,
    measureDuration: 0,
  });

  const layoutCache = useRef({
    vw: 0,
    lastScrollX: 0,
  });

  const lastExactXRef = useRef<number>(-1);

  const MEASURE_W = uiContext ? uiContext.MEASURE_W : 0;
  const HEADER_W = uiContext ? uiContext.HEADER_W : 0;

  const measureWRef = useRef(MEASURE_W);
  useEffect(() => {
    measureWRef.current = MEASURE_W;
  }, [MEASURE_W]);

  useEffect(() => {
    if (!isActive) return;

    const scrollEl = document.getElementById('timeline-scroll-container');
    if (!scrollEl) return;

    layoutCache.current.vw = scrollEl.clientWidth - HEADER_W;
    layoutCache.current.lastScrollX = scrollEl.scrollLeft;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        layoutCache.current.vw = entries[0].contentRect.width - HEADER_W;
      }
    });
    resizeObserver.observe(scrollEl);

    // Écouteur de scroll passif pour mettre à jour lastScrollX en cache (0 layout thrashing)
    const handleScroll = () => {
      layoutCache.current.lastScrollX = scrollEl.scrollLeft;
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    const handleTick = (detail: {
      step: number;
      measure: number;
      maxTicks: number;
      ratio?: number;
      time?: number;
      isPaused?: boolean;
      measureStartTime?: number;
      measureDuration?: number;
    }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, isPaused = false, measureStartTime, measureDuration } = detail;
      const el = playheadRef.current;

      if (!el) return;

      // 1. GESTION DU STOP (step < 0)
      if (step < 0) {
        livePlaybackRef.current = { step: -1, measure: 0, ratio: 0, measureStartTime: 0, measureDuration: 0 };
        lastExactXRef.current = -1;
        el.style.transition = 'none';
        el.style.transform = `translate3d(${HEADER_W}px, 0, 0)`;
        el.style.display = 'none';
        if (scrollEl) scrollEl.scrollLeft = 0;
        layoutCache.current.lastScrollX = 0;
        return;
      }

      // 2. GESTION DU PAUSE (isPaused === true)
      if (isPaused) {
        try {
          const computedStyle = window.getComputedStyle(el);
          const matrix = new WebKitCSSMatrix(computedStyle.transform);
          const pausedX = matrix.m41;
          el.style.transition = 'none';
          el.style.transform = `translate3d(${pausedX}px, 0, 0)`;
        } catch (_) {}
        return;
      }

      if (el.style.display !== 'block') {
        el.style.display = 'block';
      }

      const currentLive = livePlaybackRef.current;
      const isNewMeasure = currentLive.measure !== measure || currentLive.step < 0 || !currentLive.measureStartTime;
      const updatedStartTime = isNewMeasure ? (measureStartTime || currentLive.measureStartTime) : (currentLive.measureStartTime || measureStartTime);

      livePlaybackRef.current = {
        step,
        measure,
        ratio,
        measureStartTime: updatedStartTime,
        measureDuration: measureDuration ?? currentLive.measureDuration,
      };

      const currentMEASURE_W = measureWRef.current;
      const exactX = measure * currentMEASURE_W + ratio * currentMEASURE_W;

      const isUltraEco = usePerformanceStore.getState().disablePlayheadRAF;

      if (isUltraEco) {
        // Mode Tier 3 (Beat Jump) : Saut de position instantané sans transition CSS
        el.style.transition = 'none';
        el.style.transform = `translate3d(${HEADER_W + exactX}px, 0, 0)`;
      } else if (isNewMeasure && measureDuration && measureDuration > 0) {
        // 🚀 GPU CSS TRANSITION MODEL: Déclencher la transition CSS 60 FPS native au niveau du GPU par mesure
        const startX = HEADER_W + exactX;
        const endX = HEADER_W + (measure + 1) * currentMEASURE_W;
        const remDuration = Math.max(0.1, (1 - ratio) * measureDuration);

        el.style.transition = 'none';
        el.style.transform = `translate3d(${startX}px, 0, 0)`;
        requestAnimationFrame(() => {
          if (el) {
            el.style.transition = `transform ${remDuration}s linear`;
            el.style.transform = `translate3d(${endX}px, 0, 0)`;
          }
        });
      }

      // Détection de rupture (Loop, Seek ou saut au début de la boucle) pour le scroll immédiat
      const dx = exactX - lastExactXRef.current;
      const isRupture = lastExactXRef.current === -1 || dx < 0 || Math.abs(dx) > currentMEASURE_W * 0.5;

      if (isRupture) {
        lastExactXRef.current = exactX;
        if (layoutCache.current.vw > 0 && scrollEl) {
          const targetScroll = Math.max(0, exactX - layoutCache.current.vw * 0.1);
          scrollEl.scrollLeft = targetScroll;
          layoutCache.current.lastScrollX = targetScroll;
        }
      } else {
        lastExactXRef.current = exactX;
      }
    };

    subscribeToTick(handleTick);

    return () => {
      unsubscribeFromTick(handleTick);
      resizeObserver.disconnect();
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [HEADER_W, isActive]);

  if (!uiContext) return null;

  const isEcoMode = useSequencerStore.getState().isEcoMode;
  const isMobileDevice = (typeof window !== 'undefined' && window.innerWidth <= 768);
  const disableHeavyShadow = isEcoMode || isMobileDevice;

  return (
    <div
      ref={playheadRef}
      className={`absolute top-0 bottom-0 border-l-2 border-red-600 pointer-events-none z-30 ${disableHeavyShadow ? '' : 'shadow-[0_0_10px_rgba(220,38,38,0.7)]'}`}
      style={{
        left: 0,
        display: 'none',
        willChange: 'transform',
      }}
    />
  );
};

export const TimelinePlayhead = React.memo(TimelinePlayheadComponent);
