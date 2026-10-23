
import { Pattern } from '../../../types';
import { useSequencerStore } from '../../../stores/useSequencerStore';

export interface GridBeatsInfo {
  beatsPerMeasure: number;
  effectiveBeats: number;
  gridColsClass: string;
  groups: number[][];
}

export function computePercussionGridGroups(pattern: Pattern): GridBeatsInfo {
  const patTimeSig = (pattern as any)?.timeSignature || useSequencerStore.getState().timeSig || '4/4';
  const stepsCount = pattern?.steps ?? 16;
  let beatsPerMeasure = 4;
  if (patTimeSig === '2/4' || patTimeSig === '6/8') beatsPerMeasure = 2;
  else if (patTimeSig === '12/8') beatsPerMeasure = 4;
  else if (patTimeSig === '3/4' || patTimeSig === '9/8') beatsPerMeasure = 3;
  else if (stepsCount === 8) beatsPerMeasure = 2;
  else if (stepsCount === 12) beatsPerMeasure = 3;
  else {
    const parsed = parseInt(patTimeSig.split('/')[0], 10);
    if (Number.isFinite(parsed) && parsed > 0) beatsPerMeasure = parsed;
  }

  const defaultRes = (patTimeSig === '6/8' || patTimeSig === '9/8' || patTimeSig === '12/8') ? 3 : 4;
  const totalBeats = Math.max(1, Math.ceil(stepsCount / defaultRes));
  const effectiveBeats = (stepsCount <= 8 && beatsPerMeasure === 2)
    ? 2
    : (stepsCount <= 12 && beatsPerMeasure === 3)
    ? 3
    : beatsPerMeasure === 4
    ? 4
    : totalBeats;

  const gridColsClass = beatsPerMeasure === 2
    ? 'grid-cols-2 max-w-2xl mx-auto'
    : beatsPerMeasure === 3
    ? 'grid-cols-3 max-w-4xl mx-auto'
    : 'grid-cols-4';

  const groups: number[][] = [];
  let accumulated = 0;
  const beatRes = pattern?.beatResolutions?.slice(0, effectiveBeats) || Array(effectiveBeats).fill(defaultRes);
  for (let b = 0; b < effectiveBeats; b++) {
    const res = beatRes[b] || defaultRes;
    const group: number[] = [];
    for (let i = 0; i < res; i++) {
      if (accumulated + i < stepsCount) {
        group.push(accumulated + i);
      }
    }
    if (group.length > 0) groups.push(group);
    accumulated += res;
  }

  return { beatsPerMeasure, effectiveBeats, gridColsClass, groups };
}
