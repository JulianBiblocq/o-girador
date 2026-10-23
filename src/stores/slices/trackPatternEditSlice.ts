import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { usePaperVigilanceStore } from '../usePaperVigilanceStore';
import { TrackPatternEditSlice } from './trackPatternEditSliceTypes';
import { handleTimelinePatternAssignState } from '../helpers/timelinePatternAssignHelper';
import { handleTimelinePatternVariationToggleState } from '../helpers/timelinePatternVariationHelper';
import { duplicateMeasurePatternState } from '../helpers/patternDuplicateHelper';
import { repeatPatternRangeState } from '../helpers/patternRepeatHelper';
import { applyWorkspaceTemplateAudioSettings, createTracksFromTemplateState } from '../helpers/workspaceTemplateLoader';
import {
  handleTrackStepVolumeChangeState,
  handleTrackStepDecayChangeState,
  handleTrackStepMicrotimingChangeState,
  handleVocalLatencyChangeState
} from '../helpers/patternStepSculptHelper';
import {
  handleTrackStepsChangeState,
  handlePatternBeatResolutionChangeState,
  handleSetPatternAllBeatsResolutionState
} from '../helpers/patternResolutionHelper';

export const createTrackPatternEditSlice: StateCreator<SequencerStore, [], [], TrackPatternEditSlice> = (set, get) => ({
  handleTimelinePatternAssign: (trackId, patternId, measureIdx) => {
    get().pushUndoState();
    set(state => handleTimelinePatternAssignState(state, trackId, patternId, measureIdx));
  },

  handleTimelinePatternVariationToggle: (trackId, patternId, measureIdx, val) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleTimelinePatternVariationToggleState(state.tracks, state.totalMeasures, trackId, patternId, measureIdx, val),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  duplicateMeasurePattern: (trackId, srcIdx, targetIdx) => {
    if (targetIdx < 0 || targetIdx === srcIdx) return;
    const state = get();
    if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && targetIdx >= state.maxMeasuresAllowed) {
      alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
      return;
    }
    get().pushUndoState();
    set(curr => duplicateMeasurePatternState(curr, trackId, srcIdx, targetIdx));
  },

  repeatPatternRange: (trackId, srcIdx, count) => {
    if (count <= 0) return;
    const maxTargetIdx = srcIdx + count;
    const state = get();
    if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && maxTargetIdx >= state.maxMeasuresAllowed) {
      alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
      return;
    }
    get().pushUndoState();
    set(curr => repeatPatternRangeState(curr, trackId, srcIdx, count));
  },

  handleCreateFromTemplate: (template, audio) => {
    get().pushUndoState();
    applyWorkspaceTemplateAudioSettings(template, audio);
    usePaperVigilanceStore.getState().setActiveSequencerScoreId(null);
    set(state => createTracksFromTemplateState(state, template));
  },

  handleVocalLatencyChange: (trackId, patternId, latencyMs) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleVocalLatencyChangeState(state.tracks, trackId, patternId, latencyMs),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepsChange: (trackId, patternId, targetSteps) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleTrackStepsChangeState(state.tracks, trackId, patternId, targetSteps),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepVolumeChange: (trackId, patternId, stepIdx, val, subIndex) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleTrackStepVolumeChangeState(state.tracks, trackId, patternId, stepIdx, val, subIndex),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepDecayChange: (trackId, patternId, stepIdx, val, subIndex) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleTrackStepDecayChangeState(state.tracks, trackId, patternId, stepIdx, val, subIndex),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepMicrotimingChange: (trackId, patternId, stepIdx, val, subIndex) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleTrackStepMicrotimingChangeState(state.tracks, trackId, patternId, stepIdx, val, subIndex),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handlePatternBeatResolutionChange: (patternId, beatIndex, newResolution) => {
    get().pushUndoState();
    set(state => {
      const res = handlePatternBeatResolutionChangeState(state.tracks, patternId, beatIndex, newResolution, state.timeSig, state.selectedPatternId, state.selectedStepIdx);
      return { tracks: res.tracks, selectedStepIdx: res.selectedStepIdx, tracksVersion: state.tracksVersion + 1 };
    });
  },

  handleSetPatternAllBeatsResolution: (patternId, newResolution) => {
    get().pushUndoState();
    set(state => {
      const res = handleSetPatternAllBeatsResolutionState(state.tracks, patternId, newResolution, state.timeSig, state.selectedPatternId, state.selectedStepIdx);
      return { tracks: res.tracks, selectedStepIdx: res.selectedStepIdx, tracksVersion: state.tracksVersion + 1 };
    });
  }
});
