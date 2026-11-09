
import { getTrackRadius } from './circleGeometry';
import { TrackGroup } from '../../types';

export const drawDrumstickNeedle = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  stickAngle: number,
  activeVisibleTracks: TrackGroup[],
  themeWood: string,
  themeBorder: string,
  isHeavyEffectsDisabled: boolean
): void => {
  const maxVisibleRadius = activeVisibleTracks.length > 0 
    ? Math.max(...activeVisibleTracks.map((_, i) => getTrackRadius(i, activeVisibleTracks.length)))
    : 120;
  const stickLength = maxVisibleRadius + 40;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(stickAngle);

  if (!isHeavyEffectsDisabled) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  // Corps de la baguette (+25 % d'épaisseur sur fût et col)
  ctx.beginPath();
  ctx.moveTo(0, -4.4);
  ctx.lineTo(stickLength - 13, -2.5);
  ctx.lineTo(stickLength - 13, 2.5);
  ctx.lineTo(0, 4.4);
  ctx.closePath();
  ctx.fillStyle = themeWood;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = themeBorder;
  ctx.stroke();

  // Filet doré de finition le long de la baguette
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(stickLength - 16, 0);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.lineWidth = 1.9;
  ctx.stroke();

  // Tête de la baguette (Olive dorée +25 %)
  ctx.beginPath();
  ctx.ellipse(stickLength - 6, 0, 8.8, 5.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = themeBorder;
  ctx.stroke();

  // Pivot central
  ctx.beginPath();
  ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
  ctx.fillStyle = themeWood;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = themeBorder;
  ctx.stroke();

  ctx.restore();
};
