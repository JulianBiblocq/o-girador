import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { instrumentsConfig } from '../../data';

export function useSettingsKitDeltas() {
  const setTracks = useSequencerStore((state) => state.setTracks);
  const pushUndoState = useSequencerStore((state) => state.pushUndoState);
  const setStrokeDefault = useSequencerSettingsStore((state) => state.setStrokeDefault);

  const applyMacroVolumeDelta = (trackId: number, stroke: string, delta: number, targetVal: number) => {
    if (pushUndoState) pushUndoState();
    setStrokeDefault(`${trackId}:${stroke}`, { volume: targetVal });
    setTracks((prev) => prev.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const newVols = [...(p.volumes || Array(p.steps).fill(80))];
          let changed = false;
          p.activeSteps.forEach((step, idx) => {
            if (step === stroke) {
              newVols[idx] = Math.max(0, Math.min(100, newVols[idx] + delta));
              changed = true;
            }
          });
          const newVars = p.variations?.map((v) => {
            const vVols = [...(v.volumes || Array(v.steps.length).fill(80))];
            let vChanged = false;
            v.steps.forEach((st, idx) => {
              if (st === stroke) {
                vVols[idx] = Math.max(0, Math.min(100, vVols[idx] + delta));
                vChanged = true;
              }
            });
            return vChanged ? { ...v, volumes: vVols } : v;
          });
          return changed || p.variations ? { ...p, volumes: newVols, variations: newVars } : p;
        }),
      };
    }));
  };

  const applyMacroDecayDelta = (trackId: number, stroke: string, delta: number, targetVal: number) => {
    if (pushUndoState) pushUndoState();
    setStrokeDefault(`${trackId}:${stroke}`, { decay: targetVal });
    setTracks((prev) => prev.map((t) => {
      if (t.id !== trackId) return t;
      const defDecay = instrumentsConfig[t.instrumentIdx]?.type === 'voice' ? 10 : 100;
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const newDecs = [...(p.decays || Array(p.steps).fill(defDecay))];
          let changed = false;
          p.activeSteps.forEach((step, idx) => {
            if (step === stroke) {
              newDecs[idx] = Math.max(10, Math.min(100, newDecs[idx] + delta));
              changed = true;
            }
          });
          const newVars = p.variations?.map((v) => {
            const vDecs = [...(v.decays || Array(v.steps.length).fill(defDecay))];
            let vChanged = false;
            v.steps.forEach((st, idx) => {
              if (st === stroke) {
                vDecs[idx] = Math.max(10, Math.min(100, vDecs[idx] + delta));
                vChanged = true;
              }
            });
            return vChanged ? { ...v, decays: vDecs } : v;
          });
          return changed || p.variations ? { ...p, decays: newDecs, variations: newVars } : p;
        }),
      };
    }));
  };

  return { applyMacroVolumeDelta, applyMacroDecayDelta };
}
