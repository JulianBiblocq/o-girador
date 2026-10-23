
import React from 'react';

export function useAudioAlignmentZoom(params: {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  waveBaseXSecRef: React.MutableRefObject<number>;
  beatsCount: number;
  beatDurationSec: number;
  t_temps1: number;
  patternMeasures: number;
  audioBuffer: AudioBuffer;
  setPixelsPerSecond: React.Dispatch<React.SetStateAction<number>>;
}) {
  const {
    scrollContainerRef, waveBaseXSecRef, beatsCount, beatDurationSec,
    t_temps1, patternMeasures, audioBuffer, setPixelsPerSecond,
  } = params;

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    if (!e.ctrlKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleFitToWindow = () => {
    if (!scrollContainerRef.current) return;
    const viewportWidth = scrollContainerRef.current.clientWidth || 900;
    const waveStartSec = Math.max(0, waveBaseXSecRef.current);
    const measureMDurationSec = beatsCount * beatDurationSec;
    const totalDuration = Math.max(
      t_temps1 + patternMeasures * measureMDurationSec,
      waveStartSec + audioBuffer.duration,
      audioBuffer.duration,
      4
    ) + 0.5;
    const idealPps = Math.max(50, Math.min(300, Math.floor((viewportWidth - 80) / totalDuration)));
    setPixelsPerSecond(idealPps);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
  };

  return {
    handleWheelScroll,
    handleFitToWindow,
    handleResetZoom1x: () => setPixelsPerSecond(200),
    handleZoomIn: () => setPixelsPerSecond((p) => Math.min(300, p + 25)),
    handleZoomOut: () => setPixelsPerSecond((p) => Math.max(50, p - 25)),
  };
}
