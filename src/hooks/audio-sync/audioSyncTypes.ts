import React from 'react';
import { TrackGroup, TimeSignature, SongSection } from '../../types';
import { tickSubscribers, subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';

export { tickSubscribers, subscribeToTick, unsubscribeFromTick };
export type TickCallbackDetail = any;

export interface ScheduledNote {
  time: number;
  instrumentId: string;
  velocity: number;
  decayMultiplier?: number;
}

export interface UseAudioSyncProps {
  tracksRef: React.MutableRefObject<TrackGroup[]>;
  totalMeasures: number;
  totalMeasuresRef: React.MutableRefObject<number>;
  measureTimeSigs: TimeSignature[];
  measureTimeSigsRef: React.MutableRefObject<TimeSignature[]>;
  measureBpms: number[];
  measureBpmsRef: React.MutableRefObject<number[]>;
  measureBpmTransitionsRef: React.MutableRefObject<('immediate' | 'ramp' | 'bezier')[]>;
  measureVolsRef: React.MutableRefObject<number[]>;
  measureVolTransitionsRef: React.MutableRefObject<('immediate' | 'ramp' | 'bezier')[]>;
  measureSignalsRef: React.MutableRefObject<(string | null)[]>;
  loopStartRef: React.MutableRefObject<number | null>;
  loopEndRef: React.MutableRefObject<number | null>;
  isLoopRegionActiveRef: React.MutableRefObject<boolean>;
  loopModeRef: React.MutableRefObject<'infinite' | number>;
  isLoopExitRequestedRef: React.MutableRefObject<boolean>;
  isLoopingRef: React.MutableRefObject<boolean>;
  songSectionsRef: React.MutableRefObject<SongSection[]>;
  activeVariationsRef: React.MutableRefObject<Record<number, (string | number)[]>>;
  isPlayingRef: React.MutableRefObject<boolean>;
  currentStepIndexRef: React.MutableRefObject<number>;
  measureCountRef: React.MutableRefObject<number>;
  lastPlayedSignalIdRef: React.MutableRefObject<string | null>;
  setIsPlayingRef: React.MutableRefObject<(val: boolean) => void>;
  bpm: number;
  isLeftHanded: boolean;
  activeKeyboardInstrumentId: string | null;
  masterVol: number;
  masterEQ: { low: number; mid: number; high: number };
  masterCompressor: { threshold: number; ratio: number };
  masterReverbVol: number;
  reverbDecay: number;
}
