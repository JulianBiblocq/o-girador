import { InstrumentConfig, TrackGroup } from '../../../types';

export type RodaSheetSelectionMode = 'auto' | 'custom';
export type RodaSheetDensity = 8 | 12;

export interface RodaSheetTrackInfo {
  track: TrackGroup;
  inst: InstrumentConfig;
  displayIndex: number;
  displayName: string;
  color: string;
}

export interface RodaSheetMeasureItem {
  key: string;
  startMeasure: number;
  endMeasure: number;
  measureIndices: number[];
  repeatCount: number;
  label: string;
  multiplierLabel: string | null;
  sectionName: string | null;
  timeSig: string;
  stepCount: number;
  stepsByTrackId: Record<number, any[]>;
  stepAnglesByTrackId?: Record<number, number[]>;
}
