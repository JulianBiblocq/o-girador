/**
 * rodaSpectralSubBus.ts — Sous-bus légers `BiquadFilterNode` natifs partagés par `(role, destination)` (< 128 lignes).
 * - Zéro surcharge par voix Worklet, zéro recâblage en lecture (`setTargetAtTime` à `0.03 s`).
 * - Parité stricte entre le routage Live (`Tone.connect`) et le rendu WAV hors-ligne (`OfflineAudioContext`).
 */
import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import {
  computeFormationSignature, isSpectralBreathingRole, RodaSpectralPlan,
  solveRodaSpectralBreathing, SpectralBiquadSpec, SpectralBreathingRole,
} from './rodaSpectralBreathingSolver';

interface LiveRoleSpectralSubBus {
  role: SpectralBreathingRole;
  destKey: string;
  targetNode: unknown;
  filters: BiquadFilterNode[];
}

const liveSubBuses = new Map<string, LiveRoleSpectralSubBus>();
let lastSignature = '';
let cachedPlan: RodaSpectralPlan | null = null;

function createFilterChain(ctx: BaseAudioContext, specs: readonly SpectralBiquadSpec[]): BiquadFilterNode[] {
  const nodes: BiquadFilterNode[] = [];
  for (let i = 0; i < specs.length; i++) {
    const sp = specs[i], f = ctx.createBiquadFilter();
    f.type = sp.type; f.Q.value = sp.q; f.frequency.value = sp.frequencyHz; f.gain.value = sp.gainDb;
    if (i > 0) nodes[i - 1].connect(f);
    nodes.push(f);
  }
  return nodes;
}

function rampParamSmooth(param: AudioParam, target: number, now: number): void {
  if (!Number.isFinite(target)) return;
  try {
    if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
    if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(target, now, 0.03);
    else param.value = target;
  } catch { try { param.value = target; } catch { /* ignore */ } }
}

function applySpecsToFilters(filters: readonly BiquadFilterNode[], specs: readonly SpectralBiquadSpec[], now: number): void {
  const len = Math.min(filters.length, specs.length);
  for (let i = 0; i < len; i++) {
    const f = filters[i], sp = specs[i];
    if (f.type !== sp.type) f.type = sp.type;
    f.Q.value = sp.q;
    rampParamSmooth(f.frequency, sp.frequencyHz, now);
    rampParamSmooth(f.gain, sp.gainDb, now);
  }
}

export function connectChannelThroughRodaSubBus(
  channelNode: any, instrumentId: string, destKey: string, targetNode: any,
  allTracks: readonly TrackGroup[], effectiveBreathingAmount: number, disableEq = false
): void {
  if (!channelNode || !targetNode) return;
  if (!isSpectralBreathingRole(instrumentId)) { channelNode.connect(targetNode); return; }
  if (!cachedPlan) {
    cachedPlan = solveRodaSpectralBreathing(allTracks, effectiveBreathingAmount, disableEq);
    lastSignature = computeFormationSignature(allTracks, effectiveBreathingAmount, disableEq);
  }
  const key = `${instrumentId}::${destKey}`;
  let sub = liveSubBuses.get(key);
  if (!sub) {
    const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
    const filters = createFilterChain(rawCtx, cachedPlan[instrumentId]);
    Tone.connect(filters[filters.length - 1], targetNode);
    sub = { role: instrumentId, destKey, targetNode, filters };
    liveSubBuses.set(key, sub);
  } else if (sub.targetNode !== targetNode) {
    const tail = sub.filters[sub.filters.length - 1];
    try { tail.disconnect(); } catch { /* ignore */ }
    Tone.connect(tail, targetNode);
    sub.targetNode = targetNode;
  }
  Tone.connect(channelNode, sub.filters[0]);
}

export function syncLiveRodaSpectralSubBuses(
  allTracks: readonly TrackGroup[], effectiveBreathingAmount: number, disableEq = false, force = false
): void {
  const sig = computeFormationSignature(allTracks, effectiveBreathingAmount, disableEq);
  if (!force && sig === lastSignature && cachedPlan) return;
  lastSignature = sig;
  cachedPlan = solveRodaSpectralBreathing(allTracks, effectiveBreathingAmount, disableEq);
  if (liveSubBuses.size === 0) return;
  const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
  const now = rawCtx?.currentTime ?? 0;
  liveSubBuses.forEach((sub) => applySpecsToFilters(sub.filters, cachedPlan![sub.role], now));
}

export function disposeAllRodaSpectralSubBuses(): void {
  liveSubBuses.forEach((sub) => {
    for (let i = 0; i < sub.filters.length; i++) { try { sub.filters[i].disconnect(); } catch { /* ignore */ } }
  });
  liveSubBuses.clear(); lastSignature = ''; cachedPlan = null;
}

export function createOfflineRodaSpectralRouter(
  ctx: BaseAudioContext, allTracks: readonly TrackGroup[], stems: readonly AudioNode[],
  effectiveBreathingAmount: number, disableEq = false
): (instrumentId: string, stemIndex: number) => AudioNode {
  const plan = solveRodaSpectralBreathing(allTracks, effectiveBreathingAmount, disableEq);
  const cache = new Map<string, AudioNode>();
  return (instrumentId: string, stemIndex: number): AudioNode => {
    const baseDest = stems[stemIndex] ?? ctx.destination;
    if (!isSpectralBreathingRole(instrumentId)) return baseDest;
    const key = `${instrumentId}::${stemIndex}`;
    const existing = cache.get(key);
    if (existing) return existing;
    const specs = plan[instrumentId];
    if (specs.every((s) => s.gainDb === 0)) return baseDest;
    const filters = createFilterChain(ctx, specs);
    filters[filters.length - 1].connect(baseDest);
    cache.set(key, filters[0]);
    return filters[0];
  };
}
