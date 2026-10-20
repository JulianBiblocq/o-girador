import { useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { instrumentsConfig } from '../../data';
import { TrackGroup } from '../../types';
import { useSettingsKitDeltas } from './useSettingsKitDeltas';

export function useSettingsKitMacros() {
  const tracks = useSequencerStore((state) => state.tracks);
  const strokeDefaults = useSequencerSettingsStore((state) => state.strokeDefaults);
  const forcedStrokes = useSequencerSettingsStore((state) => state.forcedStrokes) || {};
  const setStrokeForcedState = useSequencerSettingsStore((state) => state.setStrokeForcedState);
  const { applyMacroVolumeDelta, applyMacroDecayDelta } = useSettingsKitDeltas();

  const activeTracks = useMemo(() => {
    return tracks.filter((t) => {
      if (t.isBusFolder || t.isLinkFolder || t.instrumentIdx === undefined) return false;
      const conf = instrumentsConfig[t.instrumentIdx];
      return conf && conf.type !== 'voice';
    });
  }, [tracks]);

  const getActiveStrokesForTrack = (track: TrackGroup): string[] => {
    const activeStrokes = new Set<string>();
    let patternsToScan = track.patterns;
    if (track.linkedToTrackId && !track.isLinkFolder) {
      const parentBus = tracks.find((p) => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder);
      if (parentBus) patternsToScan = parentBus.patterns;
    }
    patternsToScan?.forEach((pattern) => {
      pattern.activeSteps.forEach((step) => {
        if (step !== 0 && typeof step === 'string') activeStrokes.add(step);
      });
      pattern.variations?.forEach((v) => {
        v.steps.forEach((step) => {
          if (step !== 0 && typeof step === 'string') activeStrokes.add(step);
        });
      });
    });
    return Array.from(activeStrokes).sort();
  };

  const getStrokeAverages = (track: TrackGroup, stroke: string) => {
    let volSum = 0, volCount = 0, decaySum = 0, decayCount = 0;
    const inst = instrumentsConfig[track.instrumentIdx];
    const defaultDecay = inst?.type === 'voice' ? 10 : 100;

    track.patterns.forEach((p) => {
      const vols = p.volumes || [];
      const decays = p.decays || [];
      p.activeSteps.forEach((s, idx) => {
        if (s === stroke) {
          volSum += vols[idx] !== undefined ? (Array.isArray(vols[idx]) ? vols[idx][0] : vols[idx]) : 80;
          volCount++;
          decaySum += decays[idx] !== undefined ? (Array.isArray(decays[idx]) ? decays[idx][0] : decays[idx]) : defaultDecay;
          decayCount++;
        }
      });
      p.variations?.forEach((v) => {
        const vVols = v.volumes || [];
        const vDecays = v.decays || [];
        v.steps.forEach((s, idx) => {
          if (s === stroke) {
            volSum += vVols[idx] !== undefined ? (Array.isArray(vVols[idx]) ? vVols[idx][0] : vVols[idx]) : 80;
            volCount++;
            decaySum += vDecays[idx] !== undefined ? (Array.isArray(vDecays[idx]) ? vDecays[idx][0] : vDecays[idx]) : defaultDecay;
            decayCount++;
          }
        });
      });
    });

    if (volCount > 0 && decayCount > 0) {
      return { avgVolume: Math.round(volSum / volCount), avgDecay: Math.round(decaySum / decayCount) };
    }
    const defs = strokeDefaults[`${track.id}:${stroke}`];
    return {
      avgVolume: defs?.volume !== undefined ? defs.volume : 80,
      avgDecay: defs?.decay !== undefined ? defs.decay : defaultDecay,
    };
  };

  return {
    activeTracks,
    forcedStrokes,
    setStrokeForcedState,
    getActiveStrokesForTrack,
    getStrokeAverages,
    applyMacroVolumeDelta,
    applyMacroDecayDelta,
  };
}
