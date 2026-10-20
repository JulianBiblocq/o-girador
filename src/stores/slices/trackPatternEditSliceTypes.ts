import { WorkspaceTemplate } from '../../types';

export interface TrackPatternEditSlice {
  handleTimelinePatternAssign: (trackId: number, patternId: number | null | undefined, measureIdx: number) => void;
  handleTimelinePatternVariationToggle: (trackId: number, patternId: number, measureIdx: number, val: boolean) => void;
  duplicateMeasurePattern: (trackId: number, srcIdx: number, targetIdx: number) => void;
  repeatPatternRange: (trackId: number, srcIdx: number, count: number) => void;
  handleCreateFromTemplate: (
    template: WorkspaceTemplate,
    audio?: {
      setMasterEQ?: (eq: { low: number; mid: number; high: number }) => void;
      setMasterCompressor?: (comp: { threshold: number; ratio: number }) => void;
      setMasterVol?: (vol: number) => void;
      setReverbDecay?: (decay: number) => void;
      setMasterReverbVol?: (vol: number) => void;
    }
  ) => void;
  handleVocalLatencyChange: (trackId: number, patternId: number, latencyMs: number) => void;
  handleTrackStepsChange: (trackId: number, patternId: number, targetSteps: number) => void;
  handleTrackStepVolumeChange: (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => void;
  handleTrackStepDecayChange?: (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => void;
  handleTrackStepMicrotimingChange?: (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => void;
  handlePatternBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
  handleSetPatternAllBeatsResolution: (patternId: number, newResolution: number) => void;
}
