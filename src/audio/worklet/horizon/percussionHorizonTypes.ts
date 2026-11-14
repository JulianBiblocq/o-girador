/**
 * percussionHorizonTypes.ts — Contrats partagés du planificateur d'horizon AudioWorklet (< 45 lignes).
 */

import { InstrumentAudioConfig, StrokeMapping } from '../../../data/audioConfig';
import { GlobalSwing, Track } from '../../../types';

export interface HorizonPackerEngineDeps {
  isTrackRoutedToWorklet(trackId: number | string, instrumentId: string): boolean;
  getTrackSlot(trackId: number | string): number;
  getTrackUnisonDelaySec(trackId: number | string): number;
  getTrackBalancoAdherence(trackId: number | string): number;
  getTrackPitchRatio(trackId: number | string): number;
  getSampleId(filePath: string): number;
  selectRoundRobinFile(instId: string, stroke: StrokeMapping, timeSec: number, trackId: number): string;
  strokesMaps: Map<string, Map<string, StrokeMapping>>;
  configMap: Map<string, InstrumentAudioConfig>;
}

export interface HorizonEngineLike extends HorizonPackerEngineDeps {
  readonly workletReady: boolean;
  getIsPlaying(): boolean;
  getCurrentTime(): number;
  getSampleRate(): number;
  syncTracksToWorklet(tracks: Track[]): void;
  pushWorkletEvents(eventsData: Float64Array, eventCount: number): void;
  purgeWorkletFromFrame(fromFrame: number, measureSeqId?: number): void;
  purgeRoundRobinFromTime(fromTimeSec: number): void;
}

export interface HorizonPusherContext {
  tracksRef: { current: Track[] };
  totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> };
  measureBpmsRef: { current: number[] };
  globalSwingRef: { current: GlobalSwing };
  flatCompiledScheduleRef: { current: Float64Array | null };
  soloPatternPlayIdRef: { current: number | null };
  soloPatternVariationIdRef: { current: string | null };
  pendingMeasureRef?: { current: number | null };
  isLoopRegionActiveRef: { current: boolean };
  loopStartRef: { current: number | null };
  loopEndRef: { current: number | null };
  isLoopExitRequestedRef?: { current: boolean };
  isLoopingRef: { current: boolean };
  loopModeRef?: { current: number | 'infinite' };
  currentLoopIterationRef?: { current: number };
  speedTrainerCurrentBpmRef?: { current: number };
  activeVariationsRef?: { current: Record<number, any> };
  engine: HorizonEngineLike | null;
  measureBpmTransitions?: Record<number, string>;
  defaultBpm?: number;
}
