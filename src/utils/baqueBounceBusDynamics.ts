/**
 * baqueBounceBusDynamics.ts — Compression hors-ligne des stems de Bus & repli stéréo du Bounce WAV (< 70 lignes).
 * Exécute `processBusCompressorBlock` (même noyau que le Worklet live) sur chaque Bus compressé,
 * du plus profond au plus haut, puis somme chaque stem dans son parent avec fader & polarité post-compression.
 */
import { processBusCompressorOffline } from '../audio/worklet/bus-compressor/busCompressorDspCore';
import { toBusCompressorDspParams } from '../audio/effects/busCompressorSanitizer';
import { resolveBusStemReturn, type BounceBusStemPlan, type StemTrackLike } from './baqueBounceBusStems';

interface ChannelDataSource {
  readonly numberOfChannels: number;
  getChannelData(channel: number): Float32Array<ArrayBuffer>;
}

export function mixdownBounceBusStems(
  rendered: ChannelDataSource, plan: BounceBusStemPlan, allTracks: StemTrackLike[], sampleRate: number
): { chL: Float32Array<ArrayBuffer>; chR: Float32Array<ArrayBuffer>; maxGrDbByBus: Map<string, number> } {
  const maxGrDbByBus = new Map<string, number>();
  for (const busId of plan.busOrder) {
    const s = plan.stemIndexByBus.get(busId);
    const bus = allTracks.find((t) => String(t.id) === busId);
    if (s === undefined || !bus || 2 * s + 1 >= rendered.numberOfChannels) continue;
    const L = rendered.getChannelData(2 * s), R = rendered.getChannelData(2 * s + 1);
    const { maxGrDb } = processBusCompressorOffline(L, R, sampleRate, toBusCompressorDspParams(bus.busCompressor, false), true);
    maxGrDbByBus.set(busId, maxGrDb);

    const ret = resolveBusStemReturn(busId, allTracks, plan);
    const k = ret.gain * ret.sign;
    if (k === 0) continue;
    const tL = rendered.getChannelData(2 * ret.targetStem), tR = rendered.getChannelData(2 * ret.targetStem + 1);
    for (let i = 0; i < L.length; i++) { tL[i] += L[i] * k; tR[i] += R[i] * k; }
  }
  return { chL: rendered.getChannelData(0), chR: rendered.getChannelData(1), maxGrDbByBus };
}

/** Rendu multi-stems -> AudioBuffer stéréo final (identité stricte si aucun Bus compressé). */
export function collapseBounceStemsToStereo(
  ctx: BaseAudioContext, rendered: AudioBuffer, plan: BounceBusStemPlan, allTracks: StemTrackLike[]
): AudioBuffer {
  if (plan.busOrder.length === 0 || rendered.numberOfChannels <= 2) return rendered;
  const { chL, chR } = mixdownBounceBusStems(rendered, plan, allTracks, rendered.sampleRate);
  const out = ctx.createBuffer(2, rendered.length, rendered.sampleRate);
  out.copyToChannel(chL, 0);
  out.copyToChannel(chR, 1);
  return out;
}
