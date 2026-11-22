import type { Pattern, CatalogVisibility } from './pattern.types';
import type { TimeSignature, AlfaiaEquipmentMetadata } from './common.types';

export interface CatalogItem {
  file: string;
  name: string;
}

export interface SongSection {
  id: string;
  name: string;
  startMeasure: number;
  endMeasure: number;
  color?: string;
  repeatCount?: number;
  level?: number;
}

export interface SongMarker {
  id: string;
  name: string;
  measure: number;
  color?: string;
}

export interface SavedSectionChildMeta {
  name: string;
  relativeStart: number;
  relativeEnd: number;
  color?: string;
  repeatCount?: number;
  level?: number;
}

export interface SavedSectionTrack {
  id?: number;
  instrumentId?: string;
  occurrenceIndex?: number;
  instrumentIdx: number;
  customName?: string;
  tuning?: number;
  isMute: boolean;
  isSolo: boolean;
  volumeVal: number;
  reverbVal?: number;
  panVal?: number;
  pan?: number;
  swingIntensity?: number;
  balancoPresetId?: string;
  balancoAmount?: number;
  fxSends?: {
    reverb: number;
    distortion: number;
  };
  explicitSilenceMeasures?: boolean[];
  patterns: Pattern[];
}

export interface SavedSectionData {
  schemaVersion?: 2;
  numMeasures: number;
  timeSigs: TimeSignature[];
  bpms?: number[];
  bpmTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  vols: number[];
  volTransitions: ('immediate' | 'ramp' | 'bezier')[];
  signals: (string | null)[];
  tracks: SavedSectionTrack[];
  alfaiaEquipment?: AlfaiaEquipmentMetadata | null;
  sectionName?: string;
  sectionColor?: string;
  repeatCount?: number;
  level?: number;
  childSections?: SavedSectionChildMeta[];
}

export type SectionImportMode = 'insert' | 'overwrite';

export interface SectionImportOptions {
  mode: SectionImportMode;
  createMissingTracks: boolean;
  sectionName?: string;
  sectionColor?: string;
  repeatCount?: number;
  level?: number;
}

export interface CloudSection {
  id: string;
  name: string;
  ownerId: string;
  visibility: CatalogVisibility;
  mestreId?: string;
  createdAt: number;
  data: string;
  audioUrl?: string | null;
}

export interface CloudPreset {
  id: string;
  name: string;
  data: string;
  ownerId: string;
  visibility: CatalogVisibility;
  targetUserId?: string;
  mestreId?: string | null;
  groupId?: string | null;
  createdAt: number;
  isFavorite?: boolean;
  audioUrl?: string | null;
  isDraft?: boolean;
  isShowcase?: boolean;
  updatedAt?: number | null;
  alfaiaEquipment?: AlfaiaEquipmentMetadata | null;
}
