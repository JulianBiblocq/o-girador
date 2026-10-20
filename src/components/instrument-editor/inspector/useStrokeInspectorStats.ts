/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { calculateStrokeStats } from './calculateStrokeStats';

export function useStrokeInspectorStats(trackId: number, isVoice: boolean) {
  const track = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId));
  const setTracks = useSequencerStore((state) => state.setTracks);
  const pushUndoState = useSequencerStore((state) => state.pushUndoState);
  const strokeDefaults = useSequencerSettingsStore((state) => state.strokeDefaults) || {};
  const setStrokeDefault = useSequencerSettingsStore((state) => state.setStrokeDefault);

  const getStrokeStats = (stroke: string) => calculateStrokeStats(track, stroke, isVoice, strokeDefaults);

  const applyMacroVolumeDelta = (stroke: string, delta: number, targetVal: number) => {
    pushUndoState();
    setStrokeDefault(`${trackId}:${stroke}`, { volume: targetVal });
    setTracks((prevTracks) => prevTracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const newVols = [...(p.volumes || [])];
          p.activeSteps.forEach((s, idx) => {
            if (s === stroke) {
              const cur = newVols[idx] !== undefined ? newVols[idx] : 80;
              newVols[idx] = Array.isArray(cur)
                ? [Math.max(0, Math.min(100, cur[0] + delta)), Math.max(0, Math.min(100, cur[1] + delta))]
                : Math.max(0, Math.min(100, cur + delta));
            }
          });
          const newVars = p.variations?.map((v) => {
            const varVols = [...(v.volumes || [])];
            v.steps.forEach((s, idx) => {
              if (s === stroke) {
                const cur = varVols[idx] !== undefined ? varVols[idx] : 80;
                varVols[idx] = Array.isArray(cur)
                  ? [Math.max(0, Math.min(100, cur[0] + delta)), Math.max(0, Math.min(100, cur[1] + delta))]
                  : Math.max(0, Math.min(100, cur + delta));
              }
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
    setStrokeDefault(`${trackId}:${stroke}`, { decay: targetVal });
    const minDecay = isVoice ? 1 : 10;
    setTracks((prevTracks) => prevTracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const newDecays = [...(p.decays || [])];
          p.activeSteps.forEach((s, idx) => {
            if (s === stroke) {
              const cur = newDecays[idx] !== undefined ? newDecays[idx] : (isVoice ? 10 : 100);
              newDecays[idx] = Array.isArray(cur)
                ? [Math.max(minDecay, Math.min(100, cur[0] + delta)), Math.max(minDecay, Math.min(100, cur[1] + delta))]
                : Math.max(minDecay, Math.min(100, cur + delta));
            }
          });
          const newVars = p.variations?.map((v) => {
            const varDecays = [...(v.decays || [])];
            v.steps.forEach((s, idx) => {
              if (s === stroke) {
                const cur = varDecays[idx] !== undefined ? varDecays[idx] : (isVoice ? 10 : 100);
                varDecays[idx] = Array.isArray(cur)
                  ? [Math.max(minDecay, Math.min(100, cur[0] + delta)), Math.max(minDecay, Math.min(100, cur[1] + delta))]
                  : Math.max(minDecay, Math.min(100, cur + delta));
              }
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
