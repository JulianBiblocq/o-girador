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
  isLoopRegionActiveRef?: { current: boolean };
  loopStartRef?: { current: number | null };
  isPreRollActiveRef?: { current: boolean };
  preRollRemainingMeasuresRef?: { current: number };
  engineTimeoutsRef?: { current: Set<number> };
  hitTriggersRef?: { current: any };
  anchoredMeasureStartSecRef?: { current: number };
  anchoredMeasureIdxRef?: { current: number };
  lastScheduledMeasureRef?: { current: number };
  tracksRef?: { current: any[] };
  soloPatternPlayIdRef?: { current: number | null };
  soloPatternVariationIdRef?: { current: string | null };
  activeSequencerVocalsRef: { current: Map<string, any> };
  anticipatedMeasuresRef: { current: Set<string> };
  tickEventDetailRef: { current: any };
  audioEngine: AudioEngine | null;
  setCurrentMeasure: (m: number) => void;
}
