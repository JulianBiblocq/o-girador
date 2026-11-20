import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { ClipboardSlice, CopiedPatternClipboard } from './clipboardSliceTypes';
import { copySongSectionData, pasteSongSectionState } from '../helpers/songSectionClipboardHelper';
import { notifyToast } from '../../utils/toastHelper';
import { copyAllTrackPatternsData } from '../helpers/instrumentClipboardCopyHelper';
import { pasteAllTrackPatternsState } from '../helpers/instrumentClipboardPasteHelper';
import { getInstrumentFamily, resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import {
  handleCopyVoiceStepsAction, handleCutVoiceStepsAction, handlePasteVoiceStepsAction,
} from '../helpers/vocalClipboardActionsHelper';
import { createStepRangeClipboardActions } from '../helpers/stepRangeClipboardActions';

export const createClipboardSlice: StateCreator<SequencerStore, [], [], ClipboardSlice> = (set, get) => ({
  copiedPattern: null,
  copiedSection: null,
  instrumentPatternsClipboard: null,
  vocalNotesClipboard: null,
  voiceStepsClipboard: null,
  stepRangeClipboard: null,

  setCopiedPattern: (pattern) => set({ copiedPattern: pattern }),
  setCopiedSection: (section) => set({ copiedSection: section }),

  handleCopyPattern: (pattern, sourceTrackOrInst) => {
    if (!pattern) return;
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = null;
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
    const tracks = get().tracks || [];
    let resolvedInstId = '';
    let resolvedTrackId: number | undefined;
    if (typeof sourceTrackOrInst === 'string') {
      resolvedInstId = resolveTrackInstrumentId(sourceTrackOrInst, tracks);
    } else if (typeof sourceTrackOrInst === 'number') {
      const tr = tracks.find((t) => t.id === sourceTrackOrInst);
      resolvedTrackId = tr?.id;
      resolvedInstId = resolveTrackInstrumentId(tr, tracks);
    }
    if (!resolvedInstId) {
      const owner = tracks.find((t) => !t.isLinkFolder && !t.isBusFolder && t.patterns?.some((p) => p.id === pattern.id))
        || tracks.find((t) => t.patterns?.some((p) => p.id === pattern.id));
      if (owner) {
        resolvedTrackId = owner.id;
        resolvedInstId = resolveTrackInstrumentId(owner, tracks);
      } else {
        resolvedInstId = resolveTrackInstrumentId(pattern, tracks);
      }
    }
    const cloned: CopiedPatternClipboard = {
      ...JSON.parse(JSON.stringify(pattern)),
      sourceTrackId: resolvedTrackId,
      sourceInstId: resolvedInstId,
      sourceInstrumentType: resolvedInstId,
      sourceType: resolvedInstId,
      sourceFamily: getInstrumentFamily(resolvedInstId),
    };
    set({ copiedPattern: cloned });
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
      state.tracks, state.songSections, state.totalMeasures, copied, destStartMeasure,
      state.hasFullPlaybackAccess, state.maxMeasuresAllowed
    );
    if (res.error) { notifyToast(res.error, 'error'); return; }
    set({
      tracks: res.tracks, tracksVersion: state.tracksVersion + 1,
      ...(res.songSections ? { songSections: res.songSections } : {}),
      ...(res.totalMeasures !== undefined ? { totalMeasures: res.totalMeasures } : {}),
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
    const res = pasteAllTrackPatternsState(
      state.tracks, state.instrumentPatternsClipboard, targetTrackId, modeOrApplyTimeline, state.totalMeasures, state.lang
    );
    if (!res) return;
    state.pushUndoState();
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
  },

  ...createStepRangeClipboardActions(set, get),
});
