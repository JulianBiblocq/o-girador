/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ripple } from './circleSequencerTypes';
import { TrackGroup, HitTriggerPool } from '../../types';
import { instrumentsConfig } from '../../data';
import { getTrackRadius } from './circleGeometry';

export const processHitTriggers = (
  pool: HitTriggerPool,
  localRawTracks: TrackGroup[],
  activeVisibleTracks: TrackGroup[],
  getLiveActivePatternId: (track: TrackGroup) => number | null,
  themeText: string,
  ripples: Ripple[]
): void => {
  const tracksMap = new Map<number | string, TrackGroup>();
  const len = localRawTracks.length;
  for (let i = 0; i < len; i++) {
    const t = localRawTracks[i];
    tracksMap.set(t.id, t);
    tracksMap.set(String(t.id), t);
  }

  while (pool.readIndex !== pool.writeIndex) {
    const hit = pool.buffer[pool.readIndex];
    pool.readIndex = (pool.readIndex + 1) % pool.size;

    let track = tracksMap.get(hit.trackId);
    if (track && track.linkedToTrackId) {
      track = tracksMap.get(track.linkedToTrackId) || tracksMap.get(Number(track.linkedToTrackId));
    }
    if (track && !track.isHidden && !track.isMute) {
      const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst) continue;
      const color = inst.colors[hit.state as any] || themeText;
      const activePatternId = getLiveActivePatternId(track);
      if (activePatternId === null) continue;

      const activePattern = track.patterns.find(p => p.id === activePatternId) || track.patterns[0];
      const angle = -Math.PI / 2 + ((hit.stepIndex / activePattern.steps) * Math.PI * 2);

      const visibleIdx = activeVisibleTracks.findIndex(vt => vt.id === track!.id);
      if (visibleIdx !== -1) {
        const radius = getTrackRadius(visibleIdx, activeVisibleTracks.length);
        const x = 600 + Math.cos(angle) * radius;
        const y = 600 + Math.sin(angle) * radius;

        ripples.push({
          x,
          y,
          radius: 6,
          maxRadius: 25 + (track.volumeVal / 100) * 15,
          alpha: 0.6 * (track.volumeVal / 100),
          color: color,
          speed: 1.0 + Math.random() * 0.5,
        });
      }
    }
  }
};

export const drawAndUpdateRipples = (
  ctx: CanvasRenderingContext2D,
  ripples: Ripple[]
): void => {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.radius += r.speed;
    r.alpha -= 0.015;
    if (r.alpha <= 0) {
      ripples.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.min(1, r.alpha);
    ctx.strokeStyle = r.color;
    ctx.stroke();
    ctx.restore();
  }
};
