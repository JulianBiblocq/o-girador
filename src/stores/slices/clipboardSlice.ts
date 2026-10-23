import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { ClipboardSlice } from './clipboardSliceTypes';
import { copySongSectionData, pasteSongSectionState } from '../helpers/songSectionClipboardHelper';
import { notifyToast } from '../../utils/toastHelper';
import { copyAllTrackPatternsData } from '../helpers/instrumentClipboardCopyHelper';
import { pasteAllTrackPatternsState } from '../helpers/instrumentClipboardPasteHelper';
import {
  handleCopyVoiceStepsAction,
  handleCutVoiceStepsAction,
  handlePasteVoiceStepsAction
} from '../helpers/vocalClipboardActionsHelper';

export const createClipboardSlice: StateCreator<SequencerStore, [], [], ClipboardSlice> = (set, get) => ({
  copiedPattern: null,
  copiedSection: null,
  instrumentPatternsClipboard: null,
  vocalNotesClipboard: null,
  voiceStepsClipboard: null,

  setCopiedPattern: (pattern) => set({ copiedPattern: pattern }),
  setCopiedSection: (section) => set({ copiedSection: section }),

  handleCopyPattern: (pattern) => {
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = null;
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
    set({ copiedPattern: JSON.parse(JSON.stringify(pattern)) });
  },

  handleCopySongSection: (section) => {
    const data = copySongSectionData(get().tracks, get().songSections, section);
    set({ copiedSection: data, timelineClipboard: null });
  },

  handlePasteSongSection: (destStartMeasure) => {
    const state = get();
    if (!state.copiedSection) return;
    state.pushUndoState();
    const copied = state.copiedSection;
    const res = pasteSongSectionState(
      state.tracks,
      state.songSections,
      state.totalMeasures,
      copied,
      destStartMeasure,
      state.hasFullPlaybackAccess,
      state.maxMeasuresAllowed
    );

    if (res.error) {
      notifyToast(res.error, 'error');
      return;
    }

    set({
      tracks: res.tracks,
      tracksVersion: state.tracksVersion + 1,
      ...(res.songSections ? { songSections: res.songSections } : {}),
      ...(res.totalMeasures !== undefined ? { totalMeasures: res.totalMeasures } : {})
    });

    const end = destStartMeasure + copied.length - 1;
    get().handleCreateSongSection(copied.name, destStartMeasure, end, copied.color, copied.repeatCount, copied.level);
  },

  copyAllTrackPatterns: (trackId) => {
    const state = get();
    const res = copyAllTrackPatternsData(state.tracks, trackId, state.lang);
    if (!res) return;
    set({ instrumentPatternsClipboard: res.clip });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: res.message } }));
    }
  },

  pasteAllTrackPatterns: (targetTrackId, modeOrApplyTimeline = false) => {
    const state = get();
    if (!state.instrumentPatternsClipboard) return;
    state.pushUndoState();
    const res = pasteAllTrackPatternsState(
      state.tracks,
      state.instrumentPatternsClipboard,
      targetTrackId,
      modeOrApplyTimeline,
      state.totalMeasures,
      state.lang
    );
    if (!res) return;
    set({ tracks: res.tracks, tracksVersion: (state.tracksVersion || 0) + 1 });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: res.message } }));
    }
  },

  copySelectedNotesRange: (rangeOverride) => get().copyVoiceStepsRange(rangeOverride),

  pasteNotesOnlyStartingAt: (targetTrackId, targetPatternId, startIsPreRoll, startStepIdx) => {
    get().pasteVoiceSteps(targetTrackId, targetPatternId, startIsPreRoll, startStepIdx, true);
  },

  copyVoiceStepsRange: (rangeOverride, trackIdOverride, patternIdOverride) => {
    handleCopyVoiceStepsAction(get(), set, rangeOverride, trackIdOverride, patternIdOverride);
  },

  cutVoiceStepsRange: (rangeOverride, trackIdOverride, patternIdOverride) => {
    handleCutVoiceStepsAction(get(), set, get, rangeOverride, trackIdOverride, patternIdOverride);
  },

  pasteVoiceSteps: (targetTrackId, targetPatternId, startIsPreRoll, startStepIdx, notesOnly = false) => {
    handlePasteVoiceStepsAction(get(), set, targetTrackId, targetPatternId, startIsPreRoll, startStepIdx, notesOnly);
  }
});
