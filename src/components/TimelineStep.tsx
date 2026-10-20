import React, { useContext } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../stores/useSequencerStore';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { resolveTimelineStepData } from './timeline/TimelineStepPatternResolver';
import { TimelineStepCellVisuals } from './timeline/TimelineStepCellVisuals';

interface TimelineStepProps {
  trackId: number; patternId: number; measureIdx: number; stepIdx: number;
  patternStepOffset?: number; stepsCount: number; trackIdx: number; patternIdx: number;
  instrumentIdx: number; beatResolutions?: number[];
  onStepTouchStart?: (e: React.MouseEvent | React.TouchEvent, pId: number, sIdx: number, instId: string, val: string | number, onSel: (v: string) => void, tId: number) => void;
  isLinkFolder?: boolean; isSlave?: boolean; isLinkMaster?: boolean;
  parentBusTrackId?: number; masterTrackId?: number; slaveTrackIds?: number[]; hasChildOverrides?: boolean;
}

const TimelineStepComponent: React.FC<TimelineStepProps> = ({
  trackId, patternId, measureIdx, stepIdx, patternStepOffset = 0, stepsCount,
  trackIdx, patternIdx, instrumentIdx, beatResolutions, isLinkFolder: propIsLinkFolder,
  isSlave: propIsSlave, isLinkMaster: propIsLinkMaster, parentBusTrackId, masterTrackId,
  slaveTrackIds, hasChildOverrides,
}) => {
  const uiContext = useContext(TimelineUIContext);

  const stepData = useSequencerStore(
    useShallow((state) => {
      const currentTrack = state.tracks.find((t) => t.id === trackId) || state.tracks[trackIdx];
      if (!currentTrack) return null;
      const actualStepIdx = (patternStepOffset || 0) + stepIdx;
      const isLinkFolder = propIsLinkFolder !== undefined ? propIsLinkFolder : !!currentTrack.isLinkFolder;
      const isSlave = propIsSlave !== undefined ? propIsSlave : !!(currentTrack.linkedToTrackId && !currentTrack.isLinkFolder && !currentTrack.isLinkMaster);
      const isLinkMaster = propIsLinkMaster !== undefined ? propIsLinkMaster : !!(currentTrack.linkedToTrackId && !currentTrack.isLinkFolder && currentTrack.isLinkMaster);

      return resolveTimelineStepData(
        currentTrack, state.tracks, actualStepIdx, patternId, patternIdx, measureIdx,
        instrumentIdx, Boolean(state.isLeftHanded), Boolean(state.isEcoMode), isLinkFolder, isSlave, isLinkMaster,
        parentBusTrackId, masterTrackId, slaveTrackIds, hasChildOverrides, state.measureTimeSigs, state.timeSig
      );
    })
  );

  if (!uiContext || !stepData) return null;

  const defaultBeats = parseInt(stepData.timeSigStr.split('/')[0], 10) || 4;
  const beatRes = beatResolutions || Array(defaultBeats).fill(4);
  let indexInBeat = 0, beatCount = 4, accumulated = 0;
  for (let b = 0; b < beatRes.length; b++) {
    const res = beatRes[b] ?? 4;
    if (stepIdx >= accumulated && stepIdx < accumulated + res) {
      indexInBeat = stepIdx - accumulated;
      beatCount = res;
      break;
    }
    accumulated += res;
  }

  return (
    <TimelineStepCellVisuals
      stepData={stepData} trackId={trackId} patternId={patternId} measureIdx={measureIdx}
      stepIdx={stepIdx} stepsCount={stepsCount} isTriplet={beatCount === 3} isSextuplet={beatCount === 6}
      indexInBeat={indexInBeat} isMacro={uiContext.isMacro} isMinZoom={uiContext.isMinZoom}
    />
  );
};

export const TimelineStep = React.memo(TimelineStepComponent, (p, n) => (
  p.trackId === n.trackId && p.patternId === n.patternId && p.measureIdx === n.measureIdx &&
  p.stepIdx === n.stepIdx && p.patternStepOffset === n.patternStepOffset && p.stepsCount === n.stepsCount &&
  p.trackIdx === n.trackIdx && p.patternIdx === n.patternIdx && p.instrumentIdx === n.instrumentIdx &&
  p.beatResolutions === n.beatResolutions && p.isLinkFolder === n.isLinkFolder && p.isSlave === n.isSlave &&
  p.isLinkMaster === n.isLinkMaster && p.parentBusTrackId === n.parentBusTrackId &&
  p.masterTrackId === n.masterTrackId && p.hasChildOverrides === n.hasChildOverrides && p.slaveTrackIds === n.slaveTrackIds
));
