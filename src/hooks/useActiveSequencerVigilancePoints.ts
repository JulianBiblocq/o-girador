/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hook de sélection stricte des points de vigilance actifs dans le séquenceur (< 50 lignes).
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePaperVigilanceStore, VigilancePoint } from '../stores/usePaperVigilanceStore';
import { useSequencerStore } from '../stores/useSequencerStore';

export function useActiveSequencerVigilancePoints(): VigilancePoint[] {
  const activeScoreId = usePaperVigilanceStore((s) => s.activeSequencerScoreId);
  const points = usePaperVigilanceStore(
    useShallow((s) => {
      if (!s.activeSequencerScoreId) return [];
      return s.points.filter(
        (p) => p.scoreId === s.activeSequencerScoreId && p.trackId !== undefined && p.patternId !== undefined
      );
    })
  );

  const tracks = useSequencerStore(
    useShallow((s) => s.tracks.map((t) => ({ id: t.id, patternIds: t.patterns.map((p) => p.id) })))
  );

  return useMemo(() => {
    if (!activeScoreId || points.length === 0 || tracks.length === 0) return [];
    const validTrackMap = new Map<number, Set<number>>();
    tracks.forEach((t) => {
      validTrackMap.set(t.id, new Set(t.patternIds));
    });

    return points.filter((pt) => {
      if (!pt.trackId || !pt.patternId) return false;
      const patterns = validTrackMap.get(pt.trackId);
      return patterns ? patterns.has(pt.patternId) : false;
    });
  }, [activeScoreId, points, tracks]);
}
