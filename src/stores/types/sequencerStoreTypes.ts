/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SpeedTrainerSlice, TrainingSlice } from '../../types';
import { TrackCoreSlice } from '../slices/trackCoreSliceTypes';
import { TrackHierarchySlice } from '../slices/trackHierarchySliceTypes';
import { TrackAcousticsSlice, MasterEffectsActiveState } from '../slices/trackAcousticsSliceTypes';
import { TrackPatternEditSlice } from '../slices/trackPatternEditSliceTypes';
import { StructureSlice } from '../slices/songStructureSliceTypes';
import { PlaybackSlice } from '../slices/playbackSliceTypes';
import { HistorySlice } from '../slices/historySliceTypes';
import { ClipboardSlice } from '../slices/clipboardSliceTypes';
import { ProjectSettingsSlice } from '../slices/projectSettingsSliceTypes';
import { UISlice } from '../slices/uiSliceTypes';
import { PracticeModeSlice } from '../slices/practiceModeSliceTypes';
import { AutomationBypassSlice } from '../slices/automationBypassSliceTypes';

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
  PracticeModeSlice &
  AutomationBypassSlice;

export type { MasterEffectsActiveState };
