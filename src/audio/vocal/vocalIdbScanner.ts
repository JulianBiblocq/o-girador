/**
 * O Girador - Vocal IndexedDB Records Rehydration Scanner
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
        const isVariantKey = typeof pid === 'string' && pid.includes('__');
        const basePid = isVariantKey ? pid.split('__')[0] : pid;
        const numBasePid = Number(basePid);
        const strBasePid = String(basePid);
        const variantPart = isVariantKey ? pid.split('__')[1] : null;

        let matchingPattern: any = null;
        const matchingTrack = allTracks.find(t =>
          Array.isArray(t.patterns) && t.patterns.some((p: any) => {
            if (!p) return false;
            const match = (
              p.id === pid || String(p.id) === strPid || (!isNaN(numPid) && Number(p.id) === numPid) ||
              p.id === basePid || String(p.id) === strBasePid || (!isNaN(numBasePid) && Number(p.id) === numBasePid) ||
              (p.vocalClip && (
                p.vocalClip.id === pid || String(p.vocalClip.id) === strPid || (!isNaN(numPid) && Number(p.vocalClip.id) === numPid) ||
                p.vocalClip.id === basePid || String(p.vocalClip.id) === strBasePid || (!isNaN(numBasePid) && Number(p.vocalClip.id) === numBasePid)
              ))
            );
            if (match) matchingPattern = p;
            return match;
          })
        );

        if (matchingPattern && variantPart) {
          matchingPattern.vocalVariantKeys = Array.from(new Set([...(matchingPattern.vocalVariantKeys || []), variantPart]));
        }

        const compositeKey = matchingTrack ? `${matchingTrack.id}_${pid}` : null;
        const currentBuffers = useAudioStore.getState().vocalBuffers;
        if (currentBuffers[pid] && (!compositeKey || currentBuffers[compositeKey])) continue;

        const arrayBuffer = await rec.audioBlob.arrayBuffer();
        const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

        useAudioStore.getState().setVocalBuffer(pid, audioBuffer);
        useAudioStore.getState().addVocalBlob(pid, rec.audioBlob);
        entriesToBatch.push({ key: pid, buffer: audioBuffer, blob: rec.audioBlob });

        if (!isNaN(numPid) && numPid !== pid) {
          useAudioStore.getState().setVocalBuffer(numPid, audioBuffer);
          useAudioStore.getState().addVocalBlob(numPid, rec.audioBlob);
          entriesToBatch.push({ key: numPid, buffer: audioBuffer, blob: rec.audioBlob });
        }
        if (strPid !== pid) {
          useAudioStore.getState().setVocalBuffer(strPid, audioBuffer);
          useAudioStore.getState().addVocalBlob(strPid, rec.audioBlob);
          entriesToBatch.push({ key: strPid, buffer: audioBuffer, blob: rec.audioBlob });
        }

        if (matchingTrack) {
          const compKey = `${matchingTrack.id}_${pid}`;
          useAudioStore.getState().setVocalBuffer(compKey, audioBuffer);
          useAudioStore.getState().addVocalBlob(compKey, rec.audioBlob);
          entriesToBatch.push({ key: compKey, buffer: audioBuffer, blob: rec.audioBlob });

          if (matchingPattern) {
            useAudioStore.getState().setVocalBuffer(matchingPattern.id, audioBuffer);
            useAudioStore.getState().addVocalBlob(matchingPattern.id, rec.audioBlob);
            useAudioStore.getState().setVocalBuffer(`${matchingTrack.id}_${matchingPattern.id}`, audioBuffer);
            useAudioStore.getState().addVocalBlob(`${matchingTrack.id}_${matchingPattern.id}`, rec.audioBlob);
          }
        }
      } catch (err) {
        console.error(`🎙️ [VOCAL REHYDRATE] Erreur décodage IDB record ${rec.patternId}:`, err);
      }
    }
  }
}
