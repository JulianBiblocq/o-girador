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
  startMeasure: number; // 0-based
  endMeasure: number;   // 0-based
  repeatCount: number;
  label: string;        // ex: "M.22" ou "M.1–4"
  multiplierLabel: string | null; // ex: "×4" ou null
  sectionName: string | null;     // ex: "LUANDA", "CONVENÇÃO 2"
  timeSig: string;      // ex: "4/4", "2/4", "3/4"
  stepCount: number;    // ex: 16, 8, 12
  stepsByTrackId: Record<number, any[]>;
}

