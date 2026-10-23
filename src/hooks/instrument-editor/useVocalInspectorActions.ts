
import { useCallback } from 'react';
import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { getVocalRecording } from '../../db';

export function useVocalInspectorActions(
  effectiveEditTrackId: number,
  selectedPatternId: number | undefined,
  firstPatternId: number | undefined
) {
  const onOpenAlignment = useCallback(async () => {
    const pId = selectedPatternId || firstPatternId;
    if (!pId) return;
    const store = useAudioStore.getState();
    const compositeKey = `${effectiveEditTrackId}_${pId}`;
    let buffer = store.vocalBuffers[compositeKey] || store.vocalBuffers[pId];
    let blob = store.vocalBlobs[compositeKey] || store.vocalBlobs[pId];

    if (!buffer || !blob) {
      const dbBlob = await getVocalRecording(pId);
      if (dbBlob) {
        blob = dbBlob;
        store.addVocalBlob(pId, dbBlob);
        try {
          const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
          const arrayBuffer = await dbBlob.arrayBuffer();
          buffer = await rawCtx.decodeAudioData(arrayBuffer);
          store.setVocalBuffer(pId, buffer);
        } catch (_) {}
      }
    }

    if (buffer) {
      store.setTempRecording({
        patternId: pId,
        trackId: effectiveEditTrackId,
        audioBuffer: buffer,
        blob: blob || undefined,
        isImported: false,
      });
    }
  }, [effectiveEditTrackId, selectedPatternId, firstPatternId]);

  const onImportAudio = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const pId = selectedPatternId || firstPatternId;
    if (!pId) return;
    try {
      const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
      useAudioStore.getState().setTempRecording({
        patternId: pId,
        trackId: effectiveEditTrackId,
        audioBuffer,
        blob: file,
        isImported: true,
      });
    } catch (err) {
      console.error('Erreur import audio:', err);
    }
    e.target.value = '';
  }, [effectiveEditTrackId, selectedPatternId, firstPatternId]);

  return { onOpenAlignment, onImportAudio };
}
