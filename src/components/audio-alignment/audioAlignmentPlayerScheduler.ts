/**
 * audioAlignmentPlayerScheduler.ts
 * Lecteur d'alignement vocal utilisant exclusivement le moteur DSP Studio (`vocalPatternBufferCache`)
 * et un `Tone.Player` natif à `playbackRate = 1.0` (Zéro GrainPlayer) (< 45 lignes).
 */
import * as Tone from 'tone';
import { getOrComputeVocalPatternDspSync } from '../../audio/vocalDsp/vocalPatternBufferCache';

export function createAlignmentPlayer(audioBuffer: AudioBuffer, sampleBpm: number, anchorBpm: number): Tone.Player {
  const sBpm = sampleBpm > 0 ? sampleBpm : anchorBpm;
  const lBpm = anchorBpm > 0 ? anchorBpm : sBpm;
  const dspEntry = getOrComputeVocalPatternDspSync('alignment_preview', audioBuffer, sBpm, lBpm, 0, 0);

  const directPlayer = new Tone.Player(dspEntry.audioBuffer);
  directPlayer.playbackRate = 1.0;
  directPlayer.fadeIn = 0.005;
  directPlayer.fadeOut = 0.02;
  directPlayer.loop = false;
  directPlayer.volume.value = 0;
  directPlayer.toDestination();
  return directPlayer;
}

export function playScheduledPlayer(player: Tone.Player, iterationTime: number, tStart: number, duration: number) {
  const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
  const now = rawCtx ? rawCtx.currentTime : Tone.context.currentTime;
  if (iterationTime >= now) {
    player.start(iterationTime, tStart, duration);
  } else {
    const pastSec = now - iterationTime;
    if (pastSec < duration) player.start(now, tStart + pastSec, duration - pastSec);
  }
}
