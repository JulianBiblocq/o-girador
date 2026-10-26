import { ThemeColors } from './circleSequencerTypes';
import { drawAlfaiaRims } from './drawAlfaiaRims';
import { drawAlfaiaMarkers } from './drawAlfaiaMarkers';

export const drawAlfaiaBackground = (
  bgCtx: CanvasRenderingContext2D,
  logicalSize: number,
  localTimeSig: string,
  localTicks: number,
  centerX: number,
  centerY: number,
  theme: ThemeColors
): void => {
  bgCtx.save();
  bgCtx.globalAlpha = 1.0;
  bgCtx.globalCompositeOperation = 'source-over';
  bgCtx.clearRect(0, 0, logicalSize, logicalSize);

  drawAlfaiaRims(bgCtx, centerX, centerY, theme);
  drawAlfaiaMarkers(bgCtx, centerX, centerY, localTimeSig, localTicks, theme);

  bgCtx.restore();
};
