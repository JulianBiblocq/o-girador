/**
 * vocalDspPrewarmer.ts
 * Pré-chauffage proactif en arrière-plan (`src/workers/vocalDsp.worker.ts`) dès la fin de l'import
 * ou chargement d'une Toada, et dès que `currentBpm` ou `vocalTransposeSteps` change
 * (avec debounce de 80 ms pendant le glissement du curseur de BPM) (< 85 lignes).
 */
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { requestVocalPatternDspAsync } from './vocalPatternBufferCache';

let prewarmDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function executeVocalDspPrewarm(overrideBpm?: number, overrideTranspositionSemitones?: number): void {
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
        const canonicalKey = `${track.id}_${patId}`;
        const baseBuffer =
          audioState.vocalBuffers[canonicalKey] ||
          audioState.vocalBuffers[patId] ||
          (clip?.id ? audioState.vocalBuffers[`${track.id}_${clip.id}`] || audioState.vocalBuffers[clip.id] : undefined);
        if (!baseBuffer) continue;

        const recordedBpm = Number(clip?.recordedBpm || clip?.sampleBpm || clip?.baseBpm || pat.vocalBaseBpm || liveBpm);
        const packTransposition = Number(pat.packTranspositionSemitones ?? clip?.packTranspositionSemitones ?? 0);
        const trackTuningSt = Math.round((track.tuning ?? 0) * 12);
        const patTranspose = Number((pat as any).vocalTransposeSteps ?? globalTranspose) + trackTuningSt;

        const targetBpms = new Set<number>([Math.round(liveBpm)]);
        if (Array.isArray(pat.measureAssignments) && Array.isArray(seqState.measureBpms)) {
          pat.measureAssignments.forEach((assigned: boolean, mIdx: number) => {
            if (assigned && seqState.measureBpms[mIdx] > 0) {
              targetBpms.add(Math.round(seqState.measureBpms[mIdx]));
            }
          });
        }

        for (const targetBpm of targetBpms) {
          void requestVocalPatternDspAsync(
            canonicalKey,
            baseBuffer,
            recordedBpm,
            targetBpm,
            patTranspose,
            packTransposition,
            {
              t1OffsetSec: clip?.t1OffsetSec,
              trimStartSec: clip?.trimStartSec,
              trimEndSec: clip?.trimEndSec,
            },
            (entry) => {
              useAudioStore.getState().setVocalBuffer(entry.cacheKey, entry.audioBuffer);
            }
          );
        }
      }
    }
  } catch (_) {}
}

export function prewarmProjectVocalDspBuffers(
  overrideBpm?: number,
  overrideTranspositionSemitones?: number,
  immediate: boolean = false
): void {
  if (prewarmDebounceTimer) {
    clearTimeout(prewarmDebounceTimer);
    prewarmDebounceTimer = null;
  }
  if (immediate || typeof window === 'undefined') {
    executeVocalDspPrewarm(overrideBpm, overrideTranspositionSemitones);
    return;
  }
  prewarmDebounceTimer = setTimeout(() => {
    prewarmDebounceTimer = null;
    executeVocalDspPrewarm(overrideBpm, overrideTranspositionSemitones);
  }, 80);
}
