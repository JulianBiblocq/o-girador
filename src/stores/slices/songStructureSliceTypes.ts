/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SongSection, SongMarker, CloudRhythmSignal } from '../../types';
import { TransportSlice } from './transportSliceTypes';

export interface StructureSlice extends TransportSlice {
  songSections: SongSection[];
  songMarkers: SongMarker[];
  mestreSignals: CloudRhythmSignal[];
  setSongSections: (updater: SongSection[] | ((prev: SongSection[]) => SongSection[])) => void;
  setSongMarkers: (updater: SongMarker[] | ((prev: SongMarker[]) => SongMarker[])) => void;
  setMestreSignals: (signals: CloudRhythmSignal[]) => void;
  duplicateSectionBlock: (startIdx: number, endIdx: number, targetIdx: number, copiesCount: number) => void;
  stretchSongSection: (sectionId: string, newEndMeasure: number, mode: 'insert' | 'overwrite') => void;
  handleCreateSongSection: (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => void;
  handleUpdateSongSection: (id: string, name: string, start: number, end: number, color?: string, level?: number) => void;
  handleUpdateSectionRepeat: (id: string, count: number) => void;
  handleDeleteSongSection: (id: string) => void;
  handleCreateSongMarker: (name: string, measure: number, color?: string) => void;
  handleUpdateSongMarker: (id: string, name: string, measure: number, color?: string) => void;
  handleDeleteSongMarker: (id: string) => void;
  selectedAutomationType: 'bpm' | 'volume' | 'pan' | 'reverb' | null;
  selectedAutomationTrackId: number | null;
  selectedAutomationRange: { start: number; end: number } | null;
  automationAnchorMeasure: number | null;
  selectAutomationMeasure: (type: 'bpm' | 'volume' | 'pan' | 'reverb', measureIdx: number, isShift: boolean, trackId?: number | null) => void;
  clearAutomationSelection: () => void;
  setGroupedAutomationValue: (type: 'bpm' | 'volume' | 'pan' | 'reverb', value: number, trackId?: number | null) => void;
}
