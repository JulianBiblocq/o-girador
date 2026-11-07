/**
 * O Girador - Vocal IndexedDB Records Rehydration Scanner
 * Unification du cache vocal sous la clé canonique unique `${trackId}_${patternId}` (< 75 lignes).
 */

import { useAudioStore } from '../../stores/useAudioStore';

export class VocalIdbScanner {
  public static async scanRecords(
    records: any[],
    allTracks: any[],
    rawCtx: AudioContext,
    entriesToBatch: Array<{ key: string | number; buffer: AudioBuffer; blob?: Blob }>
  ): Promise<void> {
    for (const rec of records) {
      try {
        const pid = rec.patternId;
        const numPid = Number(pid);
        const strPid = String(pid);

        let matchingPattern: any = null;
        const matchingTrack = allTracks.find((t) =>
          Array.isArray(t.patterns) && t.patterns.some((p: any) => {
            if (!p) return false;
            const compositeCandidate = `${t.id}_${p.id}`;
            const match = (
              compositeCandidate === strPid ||
              p.id === pid || String(p.id) === strPid || (!isNaN(numPid) && Number(p.id) === numPid) ||
              (p.vocalClip && (
                p.vocalClip.id === pid || String(p.vocalClip.id) === strPid || (!isNaN(numPid) && Number(p.vocalClip.id) === numPid)
              ))
            );
            if (match) matchingPattern = p;
            return match;
          })
        );

        const canonicalKey = matchingTrack && matchingPattern
          ? `${matchingTrack.id}_${matchingPattern.id}`
          : matchingTrack
          ? `${matchingTrack.id}_${pid}`
          : strPid;

        const currentBuffers = useAudioStore.getState().vocalBuffers;
        if (currentBuffers[canonicalKey]) continue;

        const arrayBuffer = await rec.audioBlob.arrayBuffer();
        const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

        useAudioStore.getState().setVocalBuffer(canonicalKey, audioBuffer);
        useAudioStore.getState().addVocalBlob(canonicalKey, rec.audioBlob);
        entriesToBatch.push({ key: canonicalKey, buffer: audioBuffer, blob: rec.audioBlob });
      } catch (err) {
        console.error(`[VOCAL REHYDRATE] Erreur décodage IDB record ${rec.patternId}:`, err);
      }
    }
  }
}
