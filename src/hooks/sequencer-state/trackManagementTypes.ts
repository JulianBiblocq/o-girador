/**
 * Types d'interface pour la gestion des pistes (< 35 lignes).
 */

import { TrackGroup, TimeSignature, SongMarker } from '../../types';

export interface TrackManagementContext {
  pushUndoState: () => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
  timeSig: TimeSignature;
  setLetras: (v: string) => void;
  setBpm: (v: number) => void;
  setTimeSig: (v: TimeSignature) => void;
  setTotalMeasures: (v: number) => void;
  setMeasureTimeSigs: (v: any) => void;
  setMeasureBpms: (v: any) => void;
  setMeasureBpmTransitions: (v: any) => void;
  setMeasureVols: (v: any) => void;
  setMeasureVolTransitions: (v: any) => void;
  setMeasureSignals: (v: any) => void;
  setSongSections: (v: any) => void;
  setSongMarkers: (v: any) => void;
  setActiveAoVivoTrackId: (v: any) => void;
  setMetadata: (v: any) => void;
}
