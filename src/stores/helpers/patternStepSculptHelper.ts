import { TrackGroup } from '../../types';

export const handleTrackStepVolumeChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number | number[],
  val: number,
  subIndex?: 0 | 1
): TrackGroup[] => tracks.map(t => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map(p => {
        if (p.id === patternId) {
          const copyVols = [...(p.volumes || Array(p.steps).fill(80))];
          const updateVal = (idx: number) => {
            const isSplit = Array.isArray(p.activeSteps[idx]);
            if (subIndex === undefined) {
              copyVols[idx] = isSplit ? [val, val] : val;
            } else {
              const base0 = Array.isArray(copyVols[idx]) ? (copyVols[idx] as [number, number])[0] : (copyVols[idx] as number ?? 80);
              const base1 = Array.isArray(copyVols[idx]) ? (copyVols[idx] as [number, number])[1] : (copyVols[idx] as number ?? 80);
              copyVols[idx] = subIndex === 0 ? [val, base1] : [base0, val];
            }
          };
          if (Array.isArray(stepIdx)) {
            stepIdx.forEach(idx => updateVal(idx));
          } else {
            updateVal(stepIdx);
          }
          return { ...p, volumes: copyVols };
        }
        return p;
      })
    };
  }
  return t;
});

export const handleTrackStepDecayChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number | number[],
  val: number,
  subIndex?: 0 | 1
): TrackGroup[] => tracks.map(t => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map(p => {
        if (p.id === patternId) {
          const copyDecays = [...(p.decays || Array(p.steps).fill(100))];
          const updateVal = (idx: number) => {
            const isSplit = Array.isArray(p.activeSteps[idx]);
            if (subIndex === undefined) {
              copyDecays[idx] = isSplit ? [val, val] : val;
            } else {
              const base0 = Array.isArray(copyDecays[idx]) ? (copyDecays[idx] as [number, number])[0] : (copyDecays[idx] as number ?? 100);
              const base1 = Array.isArray(copyDecays[idx]) ? (copyDecays[idx] as [number, number])[1] : (copyDecays[idx] as number ?? 100);
              copyDecays[idx] = subIndex === 0 ? [val, base1] : [base0, val];
            }
          };
          if (Array.isArray(stepIdx)) {
            stepIdx.forEach(idx => updateVal(idx));
          } else {
            updateVal(stepIdx);
          }
          return { ...p, decays: copyDecays };
        }
        return p;
      })
    };
  }
  return t;
});

export const handleTrackStepMicrotimingChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number | number[],
  val: number,
  subIndex?: 0 | 1
): TrackGroup[] => tracks.map(t => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map(p => {
        if (p.id === patternId) {
          const copyMicros = [...(p.microtimings || Array(p.steps).fill(0))];
          const updateVal = (idx: number) => {
            const isSplit = Array.isArray(p.activeSteps[idx]);
            if (subIndex === undefined) {
              copyMicros[idx] = isSplit ? [val, val] : val;
            } else {
              const base0 = Array.isArray(copyMicros[idx]) ? (copyMicros[idx] as [number, number])[0] : (copyMicros[idx] as number ?? 0);
              const base1 = Array.isArray(copyMicros[idx]) ? (copyMicros[idx] as [number, number])[1] : (copyMicros[idx] as number ?? 0);
              copyMicros[idx] = subIndex === 0 ? [val, base1] : [base0, val];
            }
          };
          if (Array.isArray(stepIdx)) {
            stepIdx.forEach(idx => updateVal(idx));
          } else {
            updateVal(stepIdx);
          }
          return { ...p, microtimings: copyMicros };
        }
        return p;
      })
    };
  }
  return t;
});

export const handleVocalLatencyChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  latencyMs: number
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map((p) => (p.id === patternId ? { ...p, vocalLatency: latencyMs } : p))
    };
  }
  return t;
});
