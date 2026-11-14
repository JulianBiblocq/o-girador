/**
 * barulhoLoopRegionAnalyzer.ts — Détection automatique de `[bodyStart, bodyEnd]` & pré-calcul
 * Constant-Power Crossfade (cos/sin 110 ms + point de garde C1) pour tous les samples Barulho (< 130 lignes).
 */

export interface BarulhoLoopRegion {
  bodyStartFrame: number;
  bodyEndFrame: number;
  xfadeFrames: number;
  loopResumeFrame: number;
  loopWrapFrame: number;
  bodyStartSec: number;
  bodyEndSec: number;
  loopResumeSec: number;
  loopWrapSec: number;
}

export interface BakedBarulhoAudio {
  buffer: AudioBuffer;
  region: BarulhoLoopRegion;
}

const DEFAULT_XFADE_SEC = 0.110;
const bakedBufferCache = new WeakMap<AudioBuffer, BakedBarulhoAudio>();

export function isBarulhoSamplePath(path: string): boolean {
  if (!path) return false;
  return /(?:^|[/\s_-])B\.(?:ogg|m4a|wav)(?:\?.*)?$/i.test(path.trim());
}

function computeWindowRmsDb(pcm: Float32Array, start: number, len: number): number {
  const end = Math.min(pcm.length, start + len);
  const count = end - start;
  if (count <= 0) return -120;
  let sumSq = 0;
  for (let i = start; i < end; i++) {
    const v = pcm[i];
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / count);
  return rms > 1e-7 ? 20 * Math.log10(rms) : -120;
}

export function analyzeBarulhoLoopRegion(pcm: Float32Array, sampleRate: number): BarulhoLoopRegion {
  const sr = sampleRate > 0 ? sampleRate : 48000;
  const total = pcm.length;
  const dur = total / sr;
  const win40 = Math.max(16, Math.round(0.040 * sr));
  const step20 = Math.max(8, Math.round(0.020 * sr));

  const midStart = Math.floor(total * 0.30);
  const midEnd = Math.floor(total * 0.65);
  const midRms: number[] = [];
  for (let s = midStart; s + win40 <= midEnd; s += step20) {
    midRms.push(computeWindowRmsDb(pcm, s, win40));
  }
  midRms.sort((a, b) => a - b);
  const medianRmsDb = midRms.length > 0 ? midRms[midRms.length >>> 1] : -34;

  const step10 = Math.max(4, Math.round(0.010 * sr));
  const minStart = Math.min(Math.floor(total * 0.25), Math.round(0.220 * sr));
  const maxStart = Math.min(Math.floor(total * 0.42), Math.round(Math.min(0.450, dur * 0.40) * sr));
  let bodyStartFrame = Math.min(Math.floor(total * 0.28), Math.round(0.260 * sr));

  for (let s = minStart; s + win40 * 2 <= maxStart; s += step10) {
    const r0 = computeWindowRmsDb(pcm, s, win40);
    const r1 = computeWindowRmsDb(pcm, s + step20, win40);
    if (r0 <= medianRmsDb + 2.5 && r1 <= medianRmsDb + 3.0) {
      bodyStartFrame = s + Math.round(0.020 * sr);
      break;
    }
  }

  const win80 = Math.max(32, Math.round(0.080 * sr));
  const minBodySpan = Math.max(win80 * 2, Math.round(Math.min(0.400, dur * 0.35) * sr));
  let bodyEndFrame = Math.max(bodyStartFrame + minBodySpan, Math.floor(total * 0.72));

  for (let s = total - win80; s >= bodyStartFrame + minBodySpan; s -= step20) {
    if (computeWindowRmsDb(pcm, s, win80) >= medianRmsDb - 2.5) {
      bodyEndFrame = Math.min(total - 2, s + win80 - Math.round(0.040 * sr));
      break;
    }
  }
  bodyEndFrame = Math.max(bodyStartFrame + 64, Math.min(total - 1, bodyEndFrame));

  const bodySpan = bodyEndFrame - bodyStartFrame;
  const xfadeFrames = Math.max(
    Math.min(32, Math.floor(bodySpan * 0.25)),
    Math.min(Math.round(DEFAULT_XFADE_SEC * sr), Math.floor(bodySpan * 0.35))
  );
  const loopResumeFrame = bodyStartFrame + xfadeFrames;
  const loopWrapFrame = bodyEndFrame;

  return {
    bodyStartFrame,
    bodyEndFrame,
    xfadeFrames,
    loopResumeFrame,
    loopWrapFrame,
    bodyStartSec: bodyStartFrame / sr,
    bodyEndSec: bodyEndFrame / sr,
    loopResumeSec: loopResumeFrame / sr,
    loopWrapSec: loopWrapFrame / sr,
  };
}

export function bakeBarulhoChannelPcm(pcm: Float32Array, region: BarulhoLoopRegion): Float32Array {
  const { bodyStartFrame, loopResumeFrame, loopWrapFrame, xfadeFrames } = region;
  const out = new Float32Array(loopWrapFrame + 1);
  const xfadeStart = loopWrapFrame - xfadeFrames;
  out.set(pcm.subarray(0, xfadeStart), 0);

  const halfPiOverW = (Math.PI * 0.5) / Math.max(1, xfadeFrames);
  for (let k = 0; k < xfadeFrames; k++) {
    const theta = k * halfPiOverW;
    out[xfadeStart + k] = Math.cos(theta) * pcm[xfadeStart + k] + Math.sin(theta) * pcm[bodyStartFrame + k];
  }
  out[loopWrapFrame] = pcm[Math.min(pcm.length - 1, loopResumeFrame)];
  return out;
}

export function getOrBakeBarulhoAudioBuffer(ctx: BaseAudioContext, rawBuffer: AudioBuffer): BakedBarulhoAudio {
  const cached = bakedBufferCache.get(rawBuffer);
  if (cached) return cached;
  const sr = rawBuffer.sampleRate > 0 ? rawBuffer.sampleRate : ctx.sampleRate;
  const region = analyzeBarulhoLoopRegion(rawBuffer.getChannelData(0), sr);
  const nCh = Math.max(1, rawBuffer.numberOfChannels);
  const bakedLen = region.loopWrapFrame + 1;
  const bakedBuf = ctx.createBuffer(nCh, bakedLen, sr);
  for (let c = 0; c < nCh; c++) {
    bakedBuf.copyToChannel(bakeBarulhoChannelPcm(rawBuffer.getChannelData(c), region) as Float32Array<ArrayBuffer>, c);
  }
  const entry: BakedBarulhoAudio = { buffer: bakedBuf, region };
  bakedBufferCache.set(rawBuffer, entry);
  return entry;
}
