import { create } from 'zustand';
import { createSpeedTrainerSlice } from './slices/speedTrainerSlice';
import { createTrainingSlice } from './slices/trainingSlice';
import { createPlaybackSlice } from './slices/playbackSlice';
import { createHistorySlice } from './slices/historySlice';
import { createStructureSlice } from './slices/songStructureSlice';
import { createUISlice } from './slices/timelineSlice';
import { createTrackHierarchySlice } from './slices/trackHierarchySlice';
import { createTrackCoreSlice } from './slices/trackCoreSlice';
import { createTrackAcousticsSlice } from './slices/trackAcousticsSlice';
import { createTrackPatternEditSlice } from './slices/trackPatternEditSlice';
import { createClipboardSlice } from './slices/clipboardSlice';
import { createProjectSettingsSlice } from './slices/projectSettingsSlice';
import { createPracticeModeSlice } from './slices/practiceModeSlice';
import { createAutomationBypassSlice } from './slices/automationBypassSlice';

import { SequencerStore, TrackSlice, MasterEffectsActiveState } from './types/sequencerStoreTypes';

// ---------------------------------------------------------
// STORE PRINCIPAL EXPORTÉ
// ---------------------------------------------------------
export type { SequencerStore, TrackSlice, MasterEffectsActiveState };

export const useSequencerStore = create<SequencerStore>((...a) => ({
  ...createTrackCoreSlice(...a),
  ...createTrackHierarchySlice(...a),
  ...createTrackAcousticsSlice(...a),
  ...createTrackPatternEditSlice(...a),
  ...createStructureSlice(...a),
  ...createPlaybackSlice(...a),
  ...createHistorySlice(...a),
  ...createClipboardSlice(...a),
  ...createProjectSettingsSlice(...a),
  ...createUISlice(...a),
  ...createSpeedTrainerSlice(...a),
  ...createTrainingSlice(...a),
  ...createPracticeModeSlice(...a),
  ...createAutomationBypassSlice(...a),
}));

// ---------------------------------------------------------
// RÉEXPORTATIONS TRANSPARENTES
// ---------------------------------------------------------
export * from './helpers/trackVisibilityHelpers';
export * from './helpers/trackRodaGeometryHelpers';
export * from './helpers/trackMetaCache';
export * from './helpers/trackMixerSelectors';
export * from './helpers/mixerOrderingHelpers';
export * from './helpers/undoHistoryHelpers';
export * from './helpers/measureOperationsHelper';
export * from './helpers/measureResizeHelper';
export * from './helpers/timelineSectionHelpers';
export * from './helpers/timelineStretchHelper';
export * from './helpers/timelineStretchInsertHelper';
export * from './helpers/timelineStretchOverwriteHelper';
export * from './helpers/timelineBlockDuplicationHelper';
export * from './helpers/timelineAutomationSelectionHelper';
export * from './helpers/timelineSelectionHelpers';
export * from './helpers/timelineCellDeleteHelper';
export * from './helpers/timelineCellDuplicateHelper';
export * from './helpers/timelineGridExpandHelper';
export * from './helpers/timelineGridAutoExpandHelper';
export * from './helpers/timelineClipboardTypes';
export * from './helpers/timelineClipboardCopyCutHelper';
export * from './helpers/timelineClipboardPasteHelper';
export * from './helpers/trackReorderMixerHelper';
export * from './helpers/trackReorderRodaWagonHelper';
export * from './helpers/trackLinkingHelpers';
export * from './helpers/trackBusHelpers';
export * from './helpers/ecoModeDetector';
export * from './helpers/patternTransposeHelper';
export * from './helpers/vocalClipboardResolutionHelper';
export * from './helpers/vocalClipboardCopyHelper';
export * from './helpers/vocalClipboardCutHelper';
export * from './helpers/vocalClipboardPasteHelper';
export * from './helpers/vocalClipboardActionsHelper';
export * from './helpers/songSectionClipboardHelper';
export * from './helpers/instrumentClipboardCopyHelper';
export * from './helpers/instrumentClipboardPasteHelper';
export * from './helpers/trackAcousticAutomationHelper';
export * from './helpers/trackBalancoSwingHelper';
export * from './helpers/trackEqMasterFxHelper';
export * from './helpers/patternStepSculptHelper';
export * from './helpers/patternResolutionHelper';
export * from './helpers/timelinePatternAssignHelper';
export * from './helpers/timelinePatternVariationHelper';
export * from './helpers/trackAutomationCloneHelper';
export * from './helpers/trackAutomationRepeatHelper';
export * from './helpers/patternDuplicateHelper';
export * from './helpers/patternRepeatHelper';
export * from './helpers/workspaceTemplateLoader';
export * from './helpers/trackLifecycleHelpers';
export * from './helpers/trackRecordArmHelper';

export * from './slices/playbackSlice';
export * from './slices/historySlice';
export * from './slices/transportSlice';
export * from './slices/songStructureSlice';
export * from './slices/timelineSlice';
export * from './slices/trackHierarchySlice';
export * from './slices/trackCoreSlice';
export * from './slices/trackCoreSliceTypes';
export * from './slices/trackAcousticsSlice';
export * from './slices/trackAcousticsSliceTypes';
export * from './slices/trackPatternEditSlice';
export * from './slices/trackPatternEditSliceTypes';
export * from './slices/clipboardSlice';
export * from './slices/clipboardSliceTypes';
export * from './slices/projectSettingsSlice';
export * from './slices/projectSettingsSliceTypes';
export * from './slices/automationBypassSlice';
export * from '../utils/automationBypassHelper';
export * from './types/sequencerStoreTypes';

if (typeof window !== 'undefined') {
  (window as any).useSequencerStore = useSequencerStore;
}
