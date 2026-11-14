/**
 * baqueBounceBusDynamics.ts — Chaîne d'insert hors-ligne des stems de Bus & repli stéréo du Bounce WAV (< 65 lignes).
 * Exécute la chaîne complète (Polarité Ø -> Coupe-Bas -> EQ 3 bandes -> BusCompressor -> Fader & Pan)
 * sur chaque Bus du plus profond au plus haut, en parité exacte avec `syncBusInsertChain` + `busChannels`.
 */
import {
  applyBusCompressorInPlace,
  applyBusInsertEqInPlace,
  sumBusStemWithPanInto,
} from './baqueBounceBusInsertDsp';
import { resolveBusStemReturn, type BounceBusStemPlan, type StemTrackLike } from './baqueBounceBusStems';

export interface BounceBusInsertOptions {
  disableEq?: boolean;
  disableFx?: boolean;
}

interface ChannelDataSource {
  readonly numberOfChannels: number;
  getChannelData(channel: number): Float32Array<ArrayBuffer>;
}

export function mixdownBounceBusStems(
  rendered: ChannelDataSource,
  plan: BounceBusStemPlan,
  allTracks: StemTrackLike[],
  sampleRate: number,
  opts: BounceBusInsertOptions = {}
): { chL: Float32Array<ArrayBuffer>; chR: Float32Array<ArrayBuffer>; maxGrDbByBus: Map<string, number> } {
  const disableEq = Boolean(opts.disableEq);
  const disableFx = Boolean(opts.disableFx);
  const maxGrDbByBus = new Map<string, number>();

  for (const busId of plan.busOrder) {
    const s = plan.stemIndexByBus.get(busId);
    const bus = allTracks.find((t) => String(t.id) === busId);
    if (s === undefined || !bus || 2 * s + 1 >= rendered.numberOfChannels) continue;
    const L = rendered.getChannelData(2 * s), R = rendered.getChannelData(2 * s + 1);

    applyBusInsertEqInPlace(L, R, sampleRate, bus, disableEq);
    const maxGrDb = applyBusCompressorInPlace(L, R, sampleRate, bus, disableFx);
    maxGrDbByBus.set(busId, maxGrDb);

    const ret = resolveBusStemReturn(busId, allTracks, plan);
    const k = ret.gain * ret.sign;
    if (k === 0) continue;
    const tL = rendered.getChannelData(2 * ret.targetStem), tR = rendered.getChannelData(2 * ret.targetStem + 1);
    sumBusStemWithPanInto(L, R, tL, tR, k, bus.panVal ?? bus.pan);
  }
  return { chL: rendered.getChannelData(0), chR: rendered.getChannelData(1), maxGrDbByBus };
}

/** Rendu multi-stems -> AudioBuffer stéréo final (identité stricte si aucun Bus actif). */
export function collapseBounceStemsToStereo(
  ctx: BaseAudioContext,
  rendered: AudioBuffer,
  plan: BounceBusStemPlan,
  allTracks: StemTrackLike[],
  opts: BounceBusInsertOptions = {}
): AudioBuffer {
  if (plan.busOrder.length === 0 || rendered.numberOfChannels <= 2) return rendered;
  const { chL, chR } = mixdownBounceBusStems(rendered, plan, allTracks, rendered.sampleRate, opts);
  const out = ctx.createBuffer(2, rendered.length, rendered.sampleRate);
  out.copyToChannel(chL, 0);
  out.copyToChannel(chR, 1);
  return out;
}
