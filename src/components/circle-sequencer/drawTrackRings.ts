import { TrackGroup } from '../../types';
import { getBusColor } from '../../utils/colorHelpers';
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState } from '../../stores/useSequencerStore';
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
  const isMuted = getEffectiveMuteState(localRawTracks, track.id);
  const hasAnySolo = localRawTracks.some((t) => Boolean(t.isSolo));
  const isSoloAudible = hasAnySolo && !isMuted;

  ctx.save();
  const baseAlpha = isActiveState ? 1.0 : 0.25;
  ctx.globalAlpha = isMuted ? baseAlpha * 0.08 : (isSoloAudible ? baseAlpha : baseAlpha * 0.2);

  ctx.beginPath();
  ctx.arc(centerX, centerY, tRad, 0, Math.PI * 2);
  ctx.strokeStyle = busColor || themeBorder;
  ctx.lineWidth = isSoloAudible ? 1.8 : 1.5;
  ctx.setLineDash([5, 5]);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();

  return tRad;
};
