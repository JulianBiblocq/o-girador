import { TrackGroup, StepSculptValue } from '../../types';
import { instrumentsConfig } from '../../data';
import { isSequencerVisibleTrack } from '../../stores/useSequencerStore';

export function updateStepSculptValue(
  currentVal: StepSculptValue | undefined,
  defaultVal: number,
  newVal: number,
  subIndex?: 0 | 1,
  isSplitStep: boolean = false
): StepSculptValue {
  if (subIndex === undefined) {
    if (isSplitStep) {
      return [newVal, newVal];
    }
    return newVal;
  }
  let basePair: [number, number];
  if (Array.isArray(currentVal)) {
    basePair = [currentVal[0], currentVal[1]];
  } else if (typeof currentVal === 'number') {
    basePair = [currentVal, currentVal];
  } else {
    basePair = [defaultVal, defaultVal];
  }
  basePair[subIndex] = newVal;
  return basePair;
}

export function applyRadii(list: TrackGroup[]): TrackGroup[] {
  const drawableTracks = list.filter((t: TrackGroup) => 
    !t.isHidden && 
    isSequencerVisibleTrack(t, list) && 
    instrumentsConfig[t.instrumentIdx]?.id !== 'apito'
  );

  const gap = drawableTracks.length > 1 ? (495 - 180) / (drawableTracks.length - 1) : 0;
  
  return list.map((t: TrackGroup) => {
    const drawableIdx = drawableTracks.findIndex((dt: TrackGroup) => dt.id === t.id);
    if (drawableIdx === -1) {
      return t;
    }
    const newRadius = drawableTracks.length === 1 ? (180 + 495) / 2 : 180 + drawableIdx * gap;
    if (t.radius !== newRadius) {
      return { ...t, radius: newRadius };
    }
    return t;
  });
}
