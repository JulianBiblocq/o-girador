import { TrackGroup, Language } from '../types';

export interface MestreStudioProps {
  lang: Language;
  onExit: () => void;
  presetFiles?: string[];
  localPresets?: string[];
}

// 1. Config Varal Types
export interface GameSlot {
  id: string; // unique ID for React keys
  source: 'cloud' | 'local' | 'empty';
  cloudExerciseId?: string;
  cloudExerciseName?: string;
  localExerciseData?: any;
  localExerciseName?: string;
}

export interface CordeRewardStudio {
  text: string;
  type: 'image' | 'video' | 'pdf' | 'json' | 'none';
  url: string;
  base64: string;
}

export interface CordeConfig {
  requiredCount: number;
  gameType?: 'quiz' | 'dictee' | 'inspecteur' | 'sablier_mestre' | 'rythme_live' | 'random';
  games: GameSlot[];
  reward: CordeRewardStudio;
  oeuvreToniBraga: string; // Base64 (legacy fallback)
  rewardData: string; // legacy fallback
}

export type TabType = 'varal' | 'quiz' | 'dictee' | 'inspecteur' | 'sablier' | 'rythmelive';

// Static Configuration Constants
export const MIN_RADIUS = 180;
export const MAX_RADIUS = 495;
export const MIDDLE_RADIUS = 337;
export const DEFAULT_BPM = 83;

export const DEFAULT_INSTRUMENTS = [
  { idx: 0, name: 'Alfaia' },
  { idx: 3, name: 'Caixa' },
  { idx: 5, name: 'Gonguê' },
  { idx: 6, name: 'Agbê' },
];
