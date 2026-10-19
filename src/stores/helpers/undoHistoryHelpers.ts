import { TrackGroup, SongSection, SongMarker, TimeSignature } from '../../types';

export interface StructureSnapshot {
  totalMeasures: number;
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
  songSections: SongSection[];
  songMarkers: SongMarker[];
  vocalTransposeSteps?: number;
}

export interface PendingUndoSnapshot {
  tracks: TrackGroup[];
  structure: StructureSnapshot;
}

let pendingUndoSnapshot: PendingUndoSnapshot | null = null;
let idleUndoId: any = null;

export const scheduleUndoIdle = (fn: () => void): any => {
  if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
    return (window as any).requestIdleCallback(fn, { timeout: 300 });
  }
  return setTimeout(fn, 0);
};

export const cancelUndoIdle = (id: any): void => {
  if (id === null || id === undefined) return;
  if (typeof window !== 'undefined' && typeof (window as any).cancelIdleCallback === 'function' && typeof id === 'number') {
    (window as any).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

export const deepCloneTracks = (tracks: TrackGroup[]): TrackGroup[] => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(tracks);
    } catch (_) {}
  }
  try {
    return JSON.parse(JSON.stringify(tracks));
  } catch (_) {
    return tracks.map(t => ({
      ...t,
      patterns: t.patterns.map(p => ({
        ...p,
        activeSteps: [...p.activeSteps],
        volumes: p.volumes ? [...p.volumes] : undefined,
        decays: p.decays ? [...p.decays] : undefined,
        microtimings: p.microtimings ? [...p.microtimings] : undefined,
      }))
    }));
  }
};

export const captureStructureSnapshot = (state: {
  totalMeasures: number;
  measureTimeSigs?: TimeSignature[];
  measureBpms?: number[];
  measureBpmTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  measureVols?: number[];
  measureVolTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  songSections?: SongSection[];
  songMarkers?: SongMarker[];
  vocalTransposeSteps?: number;
}): StructureSnapshot => ({
  totalMeasures: state.totalMeasures,
  measureTimeSigs: state.measureTimeSigs ? [...state.measureTimeSigs] : [],
  measureBpms: state.measureBpms ? [...state.measureBpms] : [],
  measureBpmTransitions: state.measureBpmTransitions ? [...state.measureBpmTransitions] : [],
  measureVols: state.measureVols ? [...state.measureVols] : [],
  measureVolTransitions: state.measureVolTransitions ? [...state.measureVolTransitions] : [],
  songSections: state.songSections ? [...state.songSections] : [],
  songMarkers: state.songMarkers ? [...state.songMarkers] : [],
  vocalTransposeSteps: state.vocalTransposeSteps ?? 0,
});

export const applyStructureSnapshot = (target: Record<string, any>, snap: StructureSnapshot): void => {
  if (snap.totalMeasures !== undefined) target.totalMeasures = snap.totalMeasures;
  target.measureTimeSigs = snap.measureTimeSigs;
  target.measureBpms = snap.measureBpms;
  target.measureBpmTransitions = snap.measureBpmTransitions;
  if (snap.measureVols) target.measureVols = snap.measureVols;
  if (snap.measureVolTransitions) target.measureVolTransitions = snap.measureVolTransitions;
  if (snap.songSections) target.songSections = snap.songSections;
  if (snap.songMarkers) target.songMarkers = snap.songMarkers;
  if (snap.vocalTransposeSteps !== undefined) target.vocalTransposeSteps = snap.vocalTransposeSteps;
};

export const popHistoryState = (
  prev: {
    tracks: TrackGroup[];
    totalMeasures: number;
    tracksHistory: TrackGroup[][];
    tracksRedoHistory: TrackGroup[][];
    songStructureHistory: StructureSnapshot[];
    songStructureRedoHistory: StructureSnapshot[];
    tracksVersion?: number;
    [key: string]: any;
  },
  direction: 'undo' | 'redo'
): Record<string, any> | null => {
  const isUndo = direction === 'undo';
  const sourceTracksHist = isUndo ? [...prev.tracksHistory] : [...prev.tracksRedoHistory];
  const sourceStructHist = isUndo ? [...prev.songStructureHistory] : [...prev.songStructureRedoHistory];
  if (sourceTracksHist.length === 0) return null;

  const poppedTracks = sourceTracksHist.pop();
  const poppedStruct = sourceStructHist.pop();

  const currentTracks = prev.tracks;
  const currentStructure = captureStructureSnapshot(prev);

  const updates: Record<string, any> = {
    tracksHistory: isUndo ? sourceTracksHist : [...prev.tracksHistory, currentTracks],
    songStructureHistory: isUndo ? sourceStructHist : [...prev.songStructureHistory, currentStructure],
    tracksRedoHistory: isUndo ? [...prev.tracksRedoHistory, currentTracks] : sourceTracksHist,
    songStructureRedoHistory: isUndo ? [...prev.songStructureRedoHistory, currentStructure] : sourceStructHist,
    tracksVersion: (prev.tracksVersion || 0) + 1,
  };

  if (poppedTracks) updates.tracks = poppedTracks;
  if (poppedStruct) applyStructureSnapshot(updates, poppedStruct);

  return updates;
};

export const getPendingUndoSnapshot = (): PendingUndoSnapshot | null => pendingUndoSnapshot;
export const setPendingUndoSnapshot = (snap: PendingUndoSnapshot | null): void => { pendingUndoSnapshot = snap; };
export const getIdleUndoId = (): any => idleUndoId;
export const setIdleUndoId = (id: any): void => { idleUndoId = id; };
