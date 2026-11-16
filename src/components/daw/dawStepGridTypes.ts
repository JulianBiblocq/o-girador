/**
 * Types d'interface pour la grille de pas DAW (< 30 lignes).
 */

import { TrackGroup, Pattern } from '../../types';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';

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
  onSelectPedagogyTarget: (target: StrokeInfoPopoverTarget | null) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
}
