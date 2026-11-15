import { EditorStepRangeActionParams } from '../slices/clipboardSliceTypes';
import {
  extractStepRangeSlice,
  applyClearStepIndicesState,
  applyPasteStepRangeState,
  applyDuplicateStepRangeState,
} from './stepRangeClipboardHelper';

function resolveMinMax(p: EditorStepRangeActionParams): [number, number] | null {
  if (p.selectedStepIndices.length > 0) {
    return [Math.min(...p.selectedStepIndices), Math.max(...p.selectedStepIndices)];
  }
  if (p.selectedStepIdx !== null && p.selectedStepIdx !== undefined) {
    return [p.selectedStepIdx, p.selectedStepIdx];
  }
  return null;
}

export function createStepRangeClipboardActions(set: any, get: any) {
  return {
    copyEditorStepsSelection: (params: EditorStepRangeActionParams): boolean => {
      const bounds = resolveMinMax(params);
      if (!bounds) return false;
      const clip = extractStepRangeSlice(get().tracks, params.trackId, params.patternId, params.variationId ?? null, bounds[0], bounds[1]);
      if (!clip) return false;
      set({ stepRangeClipboard: clip });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
      return true;
    },

    cutEditorStepsSelection: (params: EditorStepRangeActionParams): number | null => {
      const bounds = resolveMinMax(params);
      if (!bounds) return null;
      const state = get();
      const clip = extractStepRangeSlice(state.tracks, params.trackId, params.patternId, params.variationId ?? null, bounds[0], bounds[1]);
      if (!clip) return null;
      const indices = Array.from({ length: bounds[1] - bounds[0] + 1 }, (_, k) => bounds[0] + k);
      const updated = applyClearStepIndicesState(state.tracks, params.trackId, params.patternId, params.variationId ?? null, indices);
      if (!updated) return null;
      state.pushUndoState();
      set({ stepRangeClipboard: clip, tracks: updated, tracksVersion: state.tracksVersion + 1, selectedStepIdx: bounds[0] });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
      return bounds[0];
    },

    pasteEditorStepsClipboard: (params: EditorStepRangeActionParams): number[] | null => {
      const state = get();
      if (!state.stepRangeClipboard) return null;
      const anchor = params.selectedStepIndices.length > 0 ? Math.min(...params.selectedStepIndices) : (params.selectedStepIdx ?? 0);
      const res = applyPasteStepRangeState(state.tracks, state.stepRangeClipboard, params.trackId, params.patternId, params.variationId ?? null, anchor);
      if (!res) return null;
      state.pushUndoState();
      set({ tracks: res.tracks, tracksVersion: state.tracksVersion + 1, selectedStepIdx: res.pastedIndices[0] });
      return res.pastedIndices;
    },

    duplicateEditorStepsSelection: (params: EditorStepRangeActionParams): number[] | null => {
      const bounds = resolveMinMax(params);
      if (!bounds) return null;
      const state = get();
      const res = applyDuplicateStepRangeState(state.tracks, params.trackId, params.patternId, params.variationId ?? null, bounds[0], bounds[1]);
      if (!res) return null;
      state.pushUndoState();
      set({ tracks: res.tracks, tracksVersion: state.tracksVersion + 1, selectedStepIdx: res.duplicatedIndices[0] });
      return res.duplicatedIndices;
    },

    clearEditorStepsSelection: (params: EditorStepRangeActionParams): boolean => {
      const indices = params.selectedStepIndices.length > 0
        ? params.selectedStepIndices
        : (params.selectedStepIdx !== null ? [params.selectedStepIdx] : []);
      if (!indices.length) return false;
      const state = get();
      const updated = applyClearStepIndicesState(state.tracks, params.trackId, params.patternId, params.variationId ?? null, indices);
      if (!updated) return false;
      state.pushUndoState();
      set({ tracks: updated, tracksVersion: state.tracksVersion + 1 });
      return true;
    },
  };
}
