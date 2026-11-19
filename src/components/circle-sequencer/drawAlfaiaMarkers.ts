import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
import { INNER_SKIN_RADIUS } from './circleSequencerConstants';
import { ThemeColors } from './circleSequencerTypes';

export const drawAlfaiaMarkers = (
  bgCtx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  localTimeSig: string,
  _localTicks: number,
  _theme: ThemeColors
): void => {
  const geom = getRodaMeasureGeometry(localTimeSig);
  const { beatsCount, defaultSubdivisions, beatAngles } = geom;

  beatAngles.forEach((angle, idx) => {
    const inRad = INNER_SKIN_RADIUS - 35;
    const outRad = INNER_SKIN_RADIUS - 20;

    bgCtx.beginPath();
    bgCtx.moveTo(centerX + Math.cos(angle) * inRad, centerY + Math.sin(angle) * inRad);
    bgCtx.lineTo(centerX + Math.cos(angle) * outRad, centerY + Math.sin(angle) * outRad);
    bgCtx.strokeStyle = '#1a1a1a';
    bgCtx.save();
    if (idx !== 0) bgCtx.globalAlpha = 0.3;
    bgCtx.lineWidth = idx === 0 ? 4 : 2;
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

  bgCtx.save();
  const totalGridRays = beatsCount * defaultSubdivisions;
  for (let i = 0; i < totalGridRays; i++) {
    const angle = -Math.PI / 2 + (i / totalGridRays) * Math.PI * 2;
    const isMainBeat = i % defaultSubdivisions === 0;

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
