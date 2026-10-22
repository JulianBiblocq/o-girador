import { SpeedTrainerSlice, TrainingSlice } from '../../types';
import { TrackCoreSlice } from '../slices/trackCoreSliceTypes';
import { TrackHierarchySlice } from '../slices/trackHierarchySlice';
import { TrackAcousticsSlice, MasterEffectsActiveState } from '../slices/trackAcousticsSliceTypes';
import { TrackPatternEditSlice } from '../slices/trackPatternEditSliceTypes';
import { StructureSlice } from '../slices/songStructureSlice';
import { PlaybackSlice } from '../slices/playbackSlice';
import { HistorySlice } from '../slices/historySlice';
import { ClipboardSlice } from '../slices/clipboardSliceTypes';
import { ProjectSettingsSlice } from '../slices/projectSettingsSliceTypes';
import { UISlice } from '../slices/uiSliceTypes';
import { PracticeModeSlice } from '../slices/practiceModeSliceTypes';

export type TrackSlice = TrackCoreSlice & TrackHierarchySlice & TrackAcousticsSlice & TrackPatternEditSlice;

export type SequencerStore = TrackSlice &
  StructureSlice &
  PlaybackSlice &
  HistorySlice &
  ClipboardSlice &
  ProjectSettingsSlice &
  UISlice &
  SpeedTrainerSlice &
  TrainingSlice &
  PracticeModeSlice;

export type { MasterEffectsActiveState };
