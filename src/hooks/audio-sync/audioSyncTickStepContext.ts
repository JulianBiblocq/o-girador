
import React from 'react';
import * as Tone from 'tone';
import { AudioEngine } from '../../AudioEngine';

export interface TickStepContext {
  currentStepIndexRef: { current: number }; measureCountRef: { current: number }; totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> }; measureBpmsRef: { current: number[] }; maxTicksRef: { current: number };
  currentMeasureStartTickRef: { current: number }; absoluteTickCountRef: { current: number }; isLoopRegionActiveRef: { current: boolean };
  loopStartRef: { current: number | null }; loopEndRef: { current: number | null }; isLoopingRef: { current: boolean };
  loopModeRef?: { current: 'infinite' | number }; isLoopExitRequestedRef?: { current: boolean }; currentLoopIterationRef?: { current: number };
  isPlaybackEndingRef: { current: boolean }; lastPlayedSignalIdRef: { current: string | null }; isMetroOnRef: { current: boolean };
  metroVolumeRef: { current: number }; metroSoundRef: { current: 'synth' | 'clave' | 'cowbell' }; metroChannelRef: { current: Tone.Channel | null };
  globalSwingRef: { current: any }; tracksRef: { current: any[] }; soloPatternPlayIdRef: { current: number | null };
  soloPatternVariationIdRef: { current: string | null }; soloLoopCycleRef: { current: number }; soloPhraseMeasureRef: { current: number };
  familyMuteSetRef: { current: Set<string> }; flatCompiledScheduleRef: { current: Float64Array | null }; flatArrayPointerRef: { current: number };
  lastCompiledScheduleRef: { current: Float64Array | null }; lastAbsoluteTickRef: { current: number }; mutedVoiceTracksRef: { current: Set<string | number> };
  anticipatedMeasuresRef: { current: Set<string> }; activeSequencerVocalsRef: { current: Map<string, any> }; speedTrainerCurrentBpmRef: { current: number };
  speedTrainerConsolidationLapsDoneRef: { current: number }; anchoredMeasureStartSecRef: React.MutableRefObject<number>;
  anchoredMeasureIdxRef: React.MutableRefObject<number>; sectionIterationRef: { current: number };
  lastScheduledMeasureRef?: { current: number };
  trackInputs: Record<string | number, Tone.Gain>; channels: Record<string | number, Tone.Channel>; busChannels: Record<string | number, Tone.Channel>;
  masterVolumeNode: Tone.Volume | null; audioEngine: AudioEngine | null; handleStop: () => void; setCurrentMeasure: (m: number) => void;
}
