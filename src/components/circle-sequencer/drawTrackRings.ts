/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  const busColor = track.isLinkFolder
    ? getBusColor(String(track.id), localRawTracks, instrumentsConfig)
    : null;

  ctx.save();
  ctx.globalAlpha = isActiveState ? 1.0 : 0.25;

  const tRad = getTrackRadius(visibleIdx, totalTracks);
  ctx.beginPath();
  ctx.arc(centerX, centerY, tRad, 0, Math.PI * 2);
  ctx.strokeStyle = busColor || themeBorder;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);

  if (!track.isSolo) {
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * 0.2;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.stroke();
  }
  ctx.setLineDash([]);

  return tRad;
};
