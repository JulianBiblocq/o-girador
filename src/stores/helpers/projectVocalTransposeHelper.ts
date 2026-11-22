import * as Tone from 'tone';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { transposePatternNotesState } from './patternTransposeHelper';
import { computeTransposedTroupeKey, syncCloudToadaTransposition } from '../../services/cloudToadas';
import { prewarmProjectVocalDspBuffers } from '../../audio/vocalDsp/vocalDspPrewarmer';

type SetFn = (partial: Partial<SequencerStore> | ((state: SequencerStore) => Partial<SequencerStore>)) => void;
type GetFn = () => SequencerStore;

export function applyVocalTransposeStepsState(steps: number, set: SetFn, get: GetFn): void {
  const nextSteps = Math.max(-12, Math.min(12, steps));
  const meta = get().metadata;
  const troupeKey = meta?.sungKey ? computeTransposedTroupeKey(meta.sungKey, nextSteps) : meta?.troupeKey;
  set({
    vocalTransposeSteps: nextSteps,
    metadata: meta ? { ...meta, transpositionSemitones: nextSteps, troupeKey } : meta,
  });
  prewarmProjectVocalDspBuffers(undefined, nextSteps);
  if (meta?.toadaPackId) void syncCloudToadaTransposition(meta.toadaPackId, nextSteps, meta.sungKey);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('force-autosave'));
}

export function applyTransposePatternNotesState(
  trackId: number,
  patternId: string | number,
  semitones: number,
  set: SetFn,
  get: GetFn
): void {
  if (!semitones) return;
  const state = get();
  state.pushUndoState();
  try {
    if (typeof window !== 'undefined' && Tone.context && Tone.context.state !== 'running') {
      Tone.start().catch(() => {});
    }
  } catch (_) {}
  const { tracks: newTracks, noteToPreview } = transposePatternNotesState(state.tracks, trackId, patternId, semitones);
  const nextSteps = Math.max(-12, Math.min(12, (state.vocalTransposeSteps ?? 0) + semitones));
  const meta = state.metadata;
  const troupeKey = meta?.sungKey ? computeTransposedTroupeKey(meta.sungKey, nextSteps) : meta?.troupeKey;
  set({
    tracks: newTracks,
    tracksVersion: (state.tracksVersion ?? 0) + 1,
    vocalTransposeSteps: nextSteps,
    metadata: meta ? { ...meta, transpositionSemitones: nextSteps, troupeKey } : meta,
  });
  prewarmProjectVocalDspBuffers(undefined, nextSteps);
  if (meta?.toadaPackId) void syncCloudToadaTransposition(meta.toadaPackId, nextSteps, meta.sungKey);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('force-autosave'));
    if (noteToPreview) window.dispatchEvent(new CustomEvent('audio-preview-voice-note', { detail: noteToPreview }));
  }
}
