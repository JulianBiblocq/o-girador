/**
 * busDynamicsKnobLogic.ts — Logique temps réel, nominaux d'archétype & Undo des 7 potentiomètres Bus (< 125 lignes).
 * - Audio immédiat (`previewBusCompressorParams`) pendant le glissement + throttle Zustand (`80 ms`, 1 seul Undo).
 * - Double-clic individuel : réinitialise uniquement le paramètre ciblé au nominal `detectBusArchetypeForGroup`.
 */
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { BUS_COMPRESSOR_ARCHETYPES, buildArchetypeSettings, detectBusArchetypeForGroup } from '../../../audio/effects/busCompressorArchetypes';
import { clampFinite, sanitizeBusCompressorSettings } from '../../../audio/effects/busCompressorSanitizer';
import { BUS_COMPRESSOR_NUMERIC_KEYS, BUS_COMPRESSOR_RANGES, type BusCompressorPresetArchetypeId, type BusCompressorSettings } from '../../../audio/effects/busCompressorTypes';

export type BusCompressorKnobKey =
  | 'thresholdDb' | 'ratio' | 'attackMs' | 'releaseMs' | 'sidechainHpfHz' | 'makeupDb' | 'mixPct';
export type BusPreviewFn = (busId: number, patch: Partial<BusCompressorSettings>) => void;

type TrackLite = {
  id: number | string; instrumentIdx?: number; customName?: string;
  busId?: string | number; linkedToTrackId?: string | number;
  isBusFolder?: boolean; isLinkFolder?: boolean; busCompressor?: BusCompressorSettings;
};

const STORE_THROTTLE_MS = 80;

export function resolveEffectiveBusCompressor(busTrack: TrackLite, allTracks: TrackLite[]): BusCompressorSettings {
  if (busTrack.busCompressor) return sanitizeBusCompressorSettings(busTrack.busCompressor);
  return buildArchetypeSettings(detectBusArchetypeForGroup(busTrack as any, allTracks as any), false);
}

export function getBusNaturalNominal(
  busTrack: TrackLite,
  allTracks: TrackLite[]
): { archetype: BusCompressorPresetArchetypeId; nominal: Readonly<Omit<BusCompressorSettings, 'enabled' | 'archetype'>> } {
  const archetype = detectBusArchetypeForGroup(busTrack as any, allTracks as any);
  return { archetype, nominal: BUS_COMPRESSOR_ARCHETYPES[archetype] };
}

export function buildKnobParamPatch(
  current: BusCompressorSettings,
  naturalArchetype: BusCompressorPresetArchetypeId,
  key: BusCompressorKnobKey,
  rawVal: number
): Partial<BusCompressorSettings> {
  const [min, max] = BUS_COMPRESSOR_RANGES[key];
  const safeVal = clampFinite(rawVal, min, max, current[key]);
  const candidate = { ...current, [key]: safeVal };
  const nominal = BUS_COMPRESSOR_ARCHETYPES[naturalArchetype];
  const matchesNominal = BUS_COMPRESSOR_NUMERIC_KEYS.every((k) => Math.abs(candidate[k] - nominal[k]) < 1e-6);
  return { [key]: safeVal, archetype: matchesNominal ? naturalArchetype : 'custom' };
}

/** Réinitialise un unique paramètre à la valeur nominale de l'archétype naturel du bus (avec point d'Undo). */
export function resetBusCompressorParamToNominal(
  busTrackId: number, key: BusCompressorKnobKey, preview?: BusPreviewFn
): number | null {
  const { tracks, updateBusCompressor } = useSequencerStore.getState();
  const bus = tracks.find((t) => t.id === busTrackId);
  if (!bus || (!bus.isBusFolder && !bus.isLinkFolder)) return null;
  const current = resolveEffectiveBusCompressor(bus, tracks);
  const { archetype, nominal } = getBusNaturalNominal(bus, tracks);
  const nominalVal = nominal[key];
  const patch = buildKnobParamPatch(current, archetype, key, nominalVal);
  preview?.(busTrackId, patch);
  updateBusCompressor(busTrackId, patch);
  return nominalVal;
}

export interface KnobGestureSession {
  activeKey: BusCompressorKnobKey | null;
  lastWriteMs: number;
  pendingPatch: Partial<BusCompressorSettings> | null;
  timer: ReturnType<typeof setTimeout> | null;
}

export function onBusKnobAudioDrag(
  session: KnobGestureSession, trackId: number, key: BusCompressorKnobKey, val: number,
  onUserTweak?: () => void, preview?: BusPreviewFn
): void {
  const store = useSequencerStore.getState();
  const bus = store.tracks.find((t) => t.id === trackId);
  if (!bus || (!bus.isBusFolder && !bus.isLinkFolder)) return;
  const current = resolveEffectiveBusCompressor(bus, store.tracks);
  const { archetype } = getBusNaturalNominal(bus, store.tracks);
  const patch = buildKnobParamPatch(current, archetype, key, val);
  preview?.(trackId, patch);

  if (session.activeKey !== key) {
    if (Math.abs((patch[key] as number) - current[key]) < 1e-6 && Boolean(bus.busCompressor)) return;
    session.activeKey = key;
    store.pushUndoState();
    onUserTweak?.();
  }
  session.pendingPatch = patch;
  const now = performance.now();
  if (now - session.lastWriteMs >= STORE_THROTTLE_MS) {
    session.lastWriteMs = now;
    session.pendingPatch = null;
    store.updateBusCompressor(trackId, patch, { skipUndo: true });
  } else if (!session.timer) {
    session.timer = setTimeout(() => {
      session.timer = null;
      session.lastWriteMs = performance.now();
      const latest = session.pendingPatch;
      session.pendingPatch = null;
      if (latest) useSequencerStore.getState().updateBusCompressor(trackId, latest, { skipUndo: true });
    }, STORE_THROTTLE_MS);
  }
}

export function onBusKnobCommit(
  session: KnobGestureSession, trackId: number, key: BusCompressorKnobKey, val: number,
  onUserTweak?: () => void, preview?: BusPreviewFn
): void {
  if (session.timer) { clearTimeout(session.timer); session.timer = null; }
  session.pendingPatch = null;
  const store = useSequencerStore.getState();
  const bus = store.tracks.find((t) => t.id === trackId);
  if (!bus || (!bus.isBusFolder && !bus.isLinkFolder)) return;
  const current = resolveEffectiveBusCompressor(bus, store.tracks);
  const { archetype } = getBusNaturalNominal(bus, store.tracks);
  const patch = buildKnobParamPatch(current, archetype, key, val);
  preview?.(trackId, patch);
  if (session.activeKey === key) {
    session.activeKey = null;
    store.updateBusCompressor(trackId, patch, { skipUndo: true });
  } else if (Math.abs((patch[key] as number) - current[key]) >= 1e-6 || !bus.busCompressor) {
    onUserTweak?.();
    store.updateBusCompressor(trackId, patch);
  }
}
