/**
 * BusCompressorWorkletManager.ts — Orchestrateur Main Thread des Compresseurs VCA de Bus (< 125 lignes).
 * - Charge `virtual:bus-compressor-worklet-code` une seule fois par contexte natif (Blob URL, Dev = Prod).
 * - Un `AudioWorkletNode` par Bus ; télémétrie `grDb` par `busTrackId` lue sans aucun re-render React.
 * - Singleton porté par `globalThis.__giradorBusCompManager__` : survit proprement au HMR Vite.
 */
import busCompressorWorkletIIFECode from 'virtual:bus-compressor-worklet-code';
import { unwrapNativeAudioContext } from '../percussionWorkletSlotRouter';
import type { BusCompressorDspParams } from './busCompressorDspState';
import {
  BUS_COMP_PROCESSOR_NAME,
  BusCompTelemetryMessage,
  UpdateBusCompParamsMessage,
} from './busCompressorWorkletTypes';

export class BusCompressorWorkletManager {
  private nativeCtx: AudioContext | null = null;
  private moduleReady = false;
  private modulePromise: Promise<AudioContext | null> | null = null;
  private readonly nodes = new Map<string, AudioWorkletNode>();
  private readonly grDb = new Map<string, number>();

  /** Résout le contexte natif une fois le module Worklet chargé (ou `null` si non supporté). */
  public ensureModule(audioContext: unknown): Promise<AudioContext | null> {
    const hasWin = typeof window !== 'undefined';
    const nativeCtx = unwrapNativeAudioContext(audioContext);
    const isSecure = hasWin ? window.isSecureContext !== false : true;
    if (!nativeCtx || !isSecure || !nativeCtx.audioWorklet?.addModule) return Promise.resolve(null);
    if (this.nativeCtx !== nativeCtx) this.resetForContext(nativeCtx);
    if (this.moduleReady) return Promise.resolve(nativeCtx);
    if (this.modulePromise) return this.modulePromise;

    const blobUrl = URL.createObjectURL(new Blob([busCompressorWorkletIIFECode], { type: 'application/javascript; charset=utf-8' }));
    const p = nativeCtx.audioWorklet.addModule(blobUrl).then(() => {
      if (this.nativeCtx !== nativeCtx) return null;
      this.moduleReady = true;
      return nativeCtx;
    }).catch((err) => {
      console.error('[BusCompressorWorklet] Failed to load AudioWorklet module:', err);
      return null;
    }).finally(() => {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      this.modulePromise = null;
    });
    this.modulePromise = p;
    return p;
  }

  public createNode(busId: string | number, initialParams: BusCompressorDspParams): AudioWorkletNode | null {
    const key = String(busId);
    const existing = this.nodes.get(key);
    if (existing) return existing;
    if (!this.moduleReady || !this.nativeCtx) return null;
    try {
      const Ctor = (typeof window !== 'undefined' && window.AudioWorkletNode) || AudioWorkletNode;
      const node = new Ctor(this.nativeCtx, BUS_COMP_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
        processorOptions: { params: { ...initialParams } },
      });
      node.onprocessorerror = (err) => console.error(`[BusCompressorWorklet] Bus ${key} processor error:`, err);
      node.port.onmessage = (e: MessageEvent<BusCompTelemetryMessage>) => {
        const d = e.data;
        if (d && d.type === 'GR') this.grDb.set(key, Number.isFinite(d.grDb) ? d.grDb : 0);
      };
      this.nodes.set(key, node);
      this.grDb.set(key, 0);
      return node;
    } catch (err) {
      console.error(`[BusCompressorWorklet] Failed to create node for bus ${key}:`, err);
      return null;
    }
  }

  public postParams(busId: string | number, params: BusCompressorDspParams): void {
    const key = String(busId);
    if (!params.enabled || params.ecoBypass) this.grDb.set(key, 0);
    const node = this.nodes.get(key);
    if (!node) return;
    const msg: UpdateBusCompParamsMessage = { type: 'UPDATE_PARAMS', params: { ...params } };
    try { node.port.postMessage(msg); } catch (_) {}
  }

  public getBusGrDb(busId: string | number): number {
    return this.grDb.get(String(busId)) ?? 0;
  }

  public hasNode(busId: string | number): boolean {
    return this.nodes.has(String(busId));
  }

  public releaseNode(busId: string | number): void {
    const key = String(busId);
    const node = this.nodes.get(key);
    if (node) {
      try { node.port.onmessage = null; node.disconnect(); } catch (_) {}
      this.nodes.delete(key);
    }
    this.grDb.delete(key);
  }

  public resetAllTelemetry(): void {
    this.grDb.forEach((_, k) => this.grDb.set(k, 0));
  }

  private resetForContext(nativeCtx: AudioContext): void {
    Array.from(this.nodes.keys()).forEach((k) => this.releaseNode(k));
    this.nativeCtx = nativeCtx;
    this.moduleReady = false;
    this.modulePromise = null;
  }
}

const GLOBAL_KEY = '__giradorBusCompManager__';

export function getBusCompManager(): BusCompressorWorkletManager {
  const g = globalThis as unknown as Record<string, BusCompressorWorkletManager | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new BusCompressorWorkletManager();
  return g[GLOBAL_KEY]!;
}

/** Réduction de gain courante (dB, >= 0) d'un Bus — `0` à l'arrêt, sans nœud ou quand `!enabled`. */
export function getBusGrDb(busTrackId: number | string): number {
  return getBusCompManager().getBusGrDb(busTrackId);
}

