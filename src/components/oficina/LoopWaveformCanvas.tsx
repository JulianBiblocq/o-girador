/**
 * LoopWaveformCanvas.tsx — Visualisation `<canvas>` Cordel de la forme d'onde & tête de lecture RAF 60 FPS (< 85 lignes).
 * - Zéro `useState` en RAF & `ResizeObserver` découplé (Commandements 1 & 2).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { BarulhoLoopPointsMs } from '../../audio/engine/barulhoLoopRegistry';
import { drawLoopWaveformFrame, extractWaveformPeaks, LoopCanvasPalette } from './loopWaveformDrawer';

export interface LoopWaveformCanvasProps {
  audioBuffer: AudioBuffer | null;
  points: BarulhoLoopPointsMs;
  isPlaying: boolean;
  getPlayheadMs: () => number | null;
  isFr: boolean;
}

export const LoopWaveformCanvas: React.FC<LoopWaveformCanvasProps> = React.memo(({
  audioBuffer, points, isPlaying, getPlayheadMs, isFr,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 600, h: 112, dpr: 1 });
  const paletteRef = useRef<LoopCanvasPalette>({
    bg: '', surface: '', ink: '', muted: '', border: '', accent: '', gold: '',
  });
  const renderRef = useRef<() => void>(() => {});
  const peaks = useMemo(() => extractWaveformPeaks(audioBuffer), [audioBuffer]);

  renderRef.current = () => {
    const cvs = canvasRef.current, ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;
    const { w, h, dpr } = sizeRef.current;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (cvs.width !== pw || cvs.height !== ph) { cvs.width = pw; cvs.height = ph; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLoopWaveformFrame(ctx, w, h, paletteRef.current, peaks, points, isPlaying ? getPlayheadMs() : null, isFr);
  };

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const syncPalette = () => {
      const cs = getComputedStyle(cvs), pick = (k: string) => cs.getPropertyValue(k).trim();
      paletteRef.current = {
        bg: pick('--cordel-bg'), surface: pick('--cordel-surface-muted') || pick('--cordel-surface'),
        ink: pick('--cordel-text'), muted: pick('--cordel-text-muted'),
        border: pick('--cordel-border-strong'), accent: pick('--cordel-accent'), gold: pick('--cordel-gold'),
      };
    };
    syncPalette();
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr && cr.width > 10 && cr.height > 10) {
        sizeRef.current = { w: cr.width, h: cr.height, dpr: Math.min(2, window.devicePixelRatio || 1) };
        syncPalette();
        renderRef.current();
      }
    });
    ro.observe(cvs);
    renderRef.current();
    return () => ro.disconnect();
  }, [peaks]);

  useEffect(() => { renderRef.current(); }, [points, isPlaying, isFr]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const loop = () => { renderRef.current(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef} data-testid="loop-lab-waveform-canvas"
      className="w-full h-28 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] block"
    />
  );
});

LoopWaveformCanvas.displayName = 'LoopWaveformCanvas';
