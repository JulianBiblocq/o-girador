/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { extractPeaks } from '../../utils/audioBufferUtils';
import { drawTrimOverlay } from './drawTrimOverlay';

export interface UseAudioAlignmentWaveformCanvasParams {
  audioBuffer: AudioBuffer;
  pixelsPerSecond: number;
  canvasHeight: number;
  trimStartSec: number;
  trimEndSec: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  trimOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  updateLiveTimingBadges: (totalX?: number) => void;
  currentTotalWaveXRef: React.MutableRefObject<number>;
}

export function useAudioAlignmentWaveformCanvas(params: UseAudioAlignmentWaveformCanvasParams) {
  const {
    audioBuffer, pixelsPerSecond, canvasHeight, trimStartSec, trimEndSec,
    waveformCanvasRef, trimOverlayCanvasRef, updateLiveTimingBadges, currentTotalWaveXRef,
  } = params;

  const cachedPeaksRef = useRef<Float32Array | null>(null);
  const cachedPeaksWidthRef = useRef<number>(0);

  useEffect(() => {
    if (!audioBuffer || !waveformCanvasRef.current) return;
    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const currentBufferPxWidth = Math.ceil(audioBuffer.duration * pixelsPerSecond);
    const height = canvasHeight;

    canvas.width = Math.round(currentBufferPxWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${currentBufferPxWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!cachedPeaksRef.current || cachedPeaksWidthRef.current !== currentBufferPxWidth) {
      cachedPeaksRef.current = extractPeaks(audioBuffer, currentBufferPxWidth);
      cachedPeaksWidthRef.current = currentBufferPxWidth;
    }

    const peaks = cachedPeaksRef.current;
    const numPoints = peaks.length / 2;
    let maxGlobalPeak = 0.001;
    for (let i = 0; i < numPoints; i++) {
      const absMin = Math.abs(peaks[i * 2]);
      const absMax = Math.abs(peaks[i * 2 + 1]);
      if (absMin > maxGlobalPeak) maxGlobalPeak = absMin;
      if (absMax > maxGlobalPeak) maxGlobalPeak = absMax;
    }

    const targetOccupancy = 0.75;
    const usefulHalfHeight = (height / 2) * targetOccupancy;
    const dynamicAmp = usefulHalfHeight / maxGlobalPeak;
    const amp = Math.min(dynamicAmp, (height / 2) * 50);

    ctx.clearRect(0, 0, currentBufferPxWidth, height);
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(currentBufferPxWidth, height / 2);
    ctx.stroke();

    ctx.fillStyle = '#8b2a1a';
    for (let i = 0; i < numPoints; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = i;
      const y = height / 2 + min * amp;
      const h = Math.max(1.5, (max - min) * amp);
      ctx.fillRect(x, y, 1.5, h);
    }
  }, [audioBuffer, pixelsPerSecond, canvasHeight, waveformCanvasRef]);

  useEffect(() => {
    if (!trimOverlayCanvasRef.current || !audioBuffer) return;
    const canvas = trimOverlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const currentBufferPxWidth = Math.ceil(audioBuffer.duration * pixelsPerSecond);
    const height = canvasHeight;

    canvas.width = Math.round(currentBufferPxWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${currentBufferPxWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawTrimOverlay({ ctx, currentBufferPxWidth, height, trimStartSec, trimEndSec, pixelsPerSecond });
    updateLiveTimingBadges(currentTotalWaveXRef.current);
  }, [audioBuffer, trimStartSec, trimEndSec, pixelsPerSecond, canvasHeight, trimOverlayCanvasRef, updateLiveTimingBadges, currentTotalWaveXRef]);
}
