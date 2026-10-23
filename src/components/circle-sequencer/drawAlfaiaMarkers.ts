
import { getMarkers } from '../../data';
import { INNER_SKIN_RADIUS } from './circleSequencerConstants';
import { ThemeColors } from './circleSequencerTypes';

import { TimeSignature } from '../../types';

export const drawAlfaiaMarkers = (
  bgCtx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  localTimeSig: string,
  localTicks: number,
  theme: ThemeColors
): void => {
  const markers = getMarkers(localTimeSig as TimeSignature, localTicks);

  const ticksPerBeat = localTicks / markers.length;

  // 4. Beat markers & Badges around rim
  markers.forEach((tick, idx) => {
    const angle = -Math.PI / 2 + ((tick / localTicks) * Math.PI * 2);
    const inRad = INNER_SKIN_RADIUS - 35;
    const outRad = INNER_SKIN_RADIUS - 20;

    bgCtx.beginPath();
    bgCtx.moveTo(centerX + Math.cos(angle) * inRad, centerY + Math.sin(angle) * inRad);
    bgCtx.lineTo(centerX + Math.cos(angle) * outRad, centerY + Math.sin(angle) * outRad);
    bgCtx.strokeStyle = '#1a1a1a';
    bgCtx.save();
    if (tick !== 0) bgCtx.globalAlpha = 0.3;
    bgCtx.lineWidth = (tick === 0) ? 4 : 2;
    bgCtx.stroke();
    bgCtx.restore();

    const textRad = 540;
    const badgeX = centerX + Math.cos(angle) * textRad;
    const badgeY = centerY + Math.sin(angle) * textRad;

    bgCtx.beginPath();
    bgCtx.arc(badgeX, badgeY, 18, 0, Math.PI * 2);
    bgCtx.fillStyle = '#ffffff';
    bgCtx.fill();
    bgCtx.strokeStyle = '#1a1a1a';
    bgCtx.lineWidth = 1.5;
    bgCtx.stroke();

    bgCtx.fillStyle = '#1a1a1a';
    bgCtx.font = 'bold 20px "Outfit", "Inter", sans-serif';
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillText((idx + 1).toString(), badgeX, badgeY + 1.5);
  });

  // 5. Grid lines
  bgCtx.save();
  const isCompound = localTimeSig === '6/8' || localTimeSig === '12/8';
  const subdivisionTickInterval = isCompound ? 4 : 6;

  for (let t = 0; t < localTicks; t += subdivisionTickInterval) {
    const angle = -Math.PI / 2 + (t / localTicks) * Math.PI * 2;
    const isMainBeat = t % ticksPerBeat === 0;

    bgCtx.beginPath();
    bgCtx.moveTo(centerX + Math.cos(angle) * 60, centerY + Math.sin(angle) * 60);
    bgCtx.lineTo(centerX + Math.cos(angle) * 516, centerY + Math.sin(angle) * 516);

    bgCtx.strokeStyle = '#1a1a1a';
    if (isMainBeat) {
      bgCtx.globalAlpha = 0.60;
      bgCtx.lineWidth = 3.0;
      bgCtx.setLineDash([]);
    } else {
      bgCtx.globalAlpha = 0.22;
      bgCtx.lineWidth = 1.5;
      bgCtx.setLineDash([4, 4]);
    }
    bgCtx.stroke();
  }
  bgCtx.restore();
};
