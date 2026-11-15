import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { updateStepSculptValue } from './sequencerStateTypes';
import { syncVariationAcrossLinkedFamily } from '../../stores/helpers/patternStepLinkedTracksSync';

export interface VariationStepSculptContext {
  pushUndoState: () => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function createVariationStepSculptHandlers(ctx: VariationStepSculptContext) {
  const { pushUndoState, setTracks } = ctx;

  const handleVariationStepVolumeChange = (
    trackId: number,
    patternId: number,
    variationId: string,
    stepIdx: number | number[],
    val: number,
    subIndex?: 0 | 1
  ) => {
    setTracks((prev: TrackGroup[]) =>
      syncVariationAcrossLinkedFamily(prev, trackId, patternId, variationId, (v) => {
        const copyVols = [...(v.volumes || Array(v.steps?.length || 16).fill(70))];
        if (Array.isArray(stepIdx)) {
          stepIdx.forEach((idx: number) => {
            copyVols[idx] = updateStepSculptValue(copyVols[idx], 70, val, subIndex, Array.isArray(v.steps[idx]));
          });
        } else {
          copyVols[stepIdx] = updateStepSculptValue(copyVols[stepIdx], 70, val, subIndex, Array.isArray(v.steps[stepIdx]));
        }
        return { ...v, volumes: copyVols };
      })
    );
  };

  const handleVariationStepDecayChange = (
    trackId: number,
    patternId: number,
    variationId: string,
    stepIdx: number | number[],
    val: number,
    subIndex?: 0 | 1
  ) => {
    setTracks((prev: TrackGroup[]) =>
      syncVariationAcrossLinkedFamily(prev, trackId, patternId, variationId, (v) => {
        const copyDecays = [...(v.decays || Array(v.steps?.length || 16).fill(100))];
        if (Array.isArray(stepIdx)) {
          stepIdx.forEach((idx: number) => {
            copyDecays[idx] = updateStepSculptValue(copyDecays[idx], 100, val, subIndex, Array.isArray(v.steps[idx]));
          });
        } else {
          copyDecays[stepIdx] = updateStepSculptValue(copyDecays[stepIdx], 100, val, subIndex, Array.isArray(v.steps[stepIdx]));
        }
        return { ...v, decays: copyDecays };
      })
    );
  };

  const handleVariationStepMicrotimingChange = (
    trackId: number,
    patternId: number,
    variationId: string,
    stepIdx: number | number[],
    val: number,
    subIndex?: 0 | 1
  ) => {
    setTracks((prev: TrackGroup[]) =>
      syncVariationAcrossLinkedFamily(prev, trackId, patternId, variationId, (v) => {
        const copyMicros = [...(v.microtimings || Array(v.steps?.length || 16).fill(0))];
        if (Array.isArray(stepIdx)) {
          stepIdx.forEach((idx: number) => {
            copyMicros[idx] = updateStepSculptValue(copyMicros[idx], 0, val, subIndex, Array.isArray(v.steps[idx]));
          });
        } else {
          copyMicros[stepIdx] = updateStepSculptValue(copyMicros[stepIdx], 0, val, subIndex, Array.isArray(v.steps[stepIdx]));
        }
        return { ...v, microtimings: copyMicros };
      })
    );
  };

  const handleVariationStepValueChange = (
    trackId: number,
    patternId: number,
    variationId: string,
    stepIdx: number | number[],
    val: string | number | string[] | [string, string],
    options?: { skipUndo?: boolean }
  ) => {
    if (!options?.skipUndo) pushUndoState();
    setTracks((prev: TrackGroup[]) =>
      syncVariationAcrossLinkedFamily(prev, trackId, patternId, variationId, (v, _isSrc, t) => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id;
        const isAlfaia = Boolean(instId && ['marcante', 'meiao', 'repique', 'alfaia'].includes(instId));
        const norm = (s: string | number): string | number => (isAlfaia && String(s).trim() === 'a' ? 'A' : s);
        const nextSteps = [...v.steps];
        if (Array.isArray(stepIdx)) {
          stepIdx.forEach((idx: number, i: number) => {
            const cur = Array.isArray(val) ? val[i] : val;
            nextSteps[idx] = Array.isArray(cur) ? [String(norm(cur[0])), String(norm(cur[1]))] : norm(cur as string | number);
          });
        } else {
          nextSteps[stepIdx] = Array.isArray(val) ? [String(norm(val[0])), String(norm(val[1]))] : norm(val as string | number);
        }
        return { ...v, steps: nextSteps };
      })
    );
  };

  return {
    handleVariationStepVolumeChange,
    handleVariationStepDecayChange,
    handleVariationStepMicrotimingChange,
    handleVariationStepValueChange,
  };
}
