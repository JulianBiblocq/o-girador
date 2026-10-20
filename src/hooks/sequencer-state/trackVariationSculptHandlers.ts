import { TrackGroup, Pattern, StepSculptValue } from '../../types';
import { updateStepSculptValue } from './sequencerStateTypes';

export interface VariationSculptContext {
  pushUndoState: () => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function createTrackVariationSculptHandlers(ctx: VariationSculptContext) {
  const { pushUndoState, setTracks } = ctx;

  const handleTrackStepVolumeChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId) return p;
          const copyVols = [...(p.volumes || Array(p.steps).fill(80))];
          if (Array.isArray(stepIdx)) {
            stepIdx.forEach((idx: number) => { copyVols[idx] = updateStepSculptValue(copyVols[idx], 80, val, subIndex, Array.isArray(p.activeSteps[idx])); });
          } else {
            copyVols[stepIdx] = updateStepSculptValue(copyVols[stepIdx], 80, val, subIndex, Array.isArray(p.activeSteps[stepIdx]));
          }
          return { ...p, volumes: copyVols };
        })
      };
    }));
  };

  const handleTrackStepDecayChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId) return p;
          const copyDecays = [...(p.decays || Array(p.steps).fill(100))];
          if (Array.isArray(stepIdx)) {
            stepIdx.forEach((idx: number) => { copyDecays[idx] = updateStepSculptValue(copyDecays[idx], 100, val, subIndex, Array.isArray(p.activeSteps[idx])); });
          } else {
            copyDecays[stepIdx] = updateStepSculptValue(copyDecays[stepIdx], 100, val, subIndex, Array.isArray(p.activeSteps[stepIdx]));
          }
          return { ...p, decays: copyDecays };
        })
      };
    }));
  };

  const handleTrackStepMicrotimingChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => {
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId) return p;
          const copyMicros = [...(p.microtimings || Array(p.steps).fill(0))];
          if (Array.isArray(stepIdx)) {
            stepIdx.forEach((idx: number) => { copyMicros[idx] = updateStepSculptValue(copyMicros[idx], 0, val, subIndex, Array.isArray(p.activeSteps[idx])); });
          } else {
            copyMicros[stepIdx] = updateStepSculptValue(copyMicros[stepIdx], 0, val, subIndex, Array.isArray(p.activeSteps[stepIdx]));
          }
          return { ...p, microtimings: copyMicros };
        })
      };
    }));
  };

  const handleAddPatternVariation = (trackId: number, patternId: number) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId) return p;
          const currentVariations = p.variations || [];
          const newVar = { id: Date.now().toString(), name: `Var ${currentVariations.length + 1}`, steps: [...p.activeSteps], probability: 30, playFirstTimeOnly: currentVariations.length === 0 };
          return { ...p, variations: [...currentVariations, newVar] };
        })
      };
    }));
  };

  const handleUpdatePatternVariationProbability = (trackId: number, patternId: number, variationId: string, probability: number) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId || !p.variations) return p;
          return { ...p, variations: p.variations.map((v: any) => v.id === variationId ? { ...v, probability: Math.max(0, Math.min(100, probability)) } : v) };
        })
      };
    }));
  };

  const handleTogglePatternVariationFirstTimeOnly = (trackId: number, patternId: number, variationId: string, val: boolean) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId || !p.variations) return p;
          return { ...p, variations: p.variations.map((v: any) => v.id === variationId ? { ...v, playFirstTimeOnly: val } : v) };
        })
      };
    }));
  };

  const handleDeletePatternVariation = (trackId: number, patternId: number, variationId: string) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== patternId || !p.variations) return p;
          return { ...p, variations: p.variations.filter((v: any) => v.id !== variationId) };
        })
      };
    }));
  };

  return {
    handleTrackStepVolumeChange,
    handleTrackStepDecayChange,
    handleTrackStepMicrotimingChange,
    handleAddPatternVariation,
    handleUpdatePatternVariationProbability,
    handleTogglePatternVariationFirstTimeOnly,
    handleDeletePatternVariation,
  };
}
