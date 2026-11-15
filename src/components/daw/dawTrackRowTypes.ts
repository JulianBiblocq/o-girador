import React from 'react';
import { TrackGroup } from '../../types';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';

export interface DawTrackRowProps {
  track: TrackGroup;
  trackIdx: number;
  tracks: TrackGroup[];
  currentMeasure: number;
  defaultBeats: number;
  lang: string;
  isLeftHanded: boolean;
  sequencer: any;
  onSelectPedagogyTarget: (target: StrokeInfoPopoverTarget | null) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  trackResolutionsRef: React.MutableRefObject<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>;
}
