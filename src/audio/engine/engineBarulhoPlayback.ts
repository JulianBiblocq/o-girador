/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gestion de la lecture audio pour les sons continus / barulho (< 60 lignes).
 */

import { PlaybackContext } from './engineTypes';


export function playBarulhoStroke(
  ctx: PlaybackContext,
  source: AudioBufferSourceNode,
  gainNode: GainNode,
  instrumentId: string,
  buffer: AudioBuffer,
  calculatedPitch: number,
  time: number,
  velocity: number,
  decayMultiplier: number,
  isLiveHold: boolean
): void {
  if (isLiveHold) {
    source.loop = true;
    source.start(time);
    ctx.barulho.activeBarulhoNodes.set(instrumentId, source);
    ctx.barulho.activeBarulhoGains.set(instrumentId, gainNode);
    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, Infinity));
  } else {
    ctx.scheduledHits.add(source);
    const originalDuration = buffer.duration;
    const maxDuration = Math.max(0.35, Math.min(1.2, originalDuration * decayMultiplier));
    const realWorldDuration = maxDuration / calculatedPitch;
    const fadeTime = Math.min(0.02, realWorldDuration / 2);

    ctx.barulho.activeBarulhoNodes.set(instrumentId, source);
    ctx.barulho.activeBarulhoGains.set(instrumentId, gainNode);
    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, time + realWorldDuration));

    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.setValueAtTime(velocity, time + Math.max(0, realWorldDuration - fadeTime));
    gainNode.gain.linearRampToValueAtTime(0, time + realWorldDuration);
    source.start(time, 0, maxDuration);
    source.stop(time + realWorldDuration + 0.01);
  }

  source.onended = () => {
    try { source.disconnect(); } catch (_) {}
    ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
    const mapping = ctx.activeGainNodes.get(source);
    if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
    ctx.activeGainNodes.delete(source);
    ctx.voiceGuard.removeActiveVoice(instrumentId, source);
    if (ctx.barulho.activeBarulhoNodes.get(instrumentId) === source) {
      ctx.barulho.activeBarulhoNodes.delete(instrumentId);
      ctx.barulho.activeBarulhoGains.delete(instrumentId);
    }
  };
}
