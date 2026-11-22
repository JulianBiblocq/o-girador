/**
 * usePanSquadTicks.ts — Calcul des repères radiaux de pupitre sur la couronne d'un `PanKnob` (< 110 lignes).
 * - Sélecteur Zustand 100 % primitif (`string`) pour `useSyncExternalStore` (React 19) : 0 allocation en `getSnapshot`,
 *   0 boucle infinie et 0 re-render lorsque le volume ou les patterns d'autres pistes changent.
 */
import { useCallback, useMemo } from 'react';
import { isSectionEnsembleEligible } from '../../constants/sectionEnsembleLimits';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import type { TrackGroup } from '../../types';

export interface PanCrownTickSpec {
  baseOffset: number;
  isLeader: boolean;
}

export const EMPTY_SQUAD_TICKS: readonly PanCrownTickSpec[] = Object.freeze([]);

const clampPan = (v: number): number => Math.max(-100, Math.min(100, Math.round(v)));

function resolvePlayerBasePan(x: number, panVal?: number): number {
  return typeof panVal === 'number' && Number.isFinite(panVal) ? clampPan(panVal) : clampPan((x - 50) * 2);
}

function collectTrackVoiceBasePans(track: TrackGroup): Array<{ pan: number; isLeader: boolean }> {
  const inst = instrumentsConfig[track.instrumentIdx];
  const trackPan = track.panVal ?? track.pan ?? 0;
  if (track.sectionPlayers && track.sectionPlayers.length > 1 && isSectionEnsembleEligible(inst?.id, inst?.type)) {
    return track.sectionPlayers.map((p, idx) => ({
      pan: clampPan(resolvePlayerBasePan(p.x, p.panVal) + trackPan),
      isLeader: idx === 0,
    }));
  }
  return [{ pan: clampPan(trackPan), isLeader: Boolean(track.isLinkMaster) }];
}

export function resolvePanCrownTicksForTrack(
  tracks: readonly TrackGroup[],
  trackId?: number
): PanCrownTickSpec[] {
  if (trackId === undefined) return [];
  const track = tracks.find((t) => t.id === trackId);
  if (!track) return [];

  if ((track.isBusFolder || track.isLinkFolder) && track.isFolded) {
    const pid = String(track.id);
    const children = tracks.filter(
      (c) => !c.isBusFolder && !c.isLinkFolder && !c.isHidden && (String(c.busId) === pid || String(c.linkedToTrackId) === pid)
    );
    const voices = children.flatMap((c) => collectTrackVoiceBasePans(c));
    if (voices.length < 2) return [];
    const hasExplicitLeader = voices.some((v) => v.isLeader);
    return voices.map((v, idx) => ({ baseOffset: v.pan, isLeader: hasExplicitLeader ? v.isLeader : idx === 0 }));
  }

  if (track.isBusFolder || track.isLinkFolder) return [];

  const inst = instrumentsConfig[track.instrumentIdx];
  if (track.sectionPlayers && track.sectionPlayers.length > 1 && isSectionEnsembleEligible(inst?.id, inst?.type)) {
    return track.sectionPlayers.map((p, idx) => ({
      baseOffset: resolvePlayerBasePan(p.x, p.panVal),
      isLeader: idx === 0,
    }));
  }

  if (track.isLinkMaster) {
    const masterPan = track.panVal ?? track.pan ?? 0;
    const folderId = track.linkedToTrackId;
    const slaves = tracks.filter(
      (s) => s.id !== track.id && !s.isBusFolder && !s.isLinkFolder && !s.isHidden &&
        (String(s.linkedToTrackId) === String(track.id) || (folderId && String(s.linkedToTrackId) === String(folderId)))
    );
    if (slaves.length === 0) return [];
    return [
      { baseOffset: 0, isLeader: true },
      ...slaves.flatMap((s) => collectTrackVoiceBasePans(s).map((v) => ({ baseOffset: clampPan(v.pan - masterPan), isLeader: false }))),
    ];
  }

  return [];
}

export function serializePanCrownTicks(tracks: readonly TrackGroup[], trackId?: number): string {
  const ticks = resolvePanCrownTicksForTrack(tracks, trackId);
  if (ticks.length === 0) return '';
  return ticks.map((t) => `${t.baseOffset}:${t.isLeader ? 1 : 0}`).join('|');
}

export function parsePanCrownTicksKey(ticksKey: string): readonly PanCrownTickSpec[] {
  if (!ticksKey) return EMPTY_SQUAD_TICKS;
  return Object.freeze(
    ticksKey.split('|').map((part) => {
      const [offStr, leadStr] = part.split(':');
      return { baseOffset: Number(offStr) || 0, isLeader: leadStr === '1' };
    })
  );
}

export function usePanSquadTicks(trackId?: number): readonly PanCrownTickSpec[] {
  const selectKey = useCallback((s: { tracks: TrackGroup[] }) => serializePanCrownTicks(s.tracks, trackId), [trackId]);
  const ticksKey = useSequencerStore(selectKey);
  return useMemo(() => parsePanCrownTicksKey(ticksKey), [ticksKey]);
}
