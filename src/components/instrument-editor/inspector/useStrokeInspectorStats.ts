import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { calculateStrokeStats } from './calculateStrokeStats';
import { applyStrokeParamToTrack } from './strokeInspectorBatchWriter';
import { getMinStrokeDecay, resolveInspectorTrackScope } from './strokeInspectorScope';

const EMPTY_STROKE_DEFAULTS: Record<string, { volume?: number; decay?: number }> = {};

export interface MacroStrokeUpdateOptions {
  skipUndo?: boolean;
}

export function useStrokeInspectorStats(trackId: number, isVoice: boolean) {
  const readTracks = useSequencerStore(
    useShallow(useCallback((state) => resolveInspectorTrackScope(trackId, state.tracks).readTracks, [trackId]))
  );
  const setTracks = useSequencerStore((state) => state.setTracks);
  const pushUndoState = useSequencerStore((state) => state.pushUndoState);
  const strokeDefaults = useSequencerSettingsStore((state) => state.strokeDefaults ?? EMPTY_STROKE_DEFAULTS);
  const setStrokeDefault = useSequencerSettingsStore((state) => state.setStrokeDefault);

  const getStrokeStats = useCallback(
    (stroke: string) => calculateStrokeStats(readTracks, stroke, isVoice, strokeDefaults, trackId),
    [readTracks, isVoice, strokeDefaults, trackId]
  );

  const applyMacroVolumeDelta = useCallback(
    (stroke: string, _delta: number, targetVal: number, options?: MacroStrokeUpdateOptions) => {
      if (!options?.skipUndo) pushUndoState();
      const clampedTarget = Math.max(0, Math.min(100, Math.round(targetVal)));
      const { writeTrackIds } = resolveInspectorTrackScope(trackId, useSequencerStore.getState().tracks);
      writeTrackIds.forEach((fId) => setStrokeDefault(`${fId}:${stroke}`, { volume: clampedTarget }));

      setTracks((prevTracks) =>
        prevTracks.map((t) =>
          writeTrackIds.has(String(t.id)) ? applyStrokeParamToTrack(t, 'volume', stroke, isVoice, clampedTarget) : t
        )
      );
    },
    [trackId, isVoice, pushUndoState, setStrokeDefault, setTracks]
  );

  const applyMacroDecayDelta = useCallback(
    (stroke: string, _delta: number, targetVal: number, options?: MacroStrokeUpdateOptions) => {
      if (!options?.skipUndo) pushUndoState();
      const minDecay = getMinStrokeDecay(isVoice);
      const clampedTarget = Math.max(minDecay, Math.min(100, Math.round(targetVal)));
      const { writeTrackIds } = resolveInspectorTrackScope(trackId, useSequencerStore.getState().tracks);
      writeTrackIds.forEach((fId) => setStrokeDefault(`${fId}:${stroke}`, { decay: clampedTarget }));

      setTracks((prevTracks) =>
        prevTracks.map((t) =>
          writeTrackIds.has(String(t.id)) ? applyStrokeParamToTrack(t, 'decay', stroke, isVoice, clampedTarget) : t
        )
      );
    },
    [trackId, isVoice, pushUndoState, setStrokeDefault, setTracks]
  );

  return { getStrokeStats, applyMacroVolumeDelta, applyMacroDecayDelta };
}
