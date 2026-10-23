import { TrackGroup } from '../../types';

export const toggleArmPatternState = (
  state: { armedTrackId: number | null; armedPatternId: number | null; isPatternRecording: boolean },
  trackId: number,
  patternId: number
) => {
  const isCurrentlyArmed = state.armedPatternId === patternId;
  const nextArmed = isCurrentlyArmed ? null : patternId;
  return {
    armedTrackId: isCurrentlyArmed ? null : trackId,
    armedPatternId: nextArmed,
    isPatternRecording: nextArmed === null ? false : state.isPatternRecording,
  };
};

export const updatePatternStepState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number,
  char: string | number | [string, string]
): { tracks: TrackGroup[]; changed: boolean } => {
  let changed = false;
  const nextTracks = tracks.map(t => {
    if (t.id === trackId || String(t.id) === String(trackId)) {
      const nextPatterns = t.patterns.map(p => {
        if (p.id === patternId) {
          const currentActive = [...(p.activeSteps || [])];
          const maxSteps = p.steps || currentActive.length || 16;
          while (currentActive.length < maxSteps) {
            currentActive.push(0);
          }
          if (stepIdx >= 0 && stepIdx < maxSteps) {
            const nextVal = char === '0' ? 0 : char;
            currentActive[stepIdx] = nextVal;
            changed = true;
            let nextNotes = p.notes;
            if ((nextVal === 0 || nextVal === '0') && p.notes) {
              nextNotes = [...p.notes];
              nextNotes[stepIdx] = '';
            }
            let nextVols = p.volumes ? [...p.volumes] : Array(maxSteps).fill(80);
            while (nextVols.length < maxSteps) nextVols.push(80);
            return {
              ...p,
              activeSteps: currentActive,
              volumes: nextVols,
              ...(nextNotes ? { notes: nextNotes } : {})
            };
          }
        }
        return p;
      });
      return { ...t, patterns: nextPatterns };
    }
    return t;
  });

  return { tracks: nextTracks, changed };
};

export const setSelectedPatternIdState = (
  state: { tracks: TrackGroup[]; editingTrackId?: number | null },
  trackIdOrPatternId: number,
  patternId?: number
): { selectedPatternId: number; tracks: TrackGroup[] } => {
  if (patternId === undefined) {
    const pId = trackIdOrPatternId;
    const editingTrackId = state.editingTrackId;
    return {
      selectedPatternId: pId,
      tracks: editingTrackId !== null && editingTrackId !== undefined
        ? state.tracks.map(t => (t.id === editingTrackId || String(t.id) === String(editingTrackId))
            ? { ...t, selectedPatternId: pId }
            : t)
        : state.tracks
    };
  }
  const tId = trackIdOrPatternId;
  return {
    selectedPatternId: patternId,
    tracks: state.tracks.map(t => (t.id === tId || String(t.id) === String(tId))
      ? { ...t, selectedPatternId: patternId }
      : t
    )
  };
};
