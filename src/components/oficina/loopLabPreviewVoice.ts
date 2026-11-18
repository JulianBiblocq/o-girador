/**
 * loopLabPreviewVoice.ts — Gestionnaire bas-niveau de voix Web Audio bouclée (`playbackRate = 1.0`) pour le Labo Boucles (< 75 lignes).
 */
import * as Tone from 'tone';
import { getOrBakeBarulhoAudioBuffer } from '../../audio/barulho/barulhoLoopRegionAnalyzer';
import { LoopLabInstrumentId } from '../../audio/engine/barulhoLoopRegistry';
import { fetchSampleWithRetry, resolveSampleFetchPath } from '../../audio/engine/sampleFetchUtils';
import { masterVolumeNode } from '../../audio/effectsChain';
import { unwrapNativeAudioNode } from '../../audio/worklet/percussionWorkletSlotRouter';
import { audioEngine } from '../../hooks/useAudioSync';

export interface ActiveLoopLabVoice {
  ctx: AudioContext;
  src: AudioBufferSourceNode;
  gain: GainNode;
  startedAtSec: number;
  entrySec: number;
  loopResumeSec: number;
  loopWrapSec: number;
}

export function fadeAndDisposeLoopLabVoice(v: ActiveLoopLabVoice | null, rampSec = 0.030): void {
  if (!v) return;
  try {
    const now = v.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + rampSec);
    v.src.stop(now + rampSec + 0.005);
    setTimeout(() => { try { v.src.disconnect(); v.gain.disconnect(); } catch { /* ignore */ } }, Math.ceil((rampSec + 0.02) * 1000));
  } catch {
    try { v.src.disconnect(); v.gain.disconnect(); } catch { /* ignore */ }
  }
}

export function startLoopLabVoice(
  buf: AudioBuffer, instId: LoopLabInstrumentId, mode: 'attack' | 'soft', seamlessSwap: boolean
): ActiveLoopLabVoice | null {
  const ctx = audioEngine?.getAudioContext() || ((Tone.getContext().rawContext || Tone.context) as unknown as AudioContext);
  if (!ctx) return null;
  if (ctx.state !== 'running') ctx.resume?.().catch(() => {});

  const baked = getOrBakeBarulhoAudioBuffer(ctx, buf, instId);
  const src = ctx.createBufferSource(), gain = ctx.createGain();
  src.buffer = baked.buffer; src.playbackRate.value = 1.0; src.loop = true;
  src.loopStart = baked.region.loopResumeSec; src.loopEnd = baked.region.loopWrapSec;

  const nativeMaster = masterVolumeNode ? unwrapNativeAudioNode(masterVolumeNode) : null;
  src.connect(gain);
  try { gain.connect(nativeMaster || ctx.destination); } catch { gain.connect(ctx.destination); }

  const now = ctx.currentTime, targetGain = 0.72;
  const entrySec = seamlessSwap ? baked.region.loopResumeSec : (mode === 'soft' ? baked.region.softEntrySec : 0);
  if (mode === 'soft' || seamlessSwap) {
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + (seamlessSwap ? 0.030 : 0.140));
  } else {
    gain.gain.setValueAtTime(targetGain, now);
  }
  src.start(now, entrySec);
  return {
    ctx, src, gain, startedAtSec: now, entrySec,
    loopResumeSec: baked.region.loopResumeSec, loopWrapSec: baked.region.loopWrapSec,
  };
}

export async function decodeLoopLabAudioBuffer(samplePath: string): Promise<AudioBuffer | null> {
  if (audioEngine) {
    await audioEngine.loadPath(samplePath);
    const pooled = audioEngine.bufferPool.get(samplePath);
    const buf = (typeof (pooled as any)?.get === 'function' ? (pooled as any).get() : pooled) as AudioBuffer | undefined;
    if (buf) { audioEngine.workletManager.registerSampleBuffer(samplePath, buf); return buf; }
  }
  const ctx = audioEngine?.getAudioContext() || ((Tone.getContext().rawContext || Tone.context) as unknown as AudioContext);
  const res = await fetchSampleWithRetry(resolveSampleFetchPath(samplePath));
  const decoded = await ctx.decodeAudioData(await res.arrayBuffer());
  audioEngine?.workletManager.registerSampleBuffer(samplePath, decoded);
  return decoded;
}
