/**
 * busCompressorProcessor.ts — AudioWorkletProcessor du Compresseur VCA de Bus (bundle IIFE autonome, < 100 lignes).
 * - Zéro allocation GC dans `process()`, retourne toujours `true` (anti-sommeil navigateur).
 * - Un processeur par Bus : 1 entrée stéréo, 1 sortie stéréo, 0 sample de latence.
 */
import {
  DEFAULT_BUS_COMPRESSOR_DSP_PARAMS,
  createBusCompressorDspState,
  mergeBusCompressorDspParams,
  resetBusCompressorDspState,
} from './busCompressorDspState';
import { processBusCompressorBlock } from './busCompressorDspCore';
import {
  BUS_COMP_PROCESSOR_NAME,
  BUS_COMP_TELEMETRY_INTERVAL_FRAMES,
  BusCompInboundMessage,
  BusCompProcessorOptions,
  BusCompTelemetryMessage,
} from './busCompressorWorkletTypes';

interface WorkletMessageEvent<T> { readonly data: T }
interface WorkletPort {
  onmessage: ((event: WorkletMessageEvent<BusCompInboundMessage>) => void) | null;
  postMessage(message: BusCompTelemetryMessage): void;
}
declare abstract class AudioWorkletProcessor {
  readonly port: WorkletPort;
  constructor(options?: { processorOptions?: BusCompProcessorOptions });
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(name: string, processorCtor: new (options?: any) => AudioWorkletProcessor): void;
declare const sampleRate: number;

const BaseWorkletProcessor: typeof AudioWorkletProcessor =
  typeof AudioWorkletProcessor !== 'undefined'
    ? AudioWorkletProcessor
    : (class { readonly port: WorkletPort = { onmessage: null, postMessage() {} }; } as unknown as typeof AudioWorkletProcessor);

export class BusCompressorWorkletProcessor extends BaseWorkletProcessor {
  private readonly sr = typeof sampleRate === 'number' ? sampleRate : 48000;
  private readonly params = { ...DEFAULT_BUS_COMPRESSOR_DSP_PARAMS };
  private readonly state = createBusCompressorDspState(this.sr);
  private readonly telemetry: BusCompTelemetryMessage = { type: 'GR', grDb: 0 };
  private accumGrDb = 0;
  private framesSinceTelemetry = 0;
  private lastPostedGrDb = -1;

  constructor(options?: { processorOptions?: BusCompProcessorOptions }) {
    super(options);
    const initial = options?.processorOptions?.params;
    if (initial) mergeBusCompressorDspParams(this.params, initial);
    this.port.onmessage = (event: WorkletMessageEvent<BusCompInboundMessage>) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'UPDATE_PARAMS') mergeBusCompressorDspParams(this.params, msg.params);
      else if (msg.type === 'RESET_STATE') resetBusCompressorDspState(this.state);
    };
  }

  public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const outL = out[0], outR = out.length > 1 ? out[1] : out[0];
    const input = inputs[0];
    if (!input || input.length === 0 || !input[0]) {
      outL.fill(0); if (outR !== outL) outR.fill(0);
      return true;
    }
    const inL = input[0], inR = input.length > 1 ? input[1] : null;
    const gr = processBusCompressorBlock(inL, inR, outL, outR, this.params, this.state, this.sr);
    if (gr > this.accumGrDb) this.accumGrDb = gr;

    this.framesSinceTelemetry += outL.length;
    if (this.framesSinceTelemetry >= BUS_COMP_TELEMETRY_INTERVAL_FRAMES) {
      const value = this.accumGrDb;
      if (value !== 0 || this.lastPostedGrDb !== 0) {
        this.telemetry.grDb = value;
        this.port.postMessage(this.telemetry);
        this.lastPostedGrDb = value;
      }
      this.accumGrDb = 0;
      this.framesSinceTelemetry = 0;
    }
    return true;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor(BUS_COMP_PROCESSOR_NAME, BusCompressorWorkletProcessor);
}

