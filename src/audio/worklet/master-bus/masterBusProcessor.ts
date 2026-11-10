/**
 * O Girador - Processeur AudioWorklet Master Bus Studio & Noyau Partagé Live / Offline (< 135 lignes)
 * - Zéro allocation GC dans `process()`, retourne toujours `true` (anti-sommeil navigateur).
 * - Compensation d'entrée `+4.5 dB` (`CONSOLE_MAKEUP_GAIN`) + Sommation `MONO` pré-Stage 3 & pré-télémétrie.
 */

import {
  CONSOLE_MAKEUP_GAIN, MASTER_TELEMETRY_INTERVAL_FRAMES,
  MasterBusDspParams, MasterBusDspState, MasterBusInboundMessage, MasterBusTelemetryMessage,
  createMasterBusDspState, resetMasterBusDspState, updateMasterBusDspParams,
} from './masterBusWorkletTypes';
import { processMasterStage1CrossoverAndShaper } from './masterBusCrossoverAndShaper';
import { processMasterStage2DuckingAndGlue } from './masterBusGlueCompressor';
import { processMasterStage3AdaaAndLimiter } from './masterBusAdaaLimiter';

interface WorkletMessageEvent<T> { readonly data: T }
interface WorkletPort {
  onmessage: ((event: WorkletMessageEvent<MasterBusInboundMessage>) => void) | null;
  postMessage(message: MasterBusTelemetryMessage): void;
}
declare abstract class AudioWorkletProcessor {
  readonly port: WorkletPort;
  constructor();
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(name: string, processorCtor: new () => AudioWorkletProcessor): void;
declare const sampleRate: number;

export function processMasterBusDspBlock(
  state: MasterBusDspState,
  in0L: Float32Array | null, in0R: Float32Array | null,
  in1L: Float32Array | null, in1R: Float32Array | null,
  outL: Float32Array, outR: Float32Array, numFrames: number
): void {
  const makeup = state.params.compensateConsoleHeadroom === false ? 1 : CONSOLE_MAKEUP_GAIN;
  const g = (state.params.masterGainLin ?? 1) * makeup;
  for (let i = 0; i < numFrames; i++) {
    const l = (in0L ? in0L[i] : 0) * g;
    outL[i] = l;
    outR[i] = (in0R ? in0R[i] * g : l);
  }

  processMasterStage1CrossoverAndShaper(state, outL, outR, numFrames);
  processMasterStage2DuckingAndGlue(state, outL, outR, in1L, in1R, numFrames);

  if (state.params.monoCheck) {
    const avgPrev = 0.5 * (state.adaaPrevL + state.adaaPrevR);
    state.adaaPrevL = avgPrev;
    state.adaaPrevR = avgPrev;
    for (let i = 0; i < numFrames; i++) {
      const mono = 0.5 * (outL[i] + outR[i]);
      outL[i] = mono;
      outR[i] = mono;
    }
  }

  processMasterStage3AdaaAndLimiter(state, outL, outR, numFrames);

  let pL = state.accumPeakL, pR = state.accumPeakR, sqL = state.accumSumSqL, sqR = state.accumSumSqR;
  for (let i = 0; i < numFrames; i++) {
    const yL = outL[i], yR = outR[i], aL = Math.abs(yL), aR = Math.abs(yR);
    if (aL > pL) pL = aL;
    if (aR > pR) pR = aR;
    sqL += yL * yL; sqR += yR * yR;
  }
  state.accumPeakL = pL; state.accumPeakR = pR; state.accumSumSqL = sqL; state.accumSumSqR = sqR;
  if (state.currentGrDb > state.accumMaxGrDb) state.accumMaxGrDb = state.currentGrDb;
  if (state.currentDuckDb > state.accumMaxDuckDb) state.accumMaxDuckDb = state.currentDuckDb;
  state.telemetryFrames += numFrames;
}

export function processOfflineStereoArraysThroughMasterBus(
  chL: Float32Array, chR: Float32Array, sr: number,
  params?: Partial<MasterBusDspParams>, scL?: Float32Array | null, scR?: Float32Array | null
): MasterBusDspState {
  const state = createMasterBusDspState(sr);
  if (params) updateMasterBusDspParams(state, params);
  for (let offset = 0; offset < chL.length; offset += 128) {
    const len = Math.min(128, chL.length - offset);
    const subL = chL.subarray(offset, offset + len), subR = chR.subarray(offset, offset + len);
    const subScL = scL ? scL.subarray(offset, offset + len) : null;
    const subScR = scR ? scR.subarray(offset, offset + len) : null;
    processMasterBusDspBlock(state, subL, subR, subScL, subScR, subL, subR, len);
  }
  return state;
}

const BaseWorkletProcessor: typeof AudioWorkletProcessor =
  typeof AudioWorkletProcessor !== 'undefined'
    ? AudioWorkletProcessor
    : (class { readonly port: WorkletPort = { onmessage: null, postMessage() {} }; } as unknown as typeof AudioWorkletProcessor);

export class MasterBusWorkletProcessor extends BaseWorkletProcessor {
  private readonly state = createMasterBusDspState(typeof sampleRate === 'number' ? sampleRate : 48000);

  constructor() {
    super();
    this.port.onmessage = (event: WorkletMessageEvent<MasterBusInboundMessage>) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'UPDATE_PARAMS') updateMasterBusDspParams(this.state, msg.params);
      else if (msg.type === 'RESET_STATE') resetMasterBusDspState(this.state);
    };
  }

  public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const outL = out[0], outR = out.length > 1 ? out[1] : out[0];
    const in0 = inputs[0], in1 = inputs[1];
    processMasterBusDspBlock(
      this.state,
      in0?.[0] ?? null, in0 && in0.length > 1 ? in0[1] : (in0?.[0] ?? null),
      in1?.[0] ?? null, in1 && in1.length > 1 ? in1[1] : (in1?.[0] ?? null),
      outL, outR, outL.length
    );

    if (this.state.telemetryFrames >= MASTER_TELEMETRY_INTERVAL_FRAMES) {
      const s = this.state, n = Math.max(1, s.telemetryFrames);
      this.port.postMessage({
        type: 'TELEMETRY', peakL: s.accumPeakL, peakR: s.accumPeakR,
        rmsL: Math.sqrt(s.accumSumSqL / n), rmsR: Math.sqrt(s.accumSumSqR / n),
        grDb: s.accumMaxGrDb, duckDb: s.accumMaxDuckDb,
      });
      s.telemetryFrames = 0; s.accumPeakL = 0; s.accumPeakR = 0;
      s.accumSumSqL = 0; s.accumSumSqR = 0; s.accumMaxGrDb = 0; s.accumMaxDuckDb = 0;
    }
    return true;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor('master-bus-processor', MasterBusWorkletProcessor);
}
