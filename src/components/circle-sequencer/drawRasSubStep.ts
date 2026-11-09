import { InstrumentConfig, TrackGroup } from '../../types';
import { getVisualStrokeSymbol, isDarkText } from '../../data';
import { formatStrokeSymbol } from './percussionSatelliteHelpers';
import { getOrCreateXiloStampSprite } from './xiloStampSpriteCache';

export const drawRasSubStep = (
  ctx: CanvasRenderingContext2D,
  secondState: any,
  stepAngle: number,
  anglePerStep: number,
  centerX: number,
  centerY: number,
  tRad: number,
  currentInst: InstrumentConfig,
  _track: TrackGroup,
  _localRawTracks: TrackGroup[],
  _instrumentsConfig: any,
  localLeftHanded: boolean,
  dynamicScale: number,
  _themeBorder: string
): void => {
  if (
    secondState === 0 ||
    secondState === '0' ||
    secondState === '' ||
    secondState === undefined ||
    secondState === null
  ) {
    return;
  }

  const finalAngle = stepAngle + 0.5 * anglePerStep;
  const secondX = centerX + Math.cos(finalAngle) * tRad;
  const secondY = centerY + Math.sin(finalAngle) * tRad;

  const visualState = getVisualStrokeSymbol(secondState, localLeftHanded, currentInst.id);
  const primaryVisual = Array.isArray(visualState) ? visualState[0] : visualState;
  const visualStateStr = String(primaryVisual);
  const subRadiusSize = 9 * dynamicScale;

  const isAccent = visualStateStr === visualStateStr.toUpperCase();
  const fillColor =
    currentInst.colors && currentInst.colors[primaryVisual as string]
      ? currentInst.colors[primaryVisual as string]
      : currentInst.color || '#fff';
  const txtColor = isDarkText(currentInst.id, String(secondState)) ? '#1a1a1a' : '#f4ecd8';
  const text = formatStrokeSymbol(currentInst.id, visualStateStr);

  const sprite = getOrCreateXiloStampSprite(fillColor, txtColor, text, subRadiusSize, dynamicScale, isAccent);
  if (sprite) {
    const half = sprite.logicalSize * 0.5;
    ctx.drawImage(sprite.canvas, secondX - half, secondY - half, sprite.logicalSize, sprite.logicalSize);
  }
};
