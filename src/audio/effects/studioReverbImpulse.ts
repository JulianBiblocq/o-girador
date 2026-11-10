/**
 * studioReverbImpulse.ts
 * Orchestrateur Main Thread & Repli Synchrone pour la Réverbe à Convolution 3 espaces :
 * - Délègue la synthèse mathématique IR stéréo L2 au Web Worker `reverbIr.worker.ts` (0 ms Main Thread).
 * - Applique uniquement `ctx.createBuffer(2, length, sr)` (< 0.5 ms) + fondu 25 ms sur `wetGain` (< 125 lignes).
 */
import * as Tone from 'tone';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import {
  DEFAULT_REVERB_IR_OPTS,
  buildStudioAcousticImpulseArrays,
  type ReverbIrWorkerRequest,
  type ReverbIrWorkerResponse,
  type StudioReverbImpulseOptions,
} from './reverbIr.worker';

export { buildStudioAcousticImpulseArrays, DEFAULT_REVERB_IR_OPTS, type StudioReverbImpulseOptions };

let reverbIrWorker: Worker | null = null;
let globalIrRequestId = 0;
const pendingIrRequests = new Map<number, { reverbNode: any; immediate: boolean }>();

function applyBuffersToReverbNode(reverbNode: any, left: Float32Array, right: Float32Array, sr: number, immediate: boolean): void {
  try {
    const rawCtx: BaseAudioContext | undefined = reverbNode?._rawCtx;
    if (!rawCtx || !reverbNode?._convolver) return;
    const targetWet = reverbNode.wet?.value ?? 1;
    if (!immediate && reverbNode.wet) safeRampTo(reverbNode.wet, 0, 0.012);
    const buffer = rawCtx.createBuffer(2, left.length, sr);
    buffer.getChannelData(0).set(left);
    buffer.getChannelData(1).set(right);
    reverbNode._convolver.buffer = buffer;
    if (!immediate && reverbNode.wet) safeRampTo(reverbNode.wet, targetWet, 0.025);
  } catch { /* ignore */ }
}

function getReverbIrWorker(): Worker | null {
  if (reverbIrWorker) return reverbIrWorker;
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  try {
    reverbIrWorker = new Worker(new URL('./reverbIr.worker.ts', import.meta.url), { type: 'module' });
    reverbIrWorker.onmessage = (event: MessageEvent<ReverbIrWorkerResponse>) => {
      const res = event.data;
      if (!res) return;
      const pending = pendingIrRequests.get(res.id);
      pendingIrRequests.delete(res.id);
      if (!pending || pending.reverbNode._latestIrReqId !== res.id) return;
      applyBuffersToReverbNode(pending.reverbNode, res.left, res.right, res.sampleRate, pending.immediate);
    };
    return reverbIrWorker;
  } catch {
    return null;
  }
}

function requestAsyncOrSyncIrRebuild(reverbNode: any, immediate: boolean): void {
  const reqId = ++globalIrRequestId;
  reverbNode._latestIrReqId = reqId;
  const sr = reverbNode._rawCtx?.sampleRate || 48000;
  const worker = getReverbIrWorker();
  if (worker && !immediate) {
    pendingIrRequests.set(reqId, { reverbNode, immediate });
    const msg: ReverbIrWorkerRequest = { id: reqId, sampleRate: sr, opts: { ...reverbNode._reverbOpts } };
    worker.postMessage(msg);
    return;
  }
  const { chL, chR } = buildStudioAcousticImpulseArrays(sr, reverbNode._reverbOpts);
  applyBuffersToReverbNode(reverbNode, chL, chR, sr, immediate);
}

export function mapReverbTimeKnobToDecaySec(timeVal: number): number {
  const num = Number.isFinite(timeVal) ? timeVal : 35;
  if (num >= 0.4 && num <= 4.0) return num;
  return Number((0.4 + (Math.max(0, Math.min(100, num)) / 100) * 3.6).toFixed(3));
}

