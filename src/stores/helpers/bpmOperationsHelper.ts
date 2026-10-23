
import { applyBpmDelta, getEffectiveBpm } from '../../utils/bpmUtils';

export function applyGlobalBpmDeltaState(state: any, delta: number) {
  const currentMeasure = state.currentMeasure || 0;
  const currentEffective = getEffectiveBpm(state.bpm, state.measureBpms, currentMeasure);
  const { nextBpm, nextMeasureBpms } = applyBpmDelta(
    currentEffective,
    state.measureBpms || [],
    delta
  );

  return {
    bpm: nextBpm,
    measureBpms: nextMeasureBpms,
    tracksVersion: state.tracksVersion + 1,
  };
}

export function setGlobalBpmState(state: any, targetBpm: number) {
  const currentMeasure = state.currentMeasure || 0;
  const currentEffective = getEffectiveBpm(state.bpm, state.measureBpms, currentMeasure);
  const delta = targetBpm - currentEffective;
  if (delta === 0) return {};
  return applyGlobalBpmDeltaState(state, delta);
}

export function resetTempoToNominalState(state: any) {
  const nominalBpm = state.nominalPresetBpm ?? state.bpm ?? 83;
  const nominalBpms = (state.nominalPresetMeasureBpms && state.nominalPresetMeasureBpms.length > 0)
    ? [...state.nominalPresetMeasureBpms]
    : Array(state.totalMeasures || 8).fill(nominalBpm);

  return {
    bpm: nominalBpm,
    measureBpms: nominalBpms,
    tracksVersion: state.tracksVersion + 1,
  };
}

export function handleMeasureBpmChangeState(get: () => any, set: (fn: any) => void, idx: number, val: number) {
  const state = get();
  if (state.selectedAutomationType === 'bpm' && state.selectedAutomationRange && idx >= state.selectedAutomationRange.start && idx <= state.selectedAutomationRange.end) {
    state.setGroupedAutomationValue('bpm', val, null);
    return;
  }
  get().pushUndoState();
  set((s: any) => {
    const arr = [...s.measureBpms];
    arr[idx] = val;
    return { measureBpms: arr, bpm: idx === 0 ? val : s.bpm, tracksVersion: s.tracksVersion + 1 };
  });
}

export function handleMeasureVolChangeState(get: () => any, set: (fn: any) => void, idx: number, val: number) {
  const state = get();
  if (state.selectedAutomationType === 'volume' && (state.selectedAutomationTrackId === null || state.selectedAutomationTrackId === undefined) && state.selectedAutomationRange && idx >= state.selectedAutomationRange.start && idx <= state.selectedAutomationRange.end) {
    state.setGroupedAutomationValue('volume', val, null);
    return;
  }
  get().pushUndoState();
  set((s: any) => {
    const arr = [...s.measureVols];
    arr[idx] = val;
    return { measureVols: arr, tracksVersion: s.tracksVersion + 1 };
  });
}
