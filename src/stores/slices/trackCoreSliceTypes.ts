import { TrackGroup, ToadaConductorSlot } from '../../types';

export interface TrackCoreSlice {
  tracks: TrackGroup[];
  rodaTrackOrder: number[];
  activeAoVivoTrackId: number | null;
  isLetraActive: boolean;
  tracksVersion: number;
  armedTrackId: number | null;
  armedPatternId: number | null;
  isPatternRecording: boolean;
  toadaConductorSlots: ToadaConductorSlot[];
  pendingToadaQuickDeploy: { measureIdx: number } | null;

  setToadaConductorSlots: (slots: ToadaConductorSlot[]) => void;
  setPendingToadaQuickDeploy: (val: { measureIdx: number } | null) => void;
  deployToadaCycleAtMeasure: (startMeasureIdx: number) => void;
  toggleArmPattern: (trackId: number, patternId: number) => void;
  disarmAllPatterns: () => void;
  setIsPatternRecording: (val: boolean | ((prev: boolean) => boolean)) => void;
  togglePatternRecording: () => void;
  updatePatternStep: (trackId: number, patternId: number, stepIdx: number, char: string | number | [string, string]) => void;
  setTracks: (tracks: TrackGroup[] | ((prev: TrackGroup[]) => TrackGroup[])) => void;
  setSelectedPatternId: (trackIdOrPatternId: number, patternId?: number) => void;
  setRodaTrackOrder: (order: number[] | ((prev: number[]) => number[])) => void;
  setActiveAoVivoTrackId: (id: number | null) => void;
  setIsLetraActive: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleLetraActive: () => void;
  handleTrackInstrumentIdxChange: (id: number, targetInstIdx: number) => void;
  handleTrackMuteToggle: (id: number) => void;
  handleTrackSoloToggle: (id: number) => void;
  handleTrackHideToggle: (id: number) => void;
  handleTrackDelete: (id: number) => void;
  duplicateTrack: (trackId: number) => number | null;
}
