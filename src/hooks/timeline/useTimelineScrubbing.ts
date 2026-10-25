import React, { useRef, useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { findMeasureIndexAtX } from '../../utils/timeline/timelineMeasureWidths';
import { getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

export interface UseTimelineScrubbingOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  headerWidth: number;
  measureWidth: number;
  measureWidths: number[];
  measureLeftPositions: number[];
  totalMeasures: number;
  expanded: { baseMeasure: number; iteration: number }[];
  isPlaying: boolean;
  seekToMeasure?: (measure: number, step?: number) => void;
  handleTimelineNavigate?: (mIdx: number, sIdx: number, totalSteps: number) => void;
}

export function useTimelineScrubbing({
  scrollRef, headerWidth, measureWidth, measureWidths, measureLeftPositions,
  totalMeasures, expanded, isPlaying, seekToMeasure, handleTimelineNavigate,
}: UseTimelineScrubbingOptions) {
  const isScrubbing = useRef(false);
  const lastScrubbedMeasureRef = useRef(-1);

  const handleRulerSeek = (clientX: number) => {
    const sEl = scrollRef.current;
    if (!sEl) return;
    const relX = clientX - sEl.getBoundingClientRect().left - headerWidth + sEl.scrollLeft;
    const targetM = relX < 0 ? 0 : findMeasureIndexAtX(relX, measureLeftPositions, measureWidths);
    const clampedM = Math.max(0, Math.min(targetM, totalMeasures - 1));
    if (clampedM === lastScrubbedMeasureRef.current) return;
    lastScrubbedMeasureRef.current = clampedM;

    const firstMatchIdx = expanded.findIndex(item => item.baseMeasure === clampedM);
    const targetIteration = firstMatchIdx !== -1 ? expanded[firstMatchIdx].iteration : 1;
    if (firstMatchIdx !== -1) useSequencerStore.getState().setCurrentExpandedMeasureIdx(firstMatchIdx);

    if (!isPlaying) {
      useSequencerStore.getState().setCurrentMeasure(clampedM);
      const Tone = safeGetTone();
      if (Tone) { try { Tone.Transport.position = `${clampedM}:0:0`; } catch (_) {} }
      const playheadEl = document.getElementById('timeline-playhead-line');
      if (playheadEl) {
        playheadEl.style.transition = 'none'; playheadEl.style.display = 'block';
        playheadEl.style.transform = `translate3d(${headerWidth + (measureLeftPositions[clampedM] ?? (clampedM * measureWidth))}px, 0, 0)`;
      }
    }
    if (seekToMeasure) seekToMeasure(clampedM, 0);
    else if (handleTimelineNavigate) handleTimelineNavigate(clampedM, 0, 16);
    window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: clampedM, sIdx: 0, iteration: targetIteration } }));
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName) || target.closest('button, select, input, .ruler-detailed')) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
    if ((e.pointerType === 'mouse' && e.button !== 0) || !scrollRef.current) return;
    if (e.clientX - scrollRef.current.getBoundingClientRect().left < headerWidth) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    isScrubbing.current = true; lastScrubbedMeasureRef.current = -1;
    handleRulerSeek(e.clientX); e.preventDefault();
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (isScrubbing.current) handleRulerSeek(e.clientX); };
  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing.current) {
      isScrubbing.current = false; lastScrubbedMeasureRef.current = -1;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  useEffect(() => {
    let rafId: number | null = null;
    const onMove = (clientX: number) => {
      if (isScrubbing.current) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => handleRulerSeek(clientX));
      }
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX);
    const onTouch = (e: TouchEvent) => { if (e.touches[0]) { onMove(e.touches[0].clientX); e.preventDefault(); } };
    const onEnd = () => {
      if (isScrubbing.current) { isScrubbing.current = false; lastScrubbedMeasureRef.current = -1; if (rafId) cancelAnimationFrame(rafId); }
    };
    window.addEventListener('mousemove', onMouse); window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouch, { passive: false }); window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouse); window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouch); window.removeEventListener('touchend', onEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [headerWidth, totalMeasures, isPlaying, measureWidth, measureLeftPositions, measureWidths]);

  return { handleRulerSeek, handleRulerPointerDown, handleRulerPointerMove, handleRulerPointerUp };
}
