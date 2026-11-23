import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { evictVocalDspVariantsByPrefix } from '../../audio/vocalDsp/vocalDspLruStore';
import { prewarmProjectVocalDspBuffers } from '../../audio/vocalDsp/vocalDspPrewarmer';
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
      const hasTrackId = voiceTrack?.id !== undefined && voiceTrack?.id !== null;
      const canonicalKey = hasTrackId ? `${voiceTrack.id}_${pId}` : String(pId);

      await saveVocalRecording(canonicalKey, wavBlob);
      await vocalEngineService.saveValidatedRecording(pId, wavBlob);

      evictVocalDspVariantsByPrefix(canonicalKey);
      evictVocalDspVariantsByPrefix(pId);

      useAudioStore.getState().setVocalBuffersBatch([
        {
          key: canonicalKey,
          buffer: cleanBuffer,
          blob: wavBlob,
          legacyAliasKey: pId,
        },
      ]);

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
                    hasVocalAudio: true,
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

      prewarmProjectVocalDspBuffers(undefined, undefined, true);
      useAudioStore.getState().setTargetPatternId(null);
      setTempRecording(null);
    } catch (err) {
      console.error('[VOCAL ENGINE] Error validating and saving vocal sample:', err);
      setLoading(false);
    }
  };

  return { handleSave };
}
