
import React, { useEffect } from 'react';
import { Pattern } from '../../types/store.types';
import { drawStaticRunwayGrid } from './drawStaticRunwayGrid';
import { drawStaticMeasureGrid } from './drawStaticMeasureGrid';

export interface AudioAlignmentStaticGridCanvasProps {
  staticGridCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  totalBoardWidth: number;
  canvasHeight: number;
  temps1Px: number;
  pattern: Pattern;
  isCompound: boolean;
  isCompoundPrev: boolean;
  beatsCount: number;
  beatDurationSec: number;
  pixelsPerSecond: number;
  patternMeasures: number;
}

export const AudioAlignmentStaticGridCanvas: React.FC<AudioAlignmentStaticGridCanvasProps> = React.memo(({
  staticGridCanvasRef, totalBoardWidth, canvasHeight, temps1Px,
  pattern, isCompound, isCompoundPrev, beatsCount, beatDurationSec,
  pixelsPerSecond, patternMeasures,
}) => {
  useEffect(() => {
    if (!staticGridCanvasRef.current) return;
    const canvas = staticGridCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const width = totalBoardWidth;
    const height = canvasHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, width, height);

    const yCenter = height / 2;
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yCenter);
    ctx.lineTo(width, yCenter);
    ctx.stroke();

    drawStaticRunwayGrid({ ctx, temps1Px, isCompoundPrev, height, yCenter, pattern });
    drawStaticMeasureGrid({
      ctx, temps1Px, width, height, yCenter, pattern,
      isCompound, beatsCount, beatDurationSec, pixelsPerSecond, patternMeasures,
    });
  }, [staticGridCanvasRef, totalBoardWidth, canvasHeight, temps1Px, pattern, isCompound, isCompoundPrev, beatsCount, beatDurationSec, pixelsPerSecond, patternMeasures]);

  return (
    <canvas
      ref={staticGridCanvasRef}
      className="absolute top-0 bottom-0 left-0 pointer-events-none z-0"
      height={canvasHeight}
    />
  );
});

AudioAlignmentStaticGridCanvas.displayName = 'AudioAlignmentStaticGridCanvas';
