/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackGroup } from '../../types';

export interface DawTrackRowProps {
  track: TrackGroup;
  trackIdx: number;
  tracks: TrackGroup[];
  currentMeasure: number;
  defaultBeats: number;
  lang: string;
  isLeftHanded: boolean;
  sequencer: any;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  trackResolutionsRef: React.MutableRefObject<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>;
}
