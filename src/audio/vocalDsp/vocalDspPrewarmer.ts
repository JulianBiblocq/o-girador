/**
 * vocalDspPrewarmer.ts
 * Pré-calcul asynchrone (Web Worker) des buffers vocaux haute définition dès qu'un pack
 * est chargé ou que le BPM / la Tonalité Troupe change dans Sequenciador (< 65 lignes).
 */
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { requestVocalPatternDspAsync } from './vocalPatternBufferCache';

export function prewarmProjectVocalDspBuffers(
  overrideBpm?: number,
  overrideTranspositionSemitones?: number
): void {
  try {
    const seqState = useSequencerStore.getState();
    const audioState = useAudioStore.getState();
    const liveBpm = Number(overrideBpm ?? seqState.bpm ?? 88);
    const globalTranspose = Number(overrideTranspositionSemitones ?? seqState.vocalTransposeSteps ?? 0);

    for (const track of seqState.tracks || []) {
      for (const pat of track.patterns || []) {
        if (!pat || (!pat.hasVocalAudio && !pat.vocalClip)) continue;
        const clip = pat.vocalClip;
        const patId = pat.id;
        const clipId = clip?.id;
        const baseBuffer =
          audioState.vocalBuffers[`${track.id}_${patId}`] ||
          audioState.vocalBuffers[patId] ||
          (clipId ? audioState.vocalBuffers[`${track.id}_${clipId}`] || audioState.vocalBuffers[clipId] : undefined);
        if (!baseBuffer) continue;

        const recordedBpm = Number(clip?.recordedBpm || clip?.sampleBpm || clip?.baseBpm || pat.vocalBaseBpm || liveBpm);
        const packTransposition = Number(pat.packTranspositionSemitones ?? clip?.packTranspositionSemitones ?? 0);
        const patTranspose = Number((pat as any).vocalTransposeSteps ?? globalTranspose);

        void requestVocalPatternDspAsync(
          patId,
          baseBuffer,
          recordedBpm,
          liveBpm,
          patTranspose,
          packTransposition,
          {
            t1OffsetSec: clip?.t1OffsetSec,
            trimStartSec: clip?.trimStartSec,
            trimEndSec: clip?.trimEndSec,
          }
        );
      }
    }
  } catch (_) {}
}
