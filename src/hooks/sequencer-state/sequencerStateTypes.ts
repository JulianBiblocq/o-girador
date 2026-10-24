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

  const visibleCount = drawableTracks.length;
  const minRadius = 180;
  const maxRadius = 495;

  return list.map((t: TrackGroup) => {
    const drawableIdx = drawableTracks.findIndex((dt: TrackGroup) => dt.id === t.id);
    if (drawableIdx === -1) {
      return t;
    }
    const tNorm = visibleCount > 1 ? drawableIdx / (visibleCount - 1) : 0.5;
    const newRadius = maxRadius - tNorm * (maxRadius - minRadius);
    if (t.radius !== newRadius) {
      return { ...t, radius: newRadius };
    }
    return t;
  });
}
