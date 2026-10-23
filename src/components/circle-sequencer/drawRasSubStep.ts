
import { InstrumentConfig, TrackGroup } from '../../types';
import { getVisualStrokeSymbol, isDarkText } from '../../data';
import { getBusNoteColor } from '../../utils/colorHelpers';
import { formatStrokeSymbol } from './percussionSatelliteHelpers';

export const drawRasSubStep = (
  ctx: CanvasRenderingContext2D,
  secondState: any,
  stepAngle: number,
  anglePerStep: number,
  centerX: number,
  centerY: number,
  tRad: number,
  currentInst: InstrumentConfig,
  track: TrackGroup,
  localRawTracks: TrackGroup[],
  instrumentsConfig: any,
  localLeftHanded: boolean,
  dynamicScale: number,
  themeBorder: string
): void => {
  if (secondState === 0 || secondState === '0' || secondState === '' || secondState === undefined || secondState === null) {
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
  const fillColor = track.isLinkFolder
    ? getBusNoteColor(String(track.id), String(primaryVisual), localRawTracks, instrumentsConfig)
    : ((currentInst.colors && currentInst.colors[primaryVisual as string]) ? currentInst.colors[primaryVisual as string] : '#fff');
  const txtColor = isDarkText(currentInst.id, String(secondState)) ? '#1a1a1a' : '#f4ecd8';
  const text = formatStrokeSymbol(currentInst.id, visualStateStr);

  ctx.beginPath();
  ctx.arc(secondX, secondY, subRadiusSize, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();

  if (isAccent) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
  } else {
    ctx.strokeStyle = themeBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (text) {
    const fontSize = Math.max(9, Math.floor((text.length > 1 ? 13 : 17) * dynamicScale * 0.9));
    ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
    ctx.fillStyle = txtColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = secondY + 2;

    if (['↑', '↓', '←', '→'].includes(text)) {
      ctx.save();
      ctx.strokeStyle = txtColor;
      ctx.lineWidth = 2.5;
      ctx.strokeText(text, secondX, textY);
      ctx.restore();
    }
    ctx.fillText(text, secondX, textY);
  }
};
