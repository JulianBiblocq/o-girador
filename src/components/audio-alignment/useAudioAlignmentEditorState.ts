
import { useState, useRef, useEffect } from 'react';
import { Pattern } from '../../types/store.types';
import { AlignmentMetrics } from './audioAlignmentTypes';
import { useAudioAlignmentDrag } from './useAudioAlignmentDrag';
import { useAudioAlignmentPreview } from './useAudioAlignmentPreview';
import { useAudioAlignmentWaveformCanvas } from './useAudioAlignmentWaveformCanvas';

export function useAudioAlignmentEditorState(params: {
  audioBuffer: AudioBuffer;
  pattern: Pattern;
  metrics: AlignmentMetrics;
  initialTrimStartSec?: number;
  initialTrimEndSec?: number;
  initialNudgeMs?: number;
  initialSampleBpm?: number;
  isImported?: boolean;
  lang: string;
}) {
  const {
    audioBuffer, pattern, metrics, initialTrimStartSec, initialTrimEndSec,
    initialNudgeMs = 0, initialSampleBpm, isImported = false, lang,
  } = params;

  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(200);
  const defaultTrimStart = isImported ? 0 : (initialTrimStartSec !== undefined ? initialTrimStartSec : 0);
  const defaultTrimEnd = isImported ? audioBuffer.duration : (initialTrimEndSec !== undefined ? initialTrimEndSec : audioBuffer.duration);
  const defaultNudgeMs = isImported ? 0 : initialNudgeMs;
  const defaultSampleBpm = initialSampleBpm ?? pattern.vocalClip?.sampleBpm ?? pattern.vocalClip?.baseBpm ?? metrics.anchorBpm;

  const [trimStartSec, setTrimStartSec] = useState(defaultTrimStart);
  const [trimEndSec, setTrimEndSec] = useState(defaultTrimEnd);
  const [sampleBpm, setSampleBpm] = useState<number>(defaultSampleBpm);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const staticGridCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const nudgeValueLabelRef = useRef<HTMLSpanElement>(null);
  const anacrusisBadgeRef = useRef<HTMLSpanElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const trimOverlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const nudgeMsRef = useRef(defaultNudgeMs);
  const trimStartSecRef = useRef(trimStartSec);
  const trimEndSecRef = useRef(trimEndSec);
  const sampleBpmRef = useRef(sampleBpm);
  useEffect(() => { sampleBpmRef.current = sampleBpm; }, [sampleBpm]);
  useEffect(() => { trimStartSecRef.current = trimStartSec; }, [trimStartSec]);
  useEffect(() => { trimEndSecRef.current = trimEndSec; }, [trimEndSec]);

  const temps1Px = metrics.t_temps1 * pixelsPerSecond;
  const bufferPxWidth = Math.ceil(audioBuffer.duration * pixelsPerSecond);
  const totalBoardWidth = Math.max(temps1Px + bufferPxWidth + 600, 1600);
  const canvasHeight = 144;

  const getInitialBaseWaveX = (pps: number) => {
    if (!isImported && pattern.vocalClip) {
      if (pattern.vocalClip.startOffsetSec !== undefined) {
        return (metrics.t_temps1 * pps) + (pattern.vocalClip.startOffsetSec * pps) - (defaultTrimStart * pps);
      }
      if (pattern.vocalClip.anacrusisSec !== undefined) {
        return (metrics.t_temps1 * pps) - (pattern.vocalClip.anacrusisSec * pps) - (defaultTrimStart * pps);
      }
    }
    return 0;
  };

  const waveBaseXRef = useRef<number>(getInitialBaseWaveX(200));
  const waveBaseXSecRef = useRef<number>(getInitialBaseWaveX(200) / 200);
  const currentTotalWaveXRef = useRef<number>(waveBaseXRef.current + (defaultNudgeMs / 1000) * 200);

  const drag = useAudioAlignmentDrag({
    pixelsPerSecond, setPixelsPerSecond, t_temps1: metrics.t_temps1, temps1Px, audioBuffer,
    patternMeasures: metrics.patternMeasures, beatsCount: metrics.beatsCount, beatDurationSec: metrics.beatDurationSec,
    trimStartSec, setTrimStartSec, trimEndSec, setTrimEndSec, lang, waveformContainerRef,
    scrollContainerRef, anacrusisBadgeRef, nudgeMsRef, trimStartSecRef, trimEndSecRef,
    waveBaseXRef, waveBaseXSecRef, currentTotalWaveXRef,
  });

  const preview = useAudioAlignmentPreview({
    audioBuffer, effectiveMeasure: metrics.effectiveMeasure, anchorBpm: metrics.anchorBpm,
    measureCycleDurationSec: metrics.measureCycleDurationSec, trimStartSecRef, trimEndSecRef,
    sampleBpmRef, nudgeMsRef, calculateStartOffsetSec: drag.calculateStartOffsetSec, waveBaseXRef,
  });

  useAudioAlignmentWaveformCanvas({
    audioBuffer, pixelsPerSecond, canvasHeight, trimStartSec, trimEndSec,
    waveformCanvasRef, trimOverlayCanvasRef, updateLiveTimingBadges: drag.updateLiveTimingBadges,
    currentTotalWaveXRef,
  });

  useEffect(() => {
    if (waveformContainerRef.current) waveformContainerRef.current.style.transform = `translate3d(${currentTotalWaveXRef.current}px, 0, 0)`;
    drag.updateLiveTimingBadges(currentTotalWaveXRef.current);
  }, [drag]);

  useEffect(() => {
    const newBaseX = waveBaseXSecRef.current * pixelsPerSecond;
    waveBaseXRef.current = newBaseX;
    const totalX = newBaseX + (nudgeMsRef.current / 1000) * pixelsPerSecond;
    currentTotalWaveXRef.current = totalX;
    if (waveformContainerRef.current) waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    drag.updateLiveTimingBadges(totalX);
  }, [pixelsPerSecond, drag]);

  useEffect(() => {
    const initX = getInitialBaseWaveX(pixelsPerSecond);
    waveBaseXRef.current = initX;
    waveBaseXSecRef.current = initX / pixelsPerSecond;
    const totalX = initX + (defaultNudgeMs / 1000) * pixelsPerSecond;
    currentTotalWaveXRef.current = totalX;
    if (waveformContainerRef.current) waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    drag.updateLiveTimingBadges(totalX);
  }, [audioBuffer, isImported, pixelsPerSecond, drag]);

  return {
    pixelsPerSecond, trimStartSec, setTrimStartSec, trimEndSec, setTrimEndSec,
    sampleBpm, setSampleBpm, temps1Px, bufferPxWidth, totalBoardWidth, canvasHeight,
    scrollContainerRef, staticGridCanvasRef, waveformContainerRef, nudgeValueLabelRef,
    anacrusisBadgeRef, waveformCanvasRef, trimOverlayCanvasRef, nudgeMsRef, waveBaseXRef,
    currentTotalWaveXRef, drag, preview,
  };
}
