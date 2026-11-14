import { Track } from '../../types';
import { channels, busChannels, trackInputs, busInputs } from './audioEngineNodes';
import { disposeTrackNodes } from '../../audio/effectsChain';

export function pruneOrphanAudioNodes(
  tracks: readonly Track[],
  lastAppliedTracksParamsRef: { current: Record<string | number, string> },
  lastAppliedBussesRef: { current: Record<string | number, string | number | null> }
): number {
  const activeIds = new Set<string>();
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (t && t.id !== undefined && t.id !== null) {
      activeIds.add(String(t.id));
    }
  }

  const orphanKeys = new Set<string>();
  const dicts: Record<string | number, any>[] = [channels, busChannels, trackInputs, busInputs];
  for (const dict of dicts) {
    if (!dict) continue;
    for (const rawKey of Object.keys(dict)) {
      if (!activeIds.has(rawKey)) {
        orphanKeys.add(rawKey);
      }
    }
  }

  if (orphanKeys.size === 0) return 0;

  orphanKeys.forEach((rawKey) => {
    const numKey = Number(rawKey);
    const resolvedId: number | string = Number.isFinite(numKey) && String(numKey) === rawKey ? numKey : rawKey;
    disposeTrackNodes(resolvedId);
    delete lastAppliedTracksParamsRef.current[rawKey];
    delete lastAppliedTracksParamsRef.current[resolvedId];
    delete lastAppliedTracksParamsRef.current[`eq_${rawKey}`];
    delete lastAppliedTracksParamsRef.current[`eq_bus_${rawKey}`];
    delete lastAppliedBussesRef.current[rawKey];
    delete lastAppliedBussesRef.current[resolvedId];
  });

  return orphanKeys.size;
}
