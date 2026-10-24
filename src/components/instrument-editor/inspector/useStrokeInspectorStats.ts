
import { useSequencerStore, getTrackFamilyIds } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { calculateStrokeStats } from './calculateStrokeStats';

function updateStepParam(
  curVal: number | [number, number] | undefined,
  step: any,
  stroke: string,
  delta: number,
  minVal: number,
  defaultVal: number
): number | [number, number] {
  if (Array.isArray(step)) {
    const m0 = step[0] === stroke;
    const m1 = step[1] === stroke;
    if (m0 || m1) {
      const cur = curVal !== undefined ? curVal : [defaultVal, defaultVal];
      const v0 = Array.isArray(cur) ? cur[0] : cur;
      const v1 = Array.isArray(cur) ? cur[1] : cur;
      return [
        m0 ? Math.max(minVal, Math.min(100, v0 + delta)) : v0,
        m1 ? Math.max(minVal, Math.min(100, v1 + delta)) : v1,
      ];
    }
    return curVal !== undefined ? curVal : [defaultVal, defaultVal];
  }
  if (step === stroke) {
    const cur = curVal !== undefined ? curVal : defaultVal;
    return Array.isArray(cur)
      ? [Math.max(minVal, Math.min(100, cur[0] + delta)), Math.max(minVal, Math.min(100, cur[1] + delta))]
      : Math.max(minVal, Math.min(100, cur + delta));
  }
  return curVal !== undefined ? curVal : defaultVal;
}

export function useStrokeInspectorStats(trackId: number, isVoice: boolean) {
  const track = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId));
  const setTracks = useSequencerStore((state) => state.setTracks);
  const pushUndoState = useSequencerStore((state) => state.pushUndoState);
  const strokeDefaults = useSequencerSettingsStore((state) => state.strokeDefaults) || {};
  const setStrokeDefault = useSequencerSettingsStore((state) => state.setStrokeDefault);

  const getStrokeStats = (stroke: string) => calculateStrokeStats(track, stroke, isVoice, strokeDefaults);

  const applyMacroVolumeDelta = (stroke: string, delta: number, targetVal: number) => {
    pushUndoState();
    const familyIds = new Set(getTrackFamilyIds(trackId, useSequencerStore.getState().tracks));
    familyIds.forEach((fId) => setStrokeDefault(`${fId}:${stroke}`, { volume: targetVal }));

    setTracks((prevTracks) => prevTracks.map((t) => {
      if (!familyIds.has(String(t.id))) return t;
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const newVols = [...(p.volumes || [])];
          p.activeSteps.forEach((s, idx) => {
            newVols[idx] = updateStepParam(newVols[idx], s, stroke, delta, 0, 80);
          });
          const newVars = p.variations?.map((v) => {
            const varVols = [...(v.volumes || [])];
            v.steps.forEach((s, idx) => {
              varVols[idx] = updateStepParam(varVols[idx], s, stroke, delta, 0, 80);
            });
            return { ...v, volumes: varVols };
          });
          return { ...p, volumes: newVols, variations: newVars };
        }),
      };
    }));
  };

  const applyMacroDecayDelta = (stroke: string, delta: number, targetVal: number) => {
    pushUndoState();
    const familyIds = new Set(getTrackFamilyIds(trackId, useSequencerStore.getState().tracks));
    familyIds.forEach((fId) => setStrokeDefault(`${fId}:${stroke}`, { decay: targetVal }));

    const minDecay = isVoice ? 1 : 10;
    const defaultDecay = isVoice ? 10 : 100;

    setTracks((prevTracks) => prevTracks.map((t) => {
      if (!familyIds.has(String(t.id))) return t;
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const newDecays = [...(p.decays || [])];
          p.activeSteps.forEach((s, idx) => {
            newDecays[idx] = updateStepParam(newDecays[idx], s, stroke, delta, minDecay, defaultDecay);
          });
          const newVars = p.variations?.map((v) => {
            const varDecays = [...(v.decays || [])];
            v.steps.forEach((s, idx) => {
              varDecays[idx] = updateStepParam(varDecays[idx], s, stroke, delta, minDecay, defaultDecay);
            });
            return { ...v, decays: varDecays };
          });
          return { ...p, decays: newDecays, variations: newVars };
        }),
      };
    }));
  };

  return { getStrokeStats, applyMacroVolumeDelta, applyMacroDecayDelta };
}
