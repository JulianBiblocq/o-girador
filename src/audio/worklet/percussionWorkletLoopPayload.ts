/**
 * percussionWorkletLoopPayload.ts — Construction du message `LOAD_SAMPLE` (one-shot vs boucle cos/sin) (< 48 lignes).
 */
import { bakeBarulhoChannelPcm, isBarulhoSamplePath, resolveBarulhoLoopRegion } from '../barulho/barulhoLoopRegionAnalyzer';
import { LoopLabInstrumentId, resolveLoopInstrumentFromPath } from '../engine/barulhoLoopRegistry';
import { LoadSampleMessage } from './percussionWorkletTypes';

export const LOOP_KEY_PREFIX = 'loop::';

export function isLoopSampleKeyMatchingInstrument(key: string, instId: LoopLabInstrumentId): boolean {
  const isLoopKey = key.startsWith(LOOP_KEY_PREFIX);
  const rawPath = isLoopKey ? key.slice(LOOP_KEY_PREFIX.length) : key;
  if (!isLoopKey && !isBarulhoSamplePath(rawPath)) return false;
  return resolveLoopInstrumentFromPath(rawPath) === instId;
}

export function buildWorkletLoadSampleMessage(sampleId: number, key: string, audioBuffer: AudioBuffer): LoadSampleMessage {
  const sr = audioBuffer.sampleRate > 0 ? audioBuffer.sampleRate : 48000;
  const isExplicitLoop = key.startsWith(LOOP_KEY_PREFIX);
  const rawPath = isExplicitLoop ? key.slice(LOOP_KEY_PREFIX.length) : key;

  if (isExplicitLoop || isBarulhoSamplePath(rawPath)) {
    const raw0 = audioBuffer.getChannelData(0);
    const reg = resolveBarulhoLoopRegion(raw0, sr, rawPath);
    const ch0 = bakeBarulhoChannelPcm(raw0, reg);
    const ch1 = audioBuffer.numberOfChannels > 1 ? bakeBarulhoChannelPcm(audioBuffer.getChannelData(1), reg) : null;
    return {
      type: 'LOAD_SAMPLE', sampleId, ch0, ch1, sampleRate: sr,
      bodyStartFrame: reg.bodyStartFrame, loopResumeFrame: reg.loopResumeFrame,
      loopWrapFrame: reg.loopWrapFrame, softEntryFrame: reg.softEntryFrame,
    };
  }

  return {
    type: 'LOAD_SAMPLE', sampleId,
    ch0: new Float32Array(audioBuffer.getChannelData(0)),
    ch1: audioBuffer.numberOfChannels > 1 ? new Float32Array(audioBuffer.getChannelData(1)) : null,
    sampleRate: sr, bodyStartFrame: 0, loopResumeFrame: 0, loopWrapFrame: 0, softEntryFrame: 0,
  };
}
