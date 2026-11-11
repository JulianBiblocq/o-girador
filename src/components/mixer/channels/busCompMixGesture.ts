/**
 * busCompMixGesture.ts — Logique pure du geste « Tirette COMP » (mix parallèle) hors cycle React (< 80 lignes).
 * - 1 seul point d'Undo par geste (au `pointerdown`), puis mises à jour `skipUndo`.
 * - L'archétype est transmis explicitement : seul `mixPct` bouge => le nom d'archétype reste lisible (pas de `custom`).
 */
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { BUS_COMPRESSOR_ARCHETYPES, detectBusArchetypeForGroup } from '../../../audio/effects/busCompressorArchetypes';
import type { BusCompressorArchetypeId } from '../../../audio/effects/busCompressorTypes';

const DEFAULT_MIX_PCT = 75;

export function pointerToMixPct(clientX: number, left: number, width: number): number {
  if (!Number.isFinite(clientX) || !Number.isFinite(left) || !(width > 0)) return DEFAULT_MIX_PCT;
  const ratio = (clientX - left) / width;
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

/** Valeur nominale du mix : 85 % Toada, 70 % Sementes, 75 % sinon (y compris `custom`). */
export function getArchetypeDefaultMix(archetype: BusCompressorArchetypeId | undefined): number {
  if (!archetype || archetype === 'custom') return DEFAULT_MIX_PCT;
  return BUS_COMPRESSOR_ARCHETYPES[archetype]?.mixPct ?? DEFAULT_MIX_PCT;
}

function resolveArchetype(trackId: number): BusCompressorArchetypeId | null {
  const { tracks } = useSequencerStore.getState();
  const bus = tracks.find((t) => t.id === trackId);
  if (!bus || (!bus.isBusFolder && !bus.isLinkFolder)) return null;
  return bus.busCompressor?.archetype ?? detectBusArchetypeForGroup(bus, tracks);
}

const safePct = (pct: number) => (Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : DEFAULT_MIX_PCT);

/** Début de geste : point d'Undo unique + activation automatique d'un compresseur éteint. */
export function beginBusCompMixGesture(trackId: number, pct: number): void {
  const archetype = resolveArchetype(trackId);
  if (!archetype) return;
  const store = useSequencerStore.getState();
  store.pushUndoState();
  store.updateBusCompressor(trackId, { enabled: true, mixPct: safePct(pct), archetype }, { skipUndo: true });
}

/** Mise à jour en cours de geste (sans Undo, archétype conservé). */
export function commitBusCompMix(trackId: number, pct: number): void {
  const archetype = resolveArchetype(trackId);
  if (!archetype) return;
  useSequencerStore.getState().updateBusCompressor(trackId, { mixPct: safePct(pct), archetype }, { skipUndo: true });
}

/** Double-clic : retour à la valeur nominale de l'archétype du bus (avec point d'Undo). */
export function resetBusCompMixToDefault(trackId: number): number | null {
  const archetype = resolveArchetype(trackId);
  if (!archetype) return null;
  const mixPct = getArchetypeDefaultMix(archetype);
  useSequencerStore.getState().updateBusCompressor(trackId, { mixPct, archetype });
  return mixPct;
}

