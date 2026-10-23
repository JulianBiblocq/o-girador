/**
 * Types d'interface pour la grille de pas DAW (< 30 lignes).
 */

import React from 'react';
import { TrackGroup, Pattern } from '../../types';

export interface DawStepGridProps {
  beatGroups: number[][];
  track: TrackGroup;
  effectiveTrack: TrackGroup;
  inst: any;
  activePattern: Pattern | null;
  masterActivePattern: Pattern | null;
  isGhostStep: boolean;
  isLeftHanded: boolean;
  tracks: TrackGroup[];
  currentMeasure: number;
  sequencer: any;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
}
