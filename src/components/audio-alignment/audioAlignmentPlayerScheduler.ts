/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';

export function createAlignmentPlayer(audioBuffer: AudioBuffer, sampleBpm: number, anchorBpm: number) {
  const sBpm = sampleBpm > 0 ? sampleBpm : anchorBpm;
  const rate = sBpm > 0 ? (anchorBpm / sBpm) : 1.0;
  const isPure = Math.abs(rate - 1.0) < 0.001;

  let player: Tone.Player | Tone.GrainPlayer;
  if (isPure) {
    const directPlayer = new Tone.Player(audioBuffer);
    directPlayer.playbackRate = 1.0;
    directPlayer.fadeIn = 0.01;
    directPlayer.fadeOut = 0.03;
    directPlayer.loop = false;
    player = directPlayer;
  } else {
    const grainPlayer = new Tone.GrainPlayer(audioBuffer);
    grainPlayer.grainSize = 0.09;
    grainPlayer.overlap = 0.04;
    grainPlayer.playbackRate = rate;
    grainPlayer.loop = false;
    player = grainPlayer;
  }
  player.volume.value = 0;
  player.toDestination();
  return player;
}

export function playScheduledPlayer(player: Tone.Player | Tone.GrainPlayer, iterationTime: number, tStart: number, duration: number) {
  const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
  const now = rawCtx ? rawCtx.currentTime : Tone.context.currentTime;
  if (iterationTime >= now) {
    player.start(iterationTime, tStart, duration);
  } else {
    const pastSec = now - iterationTime;
    if (pastSec < duration) player.start(now, tStart + pastSec, duration - pastSec);
  }
}
