/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { saveVocalRecording } from '../../db';
import { VocalClipMeta } from '../../types/store.types';

interface SaveHandlerParams {
  tempRecording: any;
  voiceTrack: any;
  tracks: any[];
  handleStop: () => void;
  setLoading: (l: boolean) => void;
  setTempRecording: (val: any) => void;
}

export function useVocalValidationSave({
  tempRecording,
  voiceTrack,
  tracks,
  handleStop,
  setLoading,
  setTempRecording,
}: SaveHandlerParams) {
  const handleSave = async (cleanBuffer: AudioBuffer, wavBlob: Blob, meta: VocalClipMeta) => {
    setLoading(true);
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch (_) {}
    handleStop();

    try {
      const pId = tempRecording.patternId;
      await vocalEngineService.saveValidatedRecording(pId, wavBlob);
      await saveVocalRecording(pId, wavBlob);
      await saveVocalRecording(String(pId), wavBlob);
      if (!isNaN(Number(pId))) await saveVocalRecording(Number(pId), wavBlob);

      useAudioStore.getState().setVocalBuffer(pId, cleanBuffer);
      useAudioStore.getState().setVocalBuffer(String(pId), cleanBuffer);
      useAudioStore.getState().addVocalBlob(pId, wavBlob);
      useAudioStore.getState().addVocalBlob(String(pId), wavBlob);
      if (!isNaN(Number(pId))) {
        useAudioStore.getState().setVocalBuffer(Number(pId), cleanBuffer);
        useAudioStore.getState().addVocalBlob(Number(pId), wavBlob);
      }
      if (voiceTrack?.id) {
        const compositeKey = `${voiceTrack.id}_${pId}`;
        useAudioStore.getState().setVocalBuffer(compositeKey, cleanBuffer);
        useAudioStore.getState().addVocalBlob(compositeKey, wavBlob);
        const compositeKeyStr = `${voiceTrack.id}_${String(pId)}`;
        useAudioStore.getState().setVocalBuffer(compositeKeyStr, cleanBuffer);
        useAudioStore.getState().addVocalBlob(compositeKeyStr, wavBlob);
      }

      useSequencerStore.getState().setTracks(
        tracks.map((t) => {
          if (t.id === voiceTrack.id) {
            return {
              ...t,
              patterns: t.patterns.map((p: any) => {
                if (p.id === pId || String(p.id) === String(pId) || (!isNaN(Number(pId)) && Number(p.id) === Number(pId))) {
                  return {
                    ...p,
                    vocalMode: 'micro',
                    vocalClip: meta,
                    vocalAudioUrl: undefined,
                    vocalNudge: undefined,
                    vocalTrimStart: undefined,
                    vocalBaseBpm: meta.sampleBpm ?? meta.baseBpm,
                    vocalBpmSync: true,
                  };
                }
                return p;
              }),
            };
          }
          return t;
        })
      );

      useAudioStore.getState().setTargetPatternId(null);
      setTempRecording(null);
    } catch (err) {
      console.error('🎙️ [VOCAL ENGINE] Error validating and saving vocal sample:', err);
      setLoading(false);
    }
  };

  return { handleSave };
}
