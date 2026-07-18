/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';

interface TimelineEditState {
  activeStepKey: string | null; // format: 'trackId_measureIdx_stepIdx'
  anchorRect: DOMRect | null;
  allowedStrokes: string[];
  currentVal: string | number;
  trackId: number | null;
  patternId: number | null;
  measureIdx: number | null;
  stepIdx: number | null;
  openEditor: (params: {
    activeStepKey: string;
    anchorRect: DOMRect;
    allowedStrokes: string[];
    currentVal: string | number;
    trackId: number;
    patternId: number;
    measureIdx: number;
    stepIdx: number;
  }) => void;
  closeEditor: () => void;
}

export const useTimelineEditStore = create<TimelineEditState>((set) => ({
  activeStepKey: null,
  anchorRect: null,
  allowedStrokes: [],
  currentVal: 0,
  trackId: null,
  patternId: null,
  measureIdx: null,
  stepIdx: null,
  openEditor: (params) => set({
    activeStepKey: params.activeStepKey,
    anchorRect: params.anchorRect,
    allowedStrokes: params.allowedStrokes,
    currentVal: params.currentVal,
    trackId: params.trackId,
    patternId: params.patternId,
    measureIdx: params.measureIdx,
    stepIdx: params.stepIdx,
  }),
  closeEditor: () => set({
    activeStepKey: null,
    anchorRect: null,
    allowedStrokes: [],
    currentVal: 0,
    trackId: null,
    patternId: null,
    measureIdx: null,
    stepIdx: null,
  }),
}));
