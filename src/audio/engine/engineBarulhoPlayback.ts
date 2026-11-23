/**
 * engineBarulhoPlayback.ts — Lecture Barulho Web Audio (`B` / `b`) avec décorrélation d'escouade (< 115 lignes).
 */
import { getOrBakeBarulhoAudioBuffer } from '../barulho/barulhoLoopRegionAnalyzer';
import { DEFAULT_BARULHO_FADEIN_SEC } from '../barulho/barulhoRampPlanner';
import { BARULHO_PARTNER_ATTACK_RAMP_SEC, computeBarulhoDecorrelatedReadFrame } from '../spatial/sectionBarulhoPhaseHelper';
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
  maxPreviewDurSec?: number,
  playerIdx = 0,
  extraCleanup?: () => void,
  partnerRank = 0,
  originCoord = 0
): void {
  const isSoftB = strokeSymbol === 'b' || (instrumentId === 'apito' && strokeSymbol === 'l');
  const barKey = playerIdx > 0 ? `${instrumentId}__p${playerIdx}` : instrumentId;
  const hasCustomStepDur = typeof maxPreviewDurSec === 'number' && maxPreviewDurSec !== 0;
  const isContinuousSeqLoop = isLiveHold || (originCoord > 0 && !hasCustomStepDur);

  if (isContinuousSeqLoop && ctx.barulho.trySustainLegatoBarulho(barKey, originCoord, velocity, time, isSoftB)) {
    try { source.disconnect(); } catch (_) {}
    extraCleanup?.();
    ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
    return;
  }
  if (ctx.barulho.activeBarulhoNodes.has(barKey)) {
    ctx.barulho.fadeOutBarulho(barKey, time, 0.020);
  }

  const baked = getOrBakeBarulhoAudioBuffer(ctx.audioContext, buffer, instrumentId);
  source.buffer = baked.buffer;
  source.playbackRate.value = TUNEABLE_INSTRUMENTS.has(instrumentId) && calculatedPitch > 0 ? calculatedPitch : 1.0;
  source.loop = true;
  source.loopStart = baked.region.loopResumeSec;
  source.loopEnd = baked.region.loopWrapSec;

  const sr = baked.buffer.sampleRate;
  const hasLoop = baked.region.loopWrapFrame > baked.region.loopResumeFrame;
  const decorrelIdx = playerIdx > 0 ? playerIdx : partnerRank;
  const entrySec = decorrelIdx > 0 && hasLoop
    ? computeBarulhoDecorrelatedReadFrame(decorrelIdx, baked.region.loopResumeFrame, baked.region.loopWrapFrame, sr) / sr
    : (isSoftB
        ? computeBarulhoSoftEntryFrame(trackId ?? 0, baked.region.bodyStartFrame, baked.region.loopResumeFrame, baked.region.loopWrapFrame, baked.region.softEntryFrame) / sr
        : 0);

  if (isContinuousSeqLoop) {
    ctx.scheduledHits.add(source);
    gainNode.gain.cancelScheduledValues(time);
    if (isSoftB || decorrelIdx > 0) {
      const ramp = isSoftB ? DEFAULT_BARULHO_FADEIN_SEC : BARULHO_PARTNER_ATTACK_RAMP_SEC;
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(velocity, time + ramp);
    } else {
      gainNode.gain.setValueAtTime(velocity, time);
    }
    source.start(time, entrySec);
    ctx.barulho.activeBarulhoNodes.set(barKey, source);
    ctx.barulho.activeBarulhoGains.set(barKey, gainNode);
    ctx.barulho.activeBarulhoCoords.set(barKey, isSoftB ? 0 : originCoord);
    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, Infinity));
  } else {
    ctx.scheduledHits.add(source);
    const hasCustomStepDur = typeof maxPreviewDurSec === 'number' && maxPreviewDurSec !== 0;
    const isApitoPreCut = instrumentId === 'apito' && typeof maxPreviewDurSec === 'number' && maxPreviewDurSec < 0;
    const rawHoldSec = typeof maxPreviewDurSec === 'number' ? Math.abs(maxPreviewDurSec) : 0;
    const holdDurSec = hasCustomStepDur ? Math.max(instrumentId === 'apito' ? 0.008 : 0.045, rawHoldSec) : 0.77;
    const fadeOutSec = instrumentId === 'apito'
      ? (isApitoPreCut ? 0.012 : 0.014)
      : (hasCustomStepDur ? 0.028 : 0.18);
    const holdEnd = time + holdDurSec, expectedEnd = holdEnd + fadeOutSec;

    ctx.barulho.activeBarulhoNodes.set(barKey, source);
    ctx.barulho.activeBarulhoGains.set(barKey, gainNode);
    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

    gainNode.gain.cancelScheduledValues(time);
    if (isSoftB || decorrelIdx > 0) {
      const baseRamp = isSoftB ? DEFAULT_BARULHO_FADEIN_SEC : BARULHO_PARTNER_ATTACK_RAMP_SEC;
      const fadeInSec = hasCustomStepDur ? Math.min(baseRamp, holdDurSec * 0.45) : baseRamp;
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(velocity, time + fadeInSec);
    } else {
      gainNode.gain.setValueAtTime(velocity, time);
    }
    gainNode.gain.setValueAtTime(velocity, holdEnd);
    gainNode.gain.linearRampToValueAtTime(0, expectedEnd);
    source.start(time, entrySec);
    source.stop(expectedEnd + 0.01);

    const baseVoiceKey = trackId !== null ? trackId : instrumentId;
    const voiceKey = playerIdx > 0 ? `${baseVoiceKey}__p${playerIdx}` : baseVoiceKey;
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
    extraCleanup?.();
    ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
    const mapping = ctx.activeGainNodes.get(source);
    if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
    ctx.activeGainNodes.delete(source);
    ctx.voiceGuard.removeActiveVoice(instrumentId, source);
    if (ctx.barulho.activeBarulhoNodes.get(barKey) === source) {
      ctx.barulho.activeBarulhoNodes.delete(barKey);
      ctx.barulho.activeBarulhoGains.delete(barKey);
      ctx.barulho.activeBarulhoCoords.delete(barKey);
    }
  };
}
