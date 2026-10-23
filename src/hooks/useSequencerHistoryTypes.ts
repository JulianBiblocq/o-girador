/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrackGroup, TimeSignature, SongSection, SongMarker } from '../types';

export interface StructureSnapshot {
  totalMeasures?: number;
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
  songSections?: SongSection[];
  songMarkers?: SongMarker[];
}

export interface UseSequencerHistoryOptions {
  tracksRef: React.MutableRefObject<TrackGroup[]>;
  measureTimeSigsRef: React.MutableRefObject<TimeSignature[]>;
  measureBpmsRef: React.MutableRefObject<number[]>;
  measureBpmTransitionsRef: React.MutableRefObject<('immediate' | 'ramp' | 'bezier')[]>;
  measureVolsRef: React.MutableRefObject<number[]>;
  measureVolTransitionsRef: React.MutableRefObject<('immediate' | 'ramp' | 'bezier')[]>;
  songSectionsRef: React.MutableRefObject<SongSection[]>;
  songMarkersRef: React.MutableRefObject<SongMarker[]>;

  setTracks: (tracks: TrackGroup[]) => void;
  setMeasureTimeSigs: (sigs: TimeSignature[]) => void;
  setSongSections: (sections: SongSection[]) => void;
  setSongMarkers: (markers: SongMarker[]) => void;
  setMeasureBpms: React.Dispatch<React.SetStateAction<number[]>>;
  setMeasureBpmTransitions: React.Dispatch<React.SetStateAction<('immediate' | 'ramp' | 'bezier')[]>>;
  setMeasureVols: React.Dispatch<React.SetStateAction<number[]>>;
  setMeasureVolTransitions: React.Dispatch<React.SetStateAction<('immediate' | 'ramp' | 'bezier')[]>>;
}
