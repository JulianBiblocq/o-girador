/**
 * percussionHorizonTypes.ts — Contrats partagés du planificateur d'horizon AudioWorklet (< 45 lignes).
 */

import { InstrumentAudioConfig, StrokeMapping } from '../../../data/audioConfig';
import { GlobalSwing, Track } from '../../../types';
import type { SectionSpatialProfile } from '../../spatial/sectionSpatialAcoustics';

export interface HorizonPackerEngineDeps {
  isTrackRoutedToWorklet(trackId: number | string, instrumentId: string): boolean;
  getTrackSlot(trackId: number | string): number;
  getTrackUnisonDelaySec(trackId: number | string): number;
  getTrackBalancoAdherence(trackId: number | string): number;
  getTrackPartnerRank?(trackId: number | string): number;
  getTrackPitchRatio(trackId: number | string): number;
  getTrackSpatialProfile?(trackId: number | string): SectionSpatialProfile | undefined;
  getSampleId(filePath: string, isLoop?: boolean): number;
  selectRoundRobinFile(instId: string, stroke: StrokeMapping, timeSec: number, trackId: number): string;
  selectRoundRobinFileIndex?(instId: string, stroke: StrokeMapping, timeSec: number, trackId: number): number;
  selectRoundRobinSquadIndices?(instId: string, stroke: StrokeMapping, timeSec: number, count: number, trackId: number): number[];
  strokesMaps: Map<string, Map<string, StrokeMapping>>;
  configMap: Map<string, InstrumentAudioConfig>;
}

export interface HorizonEngineLike extends HorizonPackerEngineDeps {
  readonly workletReady: boolean;
  getIsPlaying(): boolean;
  getCurrentTime(): number;
  getSampleRate(): number;
  syncTracksToWorklet(tracks: Track[], liveBpm?: number): void;
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
