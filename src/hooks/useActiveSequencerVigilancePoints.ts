/**
 * Hook de sélection stricte des points de vigilance actifs dans le séquenceur (< 50 lignes).
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePaperVigilanceStore, VigilancePoint } from '../stores/usePaperVigilanceStore';
import { useSequencerStore } from '../stores/useSequencerStore';

export function useActiveSequencerVigilancePoints(): VigilancePoint[] {
  const activeScoreId = usePaperVigilanceStore((s) => s.activeSequencerScoreId);
  const allPoints = usePaperVigilanceStore((s) => s.points);
  const tracks = useSequencerStore((s) => s.tracks);

  return useMemo(() => {
    if (!activeScoreId || allPoints.length === 0 || tracks.length === 0) return [];
    const validTrackMap = new Map<number, Set<number>>();
    tracks.forEach((t) => {
      validTrackMap.set(t.id, new Set(t.patterns.map((p) => p.id)));
    });

    return allPoints.filter((pt) => {
      if (pt.scoreId !== activeScoreId || !pt.trackId || !pt.patternId) return false;
      const patterns = validTrackMap.get(pt.trackId);
      return patterns ? patterns.has(pt.patternId) : false;
    });
  }, [activeScoreId, allPoints, tracks]);
}
