
import { ThemeColors } from './circleSequencerTypes';
import { drawAlfaiaRims } from './drawAlfaiaRims';
import { drawAlfaiaMarkers } from './drawAlfaiaMarkers';

export const drawAlfaiaBackground = (
  bgCtx: CanvasRenderingContext2D,
  currentCanvasSize: number,
  isEco: boolean,
  localTimeSig: string,
  localTicks: number,
  centerX: number,
  centerY: number,
  theme: ThemeColors
): void => {
  bgCtx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);
  bgCtx.save();
  if (isEco) {
    bgCtx.scale(0.5, 0.5);
  }

  drawAlfaiaRims(bgCtx, centerX, centerY, theme);
  drawAlfaiaMarkers(bgCtx, centerX, centerY, localTimeSig, localTicks, theme);

  if (isEco) {
    bgCtx.restore();
  }
};
