import { TrackGroup } from '../../types';
import { getBusColor } from '../../utils/colorHelpers';
import { instrumentsConfig } from '../../data';
import { getTrackRadius } from './circleGeometry';

export const drawTrackRing = (
  ctx: CanvasRenderingContext2D,
  track: TrackGroup,
  visibleIdx: number,
  totalTracks: number,
  centerX: number,
  centerY: number,
  localRawTracks: TrackGroup[],
  themeBorder: string,
  isActiveState: boolean
): number => {
  const busColor = (track.isLinkFolder || track.isLinkMaster)
    ? getBusColor(String(track.busId || track.linkedToTrackId || track.id), localRawTracks, instrumentsConfig)
    : null;

  const tRad = getTrackRadius(visibleIdx, totalTracks);

  ctx.save();
  ctx.globalAlpha = isActiveState ? 1.0 : 0.25;

  ctx.beginPath();
  ctx.arc(centerX, centerY, tRad, 0, Math.PI * 2);
  ctx.strokeStyle = busColor || themeBorder;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);

  if (!track.isSolo) {
    ctx.globalAlpha = (isActiveState ? 1.0 : 0.25) * 0.2;
    ctx.stroke();
  } else {
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();

  return tRad;
};
