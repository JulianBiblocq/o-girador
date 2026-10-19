/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types unifiés pour le Grand Atelier Papier Cordel (< 100 lignes).
 */

export type PaperTabType = 'sheets' | 'scanner' | 'reserve';

export type BlankSheetType = 'isolated' | 'sections' | 'sequence';

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
  pupitres: PupitreCode[];
  includeVariationLine: boolean; // Al sous-ligne ↳Me/Rp
  sectionName?: string;
  bpm?: number;
}

export type PaperStepValue = string | number | [string, string];

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
}
