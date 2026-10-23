
import { TrackGroup } from '../../types';
import { StructureSnapshot } from '../helpers/undoHistoryHelpers';

export interface HistorySlice {
  tracksHistory: TrackGroup[][];
  tracksRedoHistory: TrackGroup[][];
  songStructureHistory: StructureSnapshot[];
  songStructureRedoHistory: StructureSnapshot[];

  pushUndoState: (customTracksState?: TrackGroup[]) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  clearHistory: () => void;
}
