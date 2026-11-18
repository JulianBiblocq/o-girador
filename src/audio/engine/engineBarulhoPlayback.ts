/**
 * engineBarulhoPlayback.ts — Lecture Barulho Web Audio (`B` / `b`) avec crossfade cos/sin 110 ms pré-calculé (< 95 lignes).
 * - `B` : impact initial `0.00 s` une seule fois puis boucle sans couture `[loopResumeSec, loopWrapSec)`.
 * - `b` : entrée à froid sans impact dans `[bodyStartSec, bodyEndSec]` (offset déterministe par `trackId`) + Fade-In 140 ms.
 * - `trackDecay < 100 %` n'écourte jamais un Barulho.
 */

import { getOrBakeBarulhoAudioBuffer } from '../barulho/barulhoLoopRegionAnalyzer';
import { DEFAULT_BARULHO_FADEIN_SEC } from '../barulho/barulhoRampPlanner';
import { computeBarulhoSoftEntryFrame } from '../worklet/processor/workletEventFlags';
import { PlaybackContext } from './engineTypes';

export function playBarulhoStroke(
  ctx: PlaybackContext,
  trackId: number | null,
  source: AudioBufferSourceNode,
  gainNode: GainNode,
  instrumentId: string,
  buffer: AudioBuffer,
  _calculatedPitch: number,
  time: number,
  velocity: number,
  isLiveHold: boolean,
  strokeSymbol = 'B'
): void {
  const baked = getOrBakeBarulhoAudioBuffer(ctx.audioContext, buffer, instrumentId);
  source.buffer = baked.buffer;
  source.playbackRate.value = 1.0;
  source.loop = true;
  source.loopStart = baked.region.loopResumeSec;
  source.loopEnd = baked.region.loopWrapSec;

  const isSoftB = strokeSymbol === 'b' || strokeSymbol === 'l';
  const entrySec = isSoftB
    ? computeBarulhoSoftEntryFrame(trackId ?? 0, baked.region.bodyStartFrame, baked.region.loopResumeFrame, baked.region.loopWrapFrame, baked.region.softEntryFrame) / baked.buffer.sampleRate
    : 0;

  if (isLiveHold) {
    gainNode.gain.cancelScheduledValues(time);
    if (isSoftB) {
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(velocity, time + DEFAULT_BARULHO_FADEIN_SEC);
    } else {
      gainNode.gain.setValueAtTime(velocity, time);
    }
    source.start(time, entrySec);
    ctx.barulho.activeBarulhoNodes.set(instrumentId, source);
    ctx.barulho.activeBarulhoGains.set(instrumentId, gainNode);
    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, Infinity));
  } else {
    ctx.scheduledHits.add(source);
    const previewDurSec = 0.95;
    const holdEnd = time + previewDurSec - 0.18;
    const expectedEnd = time + previewDurSec;

    ctx.barulho.activeBarulhoNodes.set(instrumentId, source);
    ctx.barulho.activeBarulhoGains.set(instrumentId, gainNode);
    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

    gainNode.gain.cancelScheduledValues(time);
    if (isSoftB) {
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(velocity, time + DEFAULT_BARULHO_FADEIN_SEC);
    } else {
      gainNode.gain.setValueAtTime(velocity, time);
    }
    gainNode.gain.setValueAtTime(velocity, holdEnd);
    gainNode.gain.linearRampToValueAtTime(0, expectedEnd);
    source.start(time, entrySec);
    source.stop(expectedEnd + 0.01);

    const voiceKey = trackId !== null ? trackId : instrumentId;
    const activeVoice = ctx.voiceGuard.getActiveVoice(
      source, gainNode, time, holdEnd, expectedEnd, expectedEnd, velocity, true, instrumentId, isSoftB ? 'b' : 'B'
    );
    const tv = ctx.voiceGuard.trackVoices.get(String(voiceKey)) || [];
    tv.push(activeVoice);
    ctx.voiceGuard.trackVoices.set(String(voiceKey), tv);
  }

  source.onended = () => {
    ctx.scheduledHits.delete(source);
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
