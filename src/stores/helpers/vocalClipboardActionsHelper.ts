import { SelectedStepRange, VoiceStepData } from '../slices/clipboardSliceTypes';
import { copyVoiceStepsRangeState } from './vocalClipboardCopyHelper';
import { cutVoiceStepsRangeState } from './vocalClipboardCutHelper';
import { pasteVoiceStepsState } from './vocalClipboardPasteHelper';

export const handleCopyVoiceStepsAction = (
  state: any,
  set: any,
  rangeOverride?: SelectedStepRange | null,
  trackIdOverride?: number,
  patternIdOverride?: number
) => {
  const res = copyVoiceStepsRangeState(
    state.tracks,
    rangeOverride,
    trackIdOverride,
    patternIdOverride,
    state.selectedStepRange,
    state.selectedStepIdx,
    state.selectedStepIsPreRoll,
    state.editingTrackId,
    state.selectedPatternId
  );
  if (!res) return;
  set({
    voiceStepsClipboard: { steps: res.steps },
    vocalNotesClipboard: res.vocalNotes,
    ...(res.fallbackSelection ? { selectedStepIdx: res.fallbackSelection.step, selectedStepIsPreRoll: res.fallbackSelection.isPreRoll } : {})
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
  }
};

export const handleCutVoiceStepsAction = (
  state: any,
  set: any,
  get: any,
  rangeOverride?: SelectedStepRange | null,
  trackIdOverride?: number,
  patternIdOverride?: number
) => {
  state.pushUndoState();
  get().copyVoiceStepsRange(rangeOverride, trackIdOverride, patternIdOverride);
  const res = cutVoiceStepsRangeState(
    state.tracks,
    rangeOverride,
    trackIdOverride,
    patternIdOverride,
    state.selectedStepRange,
    state.selectedStepIdx,
    state.selectedStepIsPreRoll,
    state.editingTrackId,
    state.selectedPatternId
  );
  if (!res) return;
  set({
    tracks: res.tracks,
    tracksVersion: state.tracksVersion + 1,
    selectedStepIdx: res.anchorStep,
    selectedStepIsPreRoll: res.anchorIsPreRoll,
    selectedStepRange: null
  });
};

export const handlePasteVoiceStepsAction = (
  state: any,
  set: any,
  targetTrackId: number,
  targetPatternId: number,
  startIsPreRoll: boolean,
  startStepIdx: number,
  notesOnly = false
) => {
  const steps: VoiceStepData[] | undefined = state.voiceStepsClipboard?.steps ||
    state.vocalNotesClipboard?.map((n: string) => ({ note: n, syllable: '', role: n ? ('P' as const) : ('0' as const) }));
  if (!steps || steps.length === 0) return;

  const nextTracks = pasteVoiceStepsState(
    state.tracks,
    steps,
    targetTrackId,
    targetPatternId,
    startIsPreRoll,
    startStepIdx,
    notesOnly,
    state.selectedPatternId
  );
  if (!nextTracks) return;
  state.pushUndoState();
  set({ tracks: nextTracks, tracksVersion: state.tracksVersion + 1 });
};
