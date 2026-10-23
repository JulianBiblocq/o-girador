
import React, { useRef, useCallback } from 'react';
import { useAudioAlignmentZoom } from './useAudioAlignmentZoom';
import { useAudioAlignmentTrimDrag } from './useAudioAlignmentTrimDrag';

export interface UseAudioAlignmentDragParams {
  pixelsPerSecond: number;
  setPixelsPerSecond: React.Dispatch<React.SetStateAction<number>>;
  t_temps1: number;
  temps1Px: number;
  audioBuffer: AudioBuffer;
  patternMeasures: number;
  beatsCount: number;
  beatDurationSec: number;
  trimStartSec: number;
  setTrimStartSec: (sec: number) => void;
  trimEndSec: number;
  setTrimEndSec: (sec: number) => void;
  lang: string;
  waveformContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  anacrusisBadgeRef: React.RefObject<HTMLSpanElement | null>;
  nudgeMsRef: React.MutableRefObject<number>;
  trimStartSecRef: React.MutableRefObject<number>;
  trimEndSecRef: React.MutableRefObject<number>;
  waveBaseXRef: React.MutableRefObject<number>;
  waveBaseXSecRef: React.MutableRefObject<number>;
  currentTotalWaveXRef: React.MutableRefObject<number>;
}

export function useAudioAlignmentDrag(params: UseAudioAlignmentDragParams) {
  const {
    pixelsPerSecond, setPixelsPerSecond, t_temps1, temps1Px, audioBuffer,
    patternMeasures, beatsCount, beatDurationSec, setTrimStartSec,
    setTrimEndSec, lang, waveformContainerRef, scrollContainerRef,
    anacrusisBadgeRef, nudgeMsRef, trimStartSecRef, trimEndSecRef,
    waveBaseXRef, waveBaseXSecRef, currentTotalWaveXRef,
  } = params;

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartBaseXRef = useRef(0);

  const calculateStartOffsetSec = useCallback((baseX: number, trimStart: number) => {
    return (baseX / pixelsPerSecond) + trimStart - t_temps1;
  }, [t_temps1, pixelsPerSecond]);

  const updateLiveTimingBadges = useCallback((_totalX?: number) => {
    const startOffsetSec = calculateStartOffsetSec(waveBaseXRef.current, trimStartSecRef.current);
    let offsetMs = Math.round(startOffsetSec * 1000);
    if (Math.abs(offsetMs) <= 1) offsetMs = 0;

    if (anacrusisBadgeRef.current) {
      if (offsetMs < 0) {
        anacrusisBadgeRef.current.textContent = lang === 'fr'
          ? `ANACROUSE : ${Math.abs(offsetMs)} MS (AVANT TEMPS 1)`
          : `ANACRUSE : ${Math.abs(offsetMs)} MS (ANTES DO TEMPO 1)`;
        anacrusisBadgeRef.current.style.color = '#2a5d4e';
      } else if (offsetMs > 0) {
        anacrusisBadgeRef.current.textContent = lang === 'fr'
          ? `DÉPART DIFFÉRÉ : +${offsetMs} MS (APRÈS TEMPS 1)`
          : `PARTIDA ATRASADA : +${offsetMs} MS (APÓS TEMPO 1)`;
        anacrusisBadgeRef.current.style.color = '#8b2a1a';
      } else {
        anacrusisBadgeRef.current.textContent = lang === 'fr' ? 'TEMPS 1 CALÉ (0 MS)' : 'TEMPO 1 ALINHADO (0 MS)';
        anacrusisBadgeRef.current.style.color = '#1a1a1a';
      }
    }
  }, [calculateStartOffsetSec, lang, anacrusisBadgeRef, trimStartSecRef, waveBaseXRef]);

  const handleWaveformPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartBaseXRef.current = waveBaseXRef.current;
  };

  const handleWaveformPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    let newBaseX = dragStartBaseXRef.current + (e.clientX - dragStartXRef.current);
    const attackX = newBaseX + (trimStartSecRef.current * pixelsPerSecond);
    if (Math.abs(attackX - temps1Px) < 4) newBaseX = temps1Px - (trimStartSecRef.current * pixelsPerSecond);

    waveBaseXRef.current = newBaseX;
    waveBaseXSecRef.current = newBaseX / pixelsPerSecond;
    const totalX = newBaseX + (nudgeMsRef.current / 1000) * pixelsPerSecond;
    currentTotalWaveXRef.current = totalX;

    if (waveformContainerRef.current) waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    updateLiveTimingBadges(totalX);
  };

  const handleWaveformPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
      isDraggingRef.current = false;
    }
  };

  const trimDrag = useAudioAlignmentTrimDrag({
    audioBuffer, pixelsPerSecond, setTrimStartSec, setTrimEndSec,
    trimStartSecRef, trimEndSecRef, currentTotalWaveXRef, updateLiveTimingBadges,
  });

  const zoom = useAudioAlignmentZoom({
    scrollContainerRef, waveBaseXSecRef, beatsCount, beatDurationSec,
    t_temps1, patternMeasures, audioBuffer, setPixelsPerSecond,
  });

  return {
    calculateStartOffsetSec, updateLiveTimingBadges,
    handleWaveformPointerDown, handleWaveformPointerMove, handleWaveformPointerUp,
    ...trimDrag,
    ...zoom,
  };
}
