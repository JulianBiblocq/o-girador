/**
 * Types pour le dictionnaire de rythmes papier (< 30 lignes).
 */
import { PaperStepValue } from './paperWorkshop.types';

export interface DictVariation {
  varIndex: number;
  pupitre: string;
  name: string;
  steps: PaperStepValue[];
}

export interface DictItem {
  id: string;
  name: string;
  family: 'bases_paradas' | 'luanda' | 'igarassu' | 'ijexa' | 'aruanda';
  description?: string;
  patterns: Record<string, PaperStepValue[]>;
  variations?: DictVariation[];
}
