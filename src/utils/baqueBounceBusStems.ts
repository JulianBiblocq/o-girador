/**
 * baqueBounceBusStems.ts — Plan de stems multi-canaux du Bounce pour les Bus compressés & Polarité Ø (< 130 lignes).
 * Les pistes d'un Bus compressé sont rendues Pré-Fader-Bus sur une paire de canaux dédiée de l'OfflineAudioContext,
 * puis compressées hors-ligne par le noyau DSP partagé avec le Worklet (cf. baqueBounceBusDynamics).
 */
import { faderPositionToGain } from './audioMath';
import { multiplyPolarity, type PolaritySign } from './audio/polarityGain';
import type { BusCompressorSettings } from '../audio/effects/busCompressorTypes';

export interface StemTrackLike {
  id: number | string;
  busId?: string;
  linkedToTrackId?: string;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
  phaseInverted?: boolean;
  volumeVal?: number;
  busCompressor?: BusCompressorSettings;
}

export interface BounceBusStemPlan {
  /** Bus compressés, du plus profond au plus haut (traitement enfant avant parent). */
  busOrder: string[];
  /** Index de stem (1..K) par Bus ; 0 = somme principale. */
  stemIndexByBus: Map<string, number>;
  totalChannels: number;
}

/** OfflineAudioContext : 32 canaux max => 1 paire principale + 15 bus compressés. */
export const MAX_BOUNCE_COMP_STEMS = 15;
export const EMPTY_BOUNCE_STEM_PLAN: BounceBusStemPlan = { busOrder: [], stemIndexByBus: new Map(), totalChannels: 2 };

/** Ancêtres (parent immédiat d'abord) via `busId || linkedToTrackId`, identique à `getEffectiveVolume`. */
export function getAncestorChain<T extends StemTrackLike>(track: T, allTracks: T[]): T[] {
  const chain: T[] = [];
  const visited = new Set<string>([String(track.id)]);
  let current: T | undefined = track;
  while (current) {
    const pid: string | undefined = current.busId || current.linkedToTrackId;
    if (!pid || visited.has(String(pid))) break;
    const parent: T | undefined = allTracks.find((t) => String(t.id) === String(pid));
    if (!parent) break;
    visited.add(String(pid));
    chain.push(parent);
    current = parent;
  }
  return chain;
}

const isCompressedGroup = (t: StemTrackLike) => Boolean((t.isBusFolder || t.isLinkFolder) && t.busCompressor?.enabled);
const faderGain = (t: StemTrackLike) => faderPositionToGain(t.volumeVal ?? 75);

export function planBounceBusStems(allTracks: StemTrackLike[], baqueTracks: StemTrackLike[], disableFx: boolean): BounceBusStemPlan {
  if (disableFx) return EMPTY_BOUNCE_STEM_PLAN;
  const depthById = new Map<string, number>();
  for (const track of baqueTracks) {
    for (const bus of getAncestorChain(track, allTracks)) {
      const id = String(bus.id);
      if (isCompressedGroup(bus) && !depthById.has(id)) depthById.set(id, getAncestorChain(bus, allTracks).length);
    }
  }
  if (depthById.size === 0) return EMPTY_BOUNCE_STEM_PLAN;
  const busOrder = Array.from(depthById.keys())
    .sort((a, b) => depthById.get(b)! - depthById.get(a)!)
    .slice(0, MAX_BOUNCE_COMP_STEMS);
  const stemIndexByBus = new Map<string, number>();
  busOrder.forEach((id, i) => stemIndexByBus.set(id, i + 1));
  return { busOrder, stemIndexByBus, totalChannels: 2 + 2 * busOrder.length };
}

export interface OfflineTrackRouting {
  stemIndex: number;
  /** Signe de polarité appliqué sur l'entrée de la piste (piste x bus intermédiaires non compressés). */
  sign: PolaritySign;
  /** Retire les faders du Bus compressé et de ses ancêtres (ré-appliqués post-compression). */
  stemScale: number;
}

export function resolveOfflineTrackRouting(track: StemTrackLike, allTracks: StemTrackLike[], plan: BounceBusStemPlan): OfflineTrackRouting {
  const chain = getAncestorChain(track, allTracks);
  const idx = chain.findIndex((b) => plan.stemIndexByBus.has(String(b.id)));
  if (idx < 0) return { stemIndex: 0, sign: multiplyPolarity(track, ...chain), stemScale: 1 };
  const aboveGain = chain.slice(idx).reduce((g, b) => g * faderGain(b), 1);
  return {
    stemIndex: plan.stemIndexByBus.get(String(chain[idx].id))!,
    sign: multiplyPolarity(track, ...chain.slice(0, idx)),
    stemScale: aboveGain > 1e-6 ? 1 / aboveGain : 0,
  };
}

export interface BusStemReturn { gain: number; sign: PolaritySign; targetStem: number }

/** Retour post-compression d'un Bus : son fader (+ intermédiaires) jusqu'au prochain Bus compressé ou la somme. */
export function resolveBusStemReturn(busId: string, allTracks: StemTrackLike[], plan: BounceBusStemPlan): BusStemReturn {
  const bus = allTracks.find((t) => String(t.id) === busId);
  if (!bus) return { gain: 0, sign: 1, targetStem: 0 };
  const segment: StemTrackLike[] = [bus];
  let targetStem = 0;
  for (const anc of getAncestorChain(bus, allTracks)) {
    const idx = plan.stemIndexByBus.get(String(anc.id));
    if (idx !== undefined) { targetStem = idx; break; }
    segment.push(anc);
  }
  return { gain: segment.reduce((g, b) => g * faderGain(b), 1), sign: multiplyPolarity(...segment), targetStem };
}

/** Une entrée stéréo par stem, aiguillée vers sa paire de canaux discrets (0 = destination directe sans stems). */
export function createOfflineStemInputs(ctx: BaseAudioContext, plan: BounceBusStemPlan): AudioNode[] {
  if (plan.busOrder.length === 0) return [ctx.destination];
  try { ctx.destination.channelInterpretation = 'discrete'; } catch (_) {}
  const merger = ctx.createChannelMerger(plan.totalChannels);
  merger.connect(ctx.destination);
  const stems: AudioNode[] = [];
  for (let s = 0; s <= plan.busOrder.length; s++) {
    const g = ctx.createGain();
    g.channelCount = 2; g.channelCountMode = 'explicit'; g.channelInterpretation = 'speakers';
    const splitter = ctx.createChannelSplitter(2);
    g.connect(splitter);
    splitter.connect(merger, 0, 2 * s);
    splitter.connect(merger, 1, 2 * s + 1);
    stems.push(g);
  }
  return stems;
}

