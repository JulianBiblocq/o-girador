/**
 * Types d'interface pour la navigation dans le transport (< 35 lignes).
 */

import { AudioEngine } from '../../AudioEngine';

export interface NavigationContext {
  totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> };
  measureCountRef: { current: number };
  sectionIterationRef: { current: number };
  soloLoopCycleRef: { current: number };
  hasFinishedRef: { current: boolean };
  isPlaybackEndingRef: { current: boolean };
  maxTicksRef: { current: number };
  currentStepIndexRef: { current: number };
  isPlayingRef: { current: boolean };
  pendingMeasureRef: { current: number | null };
  pendingIterationRef: { current: number | null };
  activeSequencerVocalsRef: { current: Map<string, any> };
  anticipatedMeasuresRef: { current: Set<string> };
  tickEventDetailRef: { current: any };
  audioEngine: AudioEngine | null;
  setCurrentMeasure: (m: number) => void;
}
