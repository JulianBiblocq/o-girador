/**
 * Types unifiés pour le Grand Atelier Papier Cordel (< 100 lignes).
 */

export type PaperTabType = 'sheets' | 'scanner' | 'reserve';

export type BlankSheetType = 'grid32' | 'isolated' | 'sections' | 'sequence' | 'universal' | 'dictionary';

export type GridMode = '4/4' | '2/4' | '3/4' | '12/8' | 'free_portrait' | 'free_landscape';

export type PupitreCode = 'al' | 'cx' | 'gg' | 'ab' | 'mi' | 'tb' | 'td';

export interface PupitreInfo {
  code: PupitreCode;
  nameFr: string;
  namePt: string;
  instId: string;
  symbolMemo: string;
}

export interface BlankSheetOptions {
  sheetType: BlankSheetType;
  gridMode: GridMode;
  pupitres: string[];
  includeVariationLine: boolean; // Al sous-ligne ↳Me/Rp
  grid32Mode?: 'blank' | 'prefill';
  freeLinesCount?: number;
  conductorMeasures?: number;
  conductorTitle?: string;
  hasDoubleSections?: boolean;
  hasToadaLine?: boolean;
  sectionName?: string;
  prefillFamily?: string;
  bpm?: number;
  linkAlfaias?: boolean;
  busCaixas?: boolean;
  busSementes?: boolean;
}

export type PaperStepValue = string | number | [string, string];

export interface DetectedMetric {
  timeSignature: string;
  steps: number;
  beatResolutions: number[];
  isMixed: boolean;
  measuresCount: number;
  description: string;
}

export interface PatternMetricOverride {
  timeSignature?: string;
  steps?: number;
  beatResolutions?: number[];
  bpm?: number;
  isLocked?: boolean;
}

export interface PaperSection {
  name: string;
  measuresCount: number;
  patterns: Partial<Record<PupitreCode, PaperStepValue[]>>;
}

export interface PaperSequenceItem {
  id: string;
  sectionName: string;
  repeatCount: number; // 1 à 8
}

export interface PaperPreset {
  id: string;
  name: string;
  bpm: number;
  timeSig: string;
  totalMeasures: number;
  linkedAlfaias: boolean;
  pupitres: PupitreCode[];
  patterns: Record<string, Partial<Record<PupitreCode, PaperStepValue[]>>>;
  sequenceString: string;
  defaultSequence: string[];
  metricOverrides?: Record<string, PatternMetricOverride>;
}
