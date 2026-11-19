/**
 * engineBarulhoPlayback.ts — Lecture Barulho Web Audio (`B` / `b`) avec crossfade cos/sin 110 ms pré-calculé (< 95 lignes).
 * - `B` : impact initial `0.00 s` une seule fois puis boucle sans couture `[loopResumeSec, loopWrapSec)`.
 * - `b` : entrée à froid sans impact dans `[bodyStartSec, bodyEndSec]` (offset déterministe par `trackId`) + Fade-In 140 ms.
 * - `trackDecay < 100 %` n'écourte jamais un Barulho.
 */

import { getOrBakeBarulhoAudioBuffer } from '../barulho/barulhoLoopRegionAnalyzer';
import { DEFAULT_BARULHO_FADEIN_SEC } from '../barulho/barulhoRampPlanner';
import { computeBarulhoSoftEntryFrame } from '../worklet/processor/workletEventFlags';
import { PlaybackContext, TUNEABLE_INSTRUMENTS } from './engineTypes';

export function playBarulhoStroke(
  ctx: PlaybackContext,
  trackId: number | null,
  source: AudioBufferSourceNode,
  gainNode: GainNode,
  instrumentId: string,
  buffer: AudioBuffer,
  calculatedPitch: number,
  time: number,
  velocity: number,
  isLiveHold: boolean,
  strokeSymbol = 'B',
  maxPreviewDurSec?: number
): void {
  const baked = getOrBakeBarulhoAudioBuffer(ctx.audioContext, buffer, instrumentId);
  source.buffer = baked.buffer;
  source.playbackRate.value = TUNEABLE_INSTRUMENTS.has(instrumentId) && calculatedPitch > 0 ? calculatedPitch : 1.0;
  source.loop = true;
  source.loopStart = baked.region.loopResumeSec;
  source.loopEnd = baked.region.loopWrapSec;

  const isSoftB = strokeSymbol === 'b' || (instrumentId === 'apito' && strokeSymbol === 'l');
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
    const hasCustomStepDur = typeof maxPreviewDurSec === 'number' && maxPreviewDurSec > 0;
    const holdDurSec = hasCustomStepDur ? Math.max(0.045, maxPreviewDurSec) : 0.77;
    const fadeOutSec = hasCustomStepDur ? 0.028 : 0.18;
    const holdEnd = time + holdDurSec;
    const expectedEnd = holdEnd + fadeOutSec;

    ctx.barulho.activeBarulhoNodes.set(instrumentId, source);
    ctx.barulho.activeBarulhoGains.set(instrumentId, gainNode);
    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

    gainNode.gain.cancelScheduledValues(time);
    if (isSoftB) {
      const fadeInSec = hasCustomStepDur ? Math.min(DEFAULT_BARULHO_FADEIN_SEC, holdDurSec * 0.45) : DEFAULT_BARULHO_FADEIN_SEC;
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(velocity, time + fadeInSec);
    } else {
      gainNode.gain.setValueAtTime(velocity, time);
    }
    gainNode.gain.setValueAtTime(velocity, holdEnd);
    gainNode.gain.linearRampToValueAtTime(0, expectedEnd);
    source.start(time, entrySec);
    source.stop(expectedEnd + 0.01);

    const voiceKey = trackId !== null ? trackId : instrumentId;
    const loopSym = instrumentId === 'apito' ? (isSoftB ? 'l' : 'L') : (isSoftB ? 'b' : 'B');
    const activeVoice = ctx.voiceGuard.getActiveVoice(
      source, gainNode, time, holdEnd, expectedEnd, expectedEnd, velocity, true, instrumentId, loopSym
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
