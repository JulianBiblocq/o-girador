import { TrackGroup } from '../../types';
import { updateStepSculptValue } from './sequencerStateTypes';
import {
  syncPatternAcrossLinkedFamily,
  syncVariationAcrossLinkedFamily,
} from '../../stores/helpers/patternStepLinkedTracksSync';

export interface VariationSculptContext {
  pushUndoState: () => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function createTrackVariationSculptHandlers(ctx: VariationSculptContext) {
  const { pushUndoState, setTracks } = ctx;

  const handleTrackStepVolumeChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => {
    setTracks((prev) => syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p) => {
      const copyVols = [...(p.volumes || Array(p.steps).fill(70))];
      const indices = Array.isArray(stepIdx) ? stepIdx : [stepIdx];
      indices.forEach((idx) => { copyVols[idx] = updateStepSculptValue(copyVols[idx], 70, val, subIndex, Array.isArray(p.activeSteps[idx])); });
      return { ...p, volumes: copyVols };
    }));
  };

  const handleTrackStepDecayChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => {
    setTracks((prev) => syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p) => {
      const copyDecays = [...(p.decays || Array(p.steps).fill(100))];
      const indices = Array.isArray(stepIdx) ? stepIdx : [stepIdx];
      indices.forEach((idx) => { copyDecays[idx] = updateStepSculptValue(copyDecays[idx], 100, val, subIndex, Array.isArray(p.activeSteps[idx])); });
      return { ...p, decays: copyDecays };
    }));
  };

  const handleTrackStepMicrotimingChange = (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => {
    setTracks((prev) => syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p) => {
      const copyMicros = [...(p.microtimings || Array(p.steps).fill(0))];
      const indices = Array.isArray(stepIdx) ? stepIdx : [stepIdx];
      indices.forEach((idx) => { copyMicros[idx] = updateStepSculptValue(copyMicros[idx], 0, val, subIndex, Array.isArray(p.activeSteps[idx])); });
      return { ...p, microtimings: copyMicros };
    }));
  };

  const handleAddPatternVariation = (trackId: number, patternId: number) => {
    pushUndoState();
    const newVarId = Date.now().toString();
    setTracks((prev) => syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p) => {
      const currentVars = p.variations || [];
      const isFirstCreated = currentVars.length === 0;
      const newVar = {
        id: newVarId,
        name: `Var ${currentVars.length + 1}`,
        steps: [...p.activeSteps],
        probability: 30,
        playFirstTimeOnly: false,
        volumes: p.volumes ? [...p.volumes] : undefined,
        decays: p.decays ? [...p.decays] : undefined,
        microtimings: p.microtimings ? [...p.microtimings] : undefined,
        beatResolutions: p.beatResolutions ? [...p.beatResolutions] : undefined,
      };
      let nextAllow = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
      if (isFirstCreated && Array.isArray(p.measureAssignments)) {
        const manual = (p as any).measureAllowVariationsManual as boolean[] | undefined;
        const baseAllow = nextAllow ? [...nextAllow] : Array(p.measureAssignments.length).fill(true);
        while (baseAllow.length < p.measureAssignments.length) baseAllow.push(true);
        p.measureAssignments.forEach((assigned, mIdx) => {
          if (assigned && !manual?.[mIdx]) baseAllow[mIdx] = true;
        });
        nextAllow = baseAllow;
      }
      return {
        ...p,
        variations: [...currentVars, newVar],
        ...(nextAllow ? { measureAllowVariations: nextAllow } : {}),
      };
    }));
  };

  const handleUpdatePatternVariationProbability = (trackId: number, patternId: number, variationId: string, probability: number) => {
    pushUndoState();
    const clamped = Math.max(0, Math.min(100, probability));
    setTracks((prev) => syncVariationAcrossLinkedFamily(prev, trackId, patternId, variationId, (v) => ({ ...v, probability: clamped })));
  };

  const handleTogglePatternVariationFirstTimeOnly = (trackId: number, patternId: number, variationId: string, val: boolean) => {
    pushUndoState();
    setTracks((prev) => syncVariationAcrossLinkedFamily(prev, trackId, patternId, variationId, (v) => ({ ...v, playFirstTimeOnly: val })));
  };

  const handleDeletePatternVariation = (trackId: number, patternId: number, variationId: string) => {
    pushUndoState();
    setTracks((prev) => {
      const srcTrack = prev.find((t) => String(t.id) === String(trackId));
      const srcPattern = srcTrack?.patterns.find((p) => String(p.id) === String(patternId));
      const srcVarIdx = srcPattern?.variations?.findIndex((v) => String(v.id) === String(variationId)) ?? -1;
      const normVarName = srcVarIdx >= 0 ? srcPattern?.variations?.[srcVarIdx]?.name?.trim().toLowerCase() : undefined;

      return syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p, isSource) => {
        if (!p.variations?.length) return p;
        if (isSource) return { ...p, variations: p.variations.filter((v) => String(v.id) !== String(variationId)) };
        let delIdx = p.variations.findIndex((v) => String(v.id) === String(variationId));
        if (delIdx === -1 && normVarName) delIdx = p.variations.findIndex((v) => v.name?.trim().toLowerCase() === normVarName);
        if (delIdx === -1 && srcVarIdx >= 0 && srcVarIdx < p.variations.length) delIdx = srcVarIdx;
        if (delIdx === -1) return p;
        return { ...p, variations: p.variations.filter((_, idx) => idx !== delIdx) };
      });
    });
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
