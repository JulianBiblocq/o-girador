/**
 * busCompressorInsert.ts — Insertion Post-EQ / Pré-Fader du BusCompressorWorkletNode dans chaque Bus (< 125 lignes).
 *
 * Prise (Tone.Gain) --SAC--> Pont de repli (Tone.Gain 1 -> 0) --SAC--> Fader & Pan Bus
 *        \--natif--> [ BusCompressorWorkletNode ] --natif--> outBridge (0 -> 1) --natif--> Entrée Fader
 *
 * - Instanciation paresseuse : aucun Worklet tant que `busCompressor` n'a jamais été configuré (son existant intact).
 * - Bascule repli -> Worklet par fondu croisé linéaire 20 ms à gain constant (signaux cohérents, 0 latence => 0 clic).
 * - Graphe stable en lecture : une fois câblé, le nœud reste en place ; bypass = rampe interne du Worklet.
 */
import * as Tone from 'tone';
import { busChannels, busCompFallbacks, busCompTaps } from './effectsChainNodes';
import { clearWiredBusInsert } from './busInsertChain';
import { unwrapNativeAudioNode } from '../worklet/percussionWorkletSlotRouter';
import { getBusCompManager } from '../worklet/bus-compressor/BusCompressorWorkletManager';
import type { BusCompressorDspParams } from '../worklet/bus-compressor/busCompressorDspState';
import type { BusCompressorSettings } from './busCompressorTypes';
import { toBusCompressorDspParams } from './busCompressorSanitizer';
import { connectBridgeToBusChannel, crossfadeToWorklet } from './busCompressorNativeBridge';

interface BusCompInsertEntry {
  status: 'pending' | 'active' | 'failed';
  params: BusCompressorDspParams;
  paramsKey: string;
  node: AudioWorkletNode | null;
  outBridge: GainNode | null;
  nativeTap: AudioNode | null;
  channel: unknown;
}

const hmrStore: Record<string, any> = ((globalThis as any).__OGIRADOR_AUDIO_NODES__ ||= {});
const inserts: Map<string, BusCompInsertEntry> = (hmrStore.busCompInserts ||= new Map());

const keyOf = (p: BusCompressorDspParams) =>
  `${p.enabled}_${p.ecoBypass}_${p.thresholdDb}_${p.ratio}_${p.attackMs}_${p.releaseMs}_${p.kneeDb}_${p.sidechainHpfHz}_${p.makeupDb}_${p.mixPct}`;

function connectOutput(entry: BusCompInsertEntry, busId: string | number): boolean {
  const channel = busChannels[busId];
  if (!entry.outBridge || !connectBridgeToBusChannel(entry.outBridge, channel)) return false;
  entry.channel = channel;
  return true;
}

function attachAsync(busId: string | number, entry: BusCompInsertEntry): void {
  const mgr = getBusCompManager();
  void mgr.ensureModule(Tone.getContext().rawContext).then((nativeCtx) => {
    if (inserts.get(String(busId)) !== entry) return;
    const tap = busCompTaps[busId], fallback = busCompFallbacks[busId];
    const nativeTap = tap ? unwrapNativeAudioNode(tap) : null;
    const node = nativeCtx && nativeTap && fallback ? mgr.createNode(busId, entry.params) : null;
    if (!nativeCtx || !nativeTap || !fallback || !node) { entry.status = 'failed'; return; }
    try {
      entry.outBridge = nativeCtx.createGain();
      entry.outBridge.gain.value = 0;
      nativeTap.connect(node);
      node.connect(entry.outBridge);
      if (!connectOutput(entry, busId)) throw new Error('bus channel has no native input');
      crossfadeToWorklet(nativeCtx, entry.outBridge, fallback);
      entry.node = node; entry.nativeTap = nativeTap; entry.status = 'active';
      entry.paramsKey = keyOf(entry.params);
      mgr.postParams(busId, entry.params);
    } catch (err) {
      console.error(`[BusCompressorInsert] Bus ${busId} worklet wiring failed, staying on fallback bridge:`, err);
      try { nativeTap.disconnect(node); } catch (_) {}
      try { entry.outBridge?.disconnect(); } catch (_) {}
      mgr.releaseNode(busId);
      entry.outBridge = null; entry.status = 'failed';
    }
  });
}

/** Synchronise (sans recâblage en lecture) les réglages du compresseur d'un Bus. */
export function syncBusCompressorInsert(
  busId: string | number, settings: BusCompressorSettings | undefined, disableFx: boolean
): void {
  const key = String(busId);
  let entry = inserts.get(key);
  if (!entry && (!settings || !busCompTaps[busId] || !busCompFallbacks[busId])) return;
  const params = toBusCompressorDspParams(settings, disableFx);
  if (!entry) {
    entry = { status: 'pending', params, paramsKey: '', node: null, outBridge: null, nativeTap: null, channel: null };
    inserts.set(key, entry);
    attachAsync(busId, entry);
    return;
  }
  entry.params = params;
  if (entry.status !== 'active') return;
  if (busChannels[busId] && busChannels[busId] !== entry.channel) connectOutput(entry, busId);
  const nextKey = keyOf(params);
  if (entry.paramsKey === nextKey) return;
  entry.paramsKey = nextKey;
  getBusCompManager().postParams(busId, params);
}

export function disposeBusCompressorInsert(busId: string | number): void {
  const key = String(busId);
  const entry = inserts.get(key);
  inserts.delete(key);
  if (entry) {
    try { if (entry.nativeTap && entry.node) entry.nativeTap.disconnect(entry.node); } catch (_) {}
    try { entry.outBridge?.disconnect(); } catch (_) {}
  }
  getBusCompManager().releaseNode(busId);
  clearWiredBusInsert(busId);
  for (const map of [busCompTaps, busCompFallbacks]) {
    if (map[busId]) { try { map[busId].disconnect(); map[busId].dispose(); } catch (_) {} delete map[busId]; }
  }
}

export function hasBusCompressorInsert(busId: string | number): boolean {
  return inserts.has(String(busId));
}

/** Libère les Worklets des Bus supprimés (zéro CPU orphelin). */
export function pruneOrphanBusCompressors(liveBusIds: ReadonlySet<string>): void {
  Array.from(inserts.keys()).forEach((k) => { if (!liveBusIds.has(k)) disposeBusCompressorInsert(k); });
}
