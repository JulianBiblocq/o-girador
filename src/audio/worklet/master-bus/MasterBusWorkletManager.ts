/**
 * O Girador - Orchestrateur Main Thread du MasterBusWorkletProcessor (< 135 lignes)
 * - Charge `virtual:master-bus-worklet-code` via Blob URL sur le vrai `window.AudioContext` natif
 *   en utilisant `unwrapNativeAudioContext` et `unwrapNativeAudioNode`.
 * - Expose la télémétrie 30 Hz sans jamais déclencher de re-render React.
 */

import masterBusWorkletIIFECode from 'virtual:master-bus-worklet-code';
import { unwrapNativeAudioContext, unwrapNativeAudioNode } from '../percussionWorkletSlotRouter';
import {
  DEFAULT_MASTER_BUS_DSP_PARAMS,
  MasterBusDspParams,
  MasterBusTelemetryMessage,
  MasterBusTelemetrySnapshot,
  UpdateMasterBusParamsMessage,
} from './masterBusWorkletTypes';

export { masterBusWorkletIIFECode };
export type MasterBusTelemetryListener = (snapshot: MasterBusTelemetrySnapshot) => void;

export class MasterBusWorkletManager {
  private workletNode: AudioWorkletNode | null = null;
  private input0Bridge: GainNode | null = null;
  private input1Bridge: GainNode | null = null;
  private outputBridge: GainNode | null = null;
  private _isReady = false;
  private initPromise: Promise<boolean> | null = null;
  private currentParams: MasterBusDspParams = { ...DEFAULT_MASTER_BUS_DSP_PARAMS };
  private lastTelemetry: MasterBusTelemetrySnapshot = {
    peakL: 0, peakR: 0, rmsL: 0, rmsR: 0, grDb: 0, duckDb: 0,
  };
  private readonly listeners = new Set<MasterBusTelemetryListener>();

  public get isReady(): boolean { return this._isReady && this.workletNode !== null; }
  public get latestTelemetry(): MasterBusTelemetrySnapshot { return this.lastTelemetry; }
  public get nativeInput0(): GainNode | null { return this.input0Bridge; }
  public get nativeInput1(): GainNode | null { return this.input1Bridge; }
  public get nativeOutput(): GainNode | null { return this.outputBridge; }

  public subscribeTelemetry(fn: MasterBusTelemetryListener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  public init(audioContext: AudioContext, initialParams?: Partial<MasterBusDspParams>): Promise<boolean> {
    if (initialParams) Object.assign(this.currentParams, initialParams);
    if (this._isReady && this.workletNode) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;

    const hasWin = typeof window !== 'undefined';
    const isSecure = hasWin ? window.isSecureContext !== false : true;
    const nativeCtx = unwrapNativeAudioContext(audioContext);
    const NativeCtxCtor = hasWin ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    const isNativeCtx = Boolean(
      nativeCtx && (!hasWin || (NativeCtxCtor && nativeCtx instanceof window.BaseAudioContext && nativeCtx.constructor === NativeCtxCtor))
    );
    if (!isSecure || !isNativeCtx || !nativeCtx?.audioWorklet?.addModule) {
      this._isReady = false;
      return Promise.resolve(false);
    }

    const blobUrl = URL.createObjectURL(new Blob([masterBusWorkletIIFECode], { type: 'application/javascript; charset=utf-8' }));
    const p: Promise<boolean> = nativeCtx.audioWorklet.addModule(blobUrl).then(() => {
      const WorkletNodeCtor = (hasWin && window.AudioWorkletNode) || AudioWorkletNode;
      const node = new WorkletNodeCtor(nativeCtx, 'master-bus-processor', {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      node.onprocessorerror = (err) => console.error('[MasterBusWorklet] Processor runtime error:', err);
      node.port.onmessage = (e: MessageEvent<MasterBusTelemetryMessage>) => {
        const d = e.data;
        if (d && d.type === 'TELEMETRY') {
          this.lastTelemetry = d;
          this.listeners.forEach((cb) => cb(d));
        }
      };

      this.input0Bridge = nativeCtx.createGain();
      this.input1Bridge = nativeCtx.createGain();
      this.outputBridge = nativeCtx.createGain();
      this.input0Bridge.connect(node, 0, 0);
      this.input1Bridge.connect(node, 0, 1);
      node.connect(this.outputBridge, 0, 0);

      this.workletNode = node;
      this._isReady = true;
      this.updateParams(this.currentParams);
      return true;
    }).catch((err) => {
      console.error('[MasterBusWorklet] Failed to initialize AudioWorklet:', err);
      this._isReady = false; this.workletNode = null;
      return false;
    }).finally(() => {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      this.initPromise = null;
    });
    this.initPromise = p;
    return p;
  }

  public connectSourceToInput(source: unknown, inputIndex: 0 | 1 = 0): boolean {
    const nativeSrc = unwrapNativeAudioNode(source);
    const bridge = inputIndex === 0 ? this.input0Bridge : this.input1Bridge;
    if (!nativeSrc || !bridge) return false;
    try { nativeSrc.connect(bridge); return true; } catch (_) { return false; }
  }

  public connectOutputToTarget(target: unknown): boolean {
    const nativeTarget = unwrapNativeAudioNode(target);
    if (!nativeTarget || !this.outputBridge) return false;
    try { this.outputBridge.connect(nativeTarget); return true; } catch (_) { return false; }
  }

  public updateParams(patch: Partial<MasterBusDspParams>): void {
    Object.assign(this.currentParams, patch);
    if (!this.workletNode) return;
    const msg: UpdateMasterBusParamsMessage = { type: 'UPDATE_PARAMS', params: patch };
    try { this.workletNode.port.postMessage(msg); } catch (_) {}
  }

  public dispose(): void {
    this._isReady = false; this.initPromise = null;
    try { this.input0Bridge?.disconnect(); this.input1Bridge?.disconnect(); this.outputBridge?.disconnect(); } catch (_) {}
    if (this.workletNode) {
      try { this.workletNode.port.onmessage = null; this.workletNode.disconnect(); } catch (_) {}
      this.workletNode = null;
    }
    this.input0Bridge = null; this.input1Bridge = null; this.outputBridge = null;
    this.listeners.clear();
  }
}