export function buildStudioAcousticImpulseBuffer(
  rawCtx: BaseAudioContext,
  optionsOrDecay: number | StudioReverbImpulseOptions = DEFAULT_REVERB_IR_OPTS
): AudioBuffer {
  const sr = rawCtx.sampleRate || 48000;
  const { chL, chR } = buildStudioAcousticImpulseArrays(sr, optionsOrDecay);
  const buffer = rawCtx.createBuffer(2, chL.length, sr);
  buffer.getChannelData(0).set(chL);
  buffer.getChannelData(1).set(chR);
  return buffer;
}

export function updateStudioReverbNode(reverbNode: any, patch: Partial<StudioReverbImpulseOptions>, immediate = false): void {
  if (!reverbNode?._convolver || !reverbNode?._reverbOpts) return;
  const cur: Required<StudioReverbImpulseOptions> = reverbNode._reverbOpts;
  const next: Required<StudioReverbImpulseOptions> = {
    decaySec: patch.decaySec !== undefined ? Math.max(0.4, Math.min(4.0, patch.decaySec)) : cur.decaySec,
    spaceType: patch.spaceType ?? cur.spaceType,
    preDelayMs: patch.preDelayMs !== undefined ? Math.max(0, Math.min(80, patch.preDelayMs)) : cur.preDelayMs,
    lowCutHz: patch.lowCutHz !== undefined ? Math.max(80, Math.min(250, patch.lowCutHz)) : cur.lowCutHz,
    dampHz: patch.dampHz !== undefined ? Math.max(2500, Math.min(12000, patch.dampHz)) : cur.dampHz,
    stereoWidth: patch.stereoWidth !== undefined ? Math.max(0, Math.min(100, patch.stereoWidth)) : cur.stereoWidth,
  };
  const changed =
    Math.abs(next.decaySec - cur.decaySec) > 1e-3 || next.spaceType !== cur.spaceType ||
    Math.abs(next.preDelayMs - cur.preDelayMs) > 0.1 || Math.abs(next.lowCutHz - cur.lowCutHz) > 0.5 ||
    Math.abs(next.dampHz - cur.dampHz) > 5 || Math.abs(next.stereoWidth - cur.stereoWidth) > 0.5;
  if (!changed) return;
  reverbNode._reverbOpts = next;
  reverbNode._latestIrReqId = ++globalIrRequestId;
  if (reverbNode._rebuildTimer) clearTimeout(reverbNode._rebuildTimer);
  if (immediate) { requestAsyncOrSyncIrRebuild(reverbNode, true); return; }
  reverbNode._rebuildTimer = setTimeout(() => requestAsyncOrSyncIrRebuild(reverbNode, false), 120);
}

export function createStudioConvolverReverb(): any {
  const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
  const inputGain = new Tone.Gain(1) as any, wetGain = new Tone.Gain(1), convolver = rawCtx.createConvolver();
  convolver.normalize = false;
  inputGain._rawCtx = rawCtx; inputGain._convolver = convolver; inputGain._reverbOpts = { ...DEFAULT_REVERB_IR_OPTS };
  const worker = getReverbIrWorker();
  if (worker) {
    convolver.buffer = rawCtx.createBuffer(2, 64, rawCtx.sampleRate || 48000);
    requestAsyncOrSyncIrRebuild(inputGain, false);
  } else {
    convolver.buffer = buildStudioAcousticImpulseBuffer(rawCtx, inputGain._reverbOpts);
  }
  Tone.connect(inputGain, convolver); Tone.connect(convolver, wetGain);
  inputGain.output = wetGain;
  Object.defineProperty(inputGain, 'decay', {
    get: () => inputGain._reverbOpts.decaySec,
    set: (val: number) => updateStudioReverbNode(inputGain, { decaySec: mapReverbTimeKnobToDecaySec(val) }),
    configurable: true,
  });
  inputGain.wet = wetGain.gain;
  inputGain.setWetSmooth = (w: number) => safeRampTo(wetGain.gain, Math.max(0, Math.min(1, w)), 0.025);
  inputGain.connect = (dest: any, ...a: any[]) => { wetGain.connect(dest, ...a); return inputGain; };
  inputGain.disconnect = (dest?: any, ...a: any[]) => { wetGain.disconnect(dest, ...a); return inputGain; };
  return inputGain;
}
