/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as Tone from 'tone';
import { AudioEngine, ActiveInstrumentData } from '../AudioEngine';
import { InputManager } from '../InputManager';
import { TrackGroup, TimeSignature, HitTrigger, HitTriggerPool, SongSection, GlobalSwing } from '../types';

// Pub/Sub system for high-performance visual tick updates
export const tickSubscribers = new Set<(detail: any) => void>();

export function subscribeToTick(callback: (detail: any) => void): void {
  tickSubscribers.add(callback);
}

export function unsubscribeFromTick(callback: (detail: any) => void): void {
  tickSubscribers.delete(callback);
}
import { useSequencerStore, getEffectiveMuteState } from '../stores/useSequencerStore';
import { instrumentsConfig, getMaxTicks, getMarkers } from '../data';
import { loadTone } from '../ToneLoader';
import { useAudioStore } from '../stores/useAudioStore';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { vocalEngineService, workerSetTimeout } from '../audio/vocalEngineService';

interface ScheduledNote {
  time: number;
  instrumentId: string;
  velocity: number;
  decayMultiplier?: number;
}

function getNormalizedStroke(instId: string, rawStroke: string): string {
  const targetKey = rawStroke.trim();
  if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(instId)) {
    if (targetKey === 't' || targetKey === 'T') return 'B';
    if (targetKey === 'C') return 'c';
  } else if (instId === 'agbe' || instId === 'gongue') {
    if (targetKey === 't') return 'B';
  }
  return targetKey;
}

export function getActiveStrokesForTrack(t: any, allTracks?: any[]): string[] {
  const inst = instrumentsConfig[t.instrumentIdx];
  if (!inst) return [];
  
  const strokes = new Set<string>();
  
  let patternsToScan = t.patterns;
  if (t.linkedToTrackId && !t.isLinkFolder && allTracks) {
    const parentBus = allTracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
    if (parentBus) {
      patternsToScan = parentBus.patterns;
    }
  }

  if (patternsToScan) {
    patternsToScan.forEach((ptn: any) => {
      const isAssigned = ptn.measureAssignments && ptn.measureAssignments.includes(true);
      if (isAssigned) {
        if (inst.type !== 'voice') {
          if (ptn.activeSteps) {
            ptn.activeSteps.forEach((stepVal: any) => {
              if (stepVal !== undefined && stepVal !== null && stepVal !== 0 && stepVal !== '0') {
                const str = String(stepVal).trim();
                if (str !== '') {
                  strokes.add(getNormalizedStroke(inst.id, str));
                }
              }
            });
          }
          if (ptn.variations) {
            ptn.variations.forEach((varPtn: any) => {
              if (varPtn.steps) {
                varPtn.steps.forEach((stepVal: any) => {
                  if (stepVal !== undefined && stepVal !== null && stepVal !== 0 && stepVal !== '0') {
                    const str = String(stepVal).trim();
                    if (str !== '') {
                      strokes.add(getNormalizedStroke(inst.id, str));
                    }
                  }
                });
              }
            });
          }
        } else {
          if (ptn.notes) {
            ptn.notes.forEach((note: any) => {
              if (note && note.trim() !== '') {
                strokes.add(note.trim());
              }
            });
          }
        }
      }
    });
  }

  // Si c'est une piste esclave liée, on doit aussi chercher les variations actives dans les overrides du parent
  const isSlave = t.linkedToTrackId && !t.isLinkFolder && !t.isLinkMaster;
  if (isSlave && allTracks) {
    const parentBus = allTracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
    if (parentBus) {
      const overrides = t.patternOverrides || {};
      Object.keys(overrides).forEach((mIdxKey) => {
        const patternId = overrides[mIdxKey];
        if (patternId !== null && patternId !== undefined) {
          const childPattern = parentBus.patterns?.find((p: any) => p.id === patternId);
          if (childPattern && childPattern.activeSteps) {
            childPattern.activeSteps.forEach((stepVal: any) => {
              if (stepVal !== undefined && stepVal !== null && stepVal !== 0 && stepVal !== '0') {
                const str = String(stepVal).trim();
                if (str !== '') {
                  strokes.add(getNormalizedStroke(inst.id, str));
                }
              }
            });
          }
        }
      });
    }
  }

  // Inclure les coups forcés via l'Atelier (forcedStrokes)
  const forcedStrokes = useSequencerSettingsStore.getState().forcedStrokes || {};
  if (inst && inst.colors) {
    Object.keys(inst.colors).forEach((stroke) => {
      if (stroke !== 'text' && forcedStrokes[`${t.id}:${stroke}`] === true) {
        strokes.add(getNormalizedStroke(inst.id, stroke));
      }
    });
  }

  return Array.from(strokes).sort();
}

// Module scope audio engines and nodes to avoid duplicate instantiations on React re-renders
import {
  masterVolumeNode,
  masterEQNode,
  masterCompressorNode,
  masterSoftClipperNode,
  masterMeterNode,
  masterLeftMeterNode,
  masterRightMeterNode,
  masterReverbVolumeNode,
  reverbNode,
  distortionNode,
  masterDistortionVolumeNode,
  metroChannel,
  channels,
  meters,
  reverbSends,
  distortionSends,
  initMasterEffectsChain,
  initInstrumentNodes,
  handleReverbEcoToggle,
  ensureReverbConnected,
  getDeferredReverbActivation,
  setDeferredReverbActivation,
  busChannels,
  busMeters,
  reverbBusReceive,
  distortionBusReceive,
  trackInputs,
  syncTrackInsertChain
} from '../audio/effectsChain';

export {
  masterVolumeNode,
  masterEQNode,
  masterCompressorNode,
  masterSoftClipperNode,
  masterMeterNode,
  masterLeftMeterNode,
  masterRightMeterNode,
  masterReverbVolumeNode,
  reverbNode,
  distortionNode,
  metroChannel,
  channels,
  meters,
  reverbSends,
  distortionSends,
  busChannels,
  busMeters
};

export const voiceSynths: { [id: string]: any } = {};
export let audioEngine: AudioEngine | null = null;
export let inputManager: InputManager | null = null;

import {
  activeNativeOscillators,
  playNativeMetroClick,
  playNativeVoiceSynth,
  stopAllNativeOscillators
} from '../audio/nativeSynths';

export {
  activeNativeOscillators,
  playNativeMetroClick,
  playNativeVoiceSynth,
  stopAllNativeOscillators
};

const noteToFrequency = (noteStr: string): number => {
  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  
  const match = noteStr.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 261.63; // Default to C4 if invalid
  
  const pitch = match[1];
  const octave = parseInt(match[2], 10);
  
  const semitoneIndex = noteMap[pitch];
  if (semitoneIndex === undefined) return 261.63;
  
  const semitonesFromC4 = semitoneIndex + (octave - 4) * 12;
  const semitonesFromA4 = semitonesFromC4 - 9;
  
  return 440 * Math.pow(2, semitonesFromA4 / 12);
};

const getVoiceNoteStepsFromDecay = (decay: number): number => {
  if (decay <= 10) return 1;
  if (decay <= 20) return 2;
  if (decay <= 30) return 3;
  if (decay <= 40) return 4;
  if (decay <= 50) return 5;
  if (decay <= 60) return 6;
  if (decay <= 70) return 7;
  if (decay <= 80) return 8;
  if (decay <= 90) return 12;
  return 16;
};

// Performance caches and pools
const RANDOM_POOL_SIZE = 1000;
const randomPool = Array.from({ length: RANDOM_POOL_SIZE }, () => Math.random());
let randomPoolIdx = 0;

function nextRandom(): number {
  const val = randomPool[randomPoolIdx];
  randomPoolIdx = (randomPoolIdx + 1) % RANDOM_POOL_SIZE;
  return val;
}

const markersCache = new Map<string, number[]>();
function getCachedMarkers(timeSig: string, ticks: number): number[] {
  const key = `${timeSig}_${ticks}`;
  if (!markersCache.has(key)) {
    markersCache.set(key, getMarkers(timeSig as any, ticks));
  }
  return markersCache.get(key)!;
}

function getMeasureStartTick(mIdx: number, measureTimeSigs: string[]): number {
  let ticks = 0;
  for (let i = 0; i < mIdx; i++) {
    const timeSig = measureTimeSigs[i] || '4/4';
    ticks += getMaxTicks(timeSig as TimeSignature);
  }
  return ticks;
}

const percentToDb = (percent: number): number => {
  if (percent <= 0) return -Infinity;
  const normalized = percent / 100;
  return 40 * Math.log10(normalized);
};



const instrumentIds = ['caixa', 'tarol', 'marcante', 'meiao', 'repique', 'gongue', 'agbe', 'apito'];

interface UseAudioSyncProps {
  tracksRef: React.MutableRefObject<TrackGroup[]>;
  totalMeasures: number;
  totalMeasuresRef: React.MutableRefObject<number>;
  measureTimeSigs: TimeSignature[];
  measureTimeSigsRef: React.MutableRefObject<TimeSignature[]>;
  measureBpms: number[];
  measureBpmsRef: React.MutableRefObject<number[]>;
  measureBpmTransitionsRef: React.MutableRefObject<('immediate' | 'ramp')[]>;
  measureVolsRef: React.MutableRefObject<number[]>;
  measureVolTransitionsRef: React.MutableRefObject<('immediate' | 'ramp')[]>;
  measureSignalsRef: React.MutableRefObject<(string | null)[]>;
  loopStartRef: React.MutableRefObject<number | null>;
  loopEndRef: React.MutableRefObject<number | null>;
  isLoopRegionActiveRef: React.MutableRefObject<boolean>;
  isLoopingRef: React.MutableRefObject<boolean>;
  songSectionsRef: React.MutableRefObject<SongSection[]>;
  activeVariationsRef: React.MutableRefObject<Record<number, (string | number)[]>>;

  // Shared refs for circular dependency resolution
  isPlayingRef: React.MutableRefObject<boolean>;
  currentStepIndexRef: React.MutableRefObject<number>;
  measureCountRef: React.MutableRefObject<number>;
  lastPlayedSignalIdRef: React.MutableRefObject<string | null>;
  setIsPlayingRef: React.MutableRefObject<(val: boolean) => void>;

  // Config parameters to sync
  bpm: number;
  isLeftHanded: boolean;
  activeKeyboardInstrumentId: string | null;
  masterVol: number;
  masterEQ: { low: number; mid: number; high: number };
  masterCompressor: { threshold: number; ratio: number };
  masterReverbVol: number;
  reverbDecay: number;
}

const syncMasterReverbBypass = (isMuted: boolean, returnVolume: number) => {
  if (!reverbBusReceive || !reverbNode) return;
  const shouldBypass = isMuted || returnVolume === 0;
  try {
    reverbBusReceive.disconnect(reverbNode);
  } catch (_) {}
  if (!shouldBypass) {
    reverbBusReceive.connect(reverbNode);
  }
};

const syncMasterDistortionBypass = (isMuted: boolean, returnVolume: number) => {
  if (!distortionBusReceive || !distortionNode) return;
  const shouldBypass = isMuted || returnVolume === 0;
  try {
    distortionBusReceive.disconnect(distortionNode);
  } catch (_) {}
  if (!shouldBypass) {
    distortionBusReceive.connect(distortionNode);
  }
};

export function useAudioSync({
  tracksRef,
  totalMeasures,
  totalMeasuresRef,
  measureTimeSigs,
  measureTimeSigsRef,
  measureBpms,
  measureBpmsRef,
  measureBpmTransitionsRef,
  measureVolsRef,
  measureVolTransitionsRef,
  measureSignalsRef,
  loopStartRef,
  loopEndRef,
  isLoopRegionActiveRef,
  isLoopingRef,
  songSectionsRef,
  activeVariationsRef,

  isPlayingRef,
  currentStepIndexRef,
  measureCountRef,
  lastPlayedSignalIdRef,
  setIsPlayingRef,

  bpm,
  isLeftHanded,
  activeKeyboardInstrumentId,
  masterVol,
  masterEQ,
  masterCompressor,
  masterReverbVol,
  reverbDecay
}: UseAudioSyncProps) {
  const isAudioUnlocked = useAudioStore((state) => state.isAudioUnlocked);
  const tracks = useSequencerStore((state) => state.tracks);

  // 🛡️ FIX (Audit): Rapatrie instanciation à l'intérieur du hook React via des useRef
  const tickEventDetailRef = useRef({
    step: 0,
    measure: 0,
    maxTicks: 96,
    ratio: 0,
    visualStep16: 0,
    visualStep12: 0,
    time: 0,
    iteration: 1
  });
  const isAudioInitializedRef = useRef(false);
  const onTickRef = useRef<(time: number) => void>(() => {});
  const getTickDurationRef = useRef<() => number>(() => 0.25);
  const getTicksPerMeasureRef = useRef<(idx: number) => number>(() => 96);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const compilerWorkerRef = useRef<Worker | null>(null);
  const isRecordingRef = useRef(false);
  const hasTriggeredPunchInRef = useRef(false);
  const hasTriggeredAutoStopRef = useRef(false);
  // Stable reference to the non-reactive store action to avoid Zustand state subscriptions
  const setCurrentMeasure = useRef(useSequencerStore.getState().setCurrentMeasure).current;
  const setCurrentExpandedMeasureIdx = useRef(useSequencerStore.getState().setCurrentExpandedMeasureIdx).current;

  // Refs to hold totalMeasures and measureTimeSigs to avoid hook dependency triggers
  const totalMeasuresRefInternal = useRef(useSequencerStore.getState().totalMeasures);
  const measureTimeSigsRefInternal = useRef(useSequencerStore.getState().measureTimeSigs);

  // Background subscriber to keep refs in sync with store
  useEffect(() => {
    const unsub = useSequencerStore.subscribe((state) => {
      totalMeasuresRefInternal.current = state.totalMeasures;
      measureTimeSigsRefInternal.current = state.measureTimeSigs;
    });
    return unsub;
  }, []);

  const sectionIterationRef = useRef<number>(1);
  const lastPlayedPatternRef = useRef<Record<number, number>>({});
  const setSoloPatternPlayId = useTransportStore.getState().setSoloPatternPlayId;
  const setSoloPatternVariationId = useTransportStore.getState().setSoloPatternVariationId;

  // Scheduling loop safety refs
  const maxTicksRef = useRef<number>(96);
  const isMetroOnRef = useRef<boolean>(false);
  const metroVolumeRef = useRef<number>(80);
  const metroSoundRef = useRef<string>('synth');
  const globalSwingRef = useRef<GlobalSwing>({ mode: 'maracatu', customOffsets: [0, 8, -29, -58], swingIntensity: 100 });
  const soloPatternPlayIdRef = useRef<number | null>(null);
  const soloPatternVariationIdRef = useRef<string | null>(null);
  const pendingMeasureRef = useRef<number | null>(null);
  const pendingIterationRef = useRef<number | null>(null);

  const hitTriggersRef = useRef<HitTriggerPool>(new HitTriggerPool());
  const engineTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const activeSequencerVocalsRef = useRef<Map<number, { stop: () => void }>>(new Map());
  const lastElapsedSecRef = useRef<number>(0);
  // We still keep tickScheduleRef for rendering static partition / export / pre-compilation
  const tickScheduleRef = useRef<Map<number, Map<number, ScheduledNote[]>>>(new Map());

  // FLAT SONG SCHEDULE REFERENCES
  const flatCompiledScheduleRef = useRef<Float32Array | null>(null);
  const lastCompiledScheduleRef = useRef<Float32Array | null>(null);
  const absoluteTickCountRef = useRef<number>(0);
  const flatArrayPointerRef = useRef<number>(0);
  const lastAbsoluteTickRef = useRef<number>(-1);
  const currentMeasureStartTickRef = useRef<number>(0);
  const lastActiveInstrumentIdsRef = useRef<string>('');

  // Subscribe to useTransportStore to keep refs and metroChannel in sync non-reactively
  useEffect(() => {
    const syncTransport = (state: ReturnType<typeof useTransportStore.getState>) => {
      isMetroOnRef.current = state.isMetroOn;
      globalSwingRef.current = state.globalSwing;
      metroVolumeRef.current = state.metroVolume;
      metroSoundRef.current = state.metroSound;
      soloPatternPlayIdRef.current = state.soloPatternPlayId;
      soloPatternVariationIdRef.current = state.soloPatternVariationId;
      
      if (metroChannel) {
        const gain = Math.max(0.00001, state.metroVolume / 100);
        const db = state.metroVolume === 0 ? -Infinity : Tone.gainToDb(gain);

        const now = Tone.context.currentTime;
        metroChannel.volume.setValueAtTime(db, now);

        metroChannel.mute = !state.isMetroOn;
      }
    };

    // Initial sync
    syncTransport(useTransportStore.getState());

    // Subscribe to store changes
    const unsub = useTransportStore.subscribe((state) => {
      syncTransport(state);
    });

    return unsub;
  }, []);

  // Update dynamic callback refs on every render to ensure the AudioEngine loop uses fresh closures
  getTickDurationRef.current = () => {
    const currentMeasureIdx = measureCountRef.current % (totalMeasuresRef.current || 1);
    const rawBpm = measureBpmsRef.current[currentMeasureIdx];
    const targetBpm = isNaN(rawBpm) || rawBpm <= 0 ? 100 : rawBpm;
    return 2.5 / targetBpm;
  };
  getTicksPerMeasureRef.current = (measureIdx) => {
    const timeSig = measureTimeSigsRef.current[measureIdx % (totalMeasuresRef.current || 1)] || '4/4';
    return getMaxTicks(timeSig);
  };

  // Local values sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    setIsPlayingRef.current = setIsPlaying;
  });

  // Sync InputManager configurations
  useEffect(() => {
    if (inputManager) {
      inputManager.setLeftHanded(isLeftHanded);
    }
  }, [isLeftHanded]);

  useEffect(() => {
    if (inputManager) {
      inputManager.setActiveInstrument(activeKeyboardInstrumentId);
    }
  }, [activeKeyboardInstrumentId]);

  // Sync Master Volume node (with automatic Gain Staging reduction in Eco Mode)
  useEffect(() => {
    const applyVolume = (isEco: boolean) => {
      if (masterVolumeNode) {
        const baseGain = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
        const multiplier = isEco ? Tone.dbToGain(-8) : 1.0;
        masterVolumeNode.gain.setValueAtTime(
          baseGain * multiplier,
          Tone.context.currentTime
        );
      }
    };

    applyVolume(useSequencerStore.getState().isEcoMode);

    const unsubscribe = useSequencerStore.subscribe((state) => {
      applyVolume(state.isEcoMode);
    });

    return () => unsubscribe();
  }, [masterVol]);

  // Sync Master EQ with Smart Bypass
  useEffect(() => {
    if (masterEQNode && masterVolumeNode && masterCompressorNode) {
      masterEQNode.low.value = masterEQ.low;
      masterEQNode.mid.value = masterEQ.mid;
      masterEQNode.high.value = masterEQ.high;

      const isFlat = masterEQ.low === 0 && masterEQ.mid === 0 && masterEQ.high === 0;

      try {
        masterVolumeNode.disconnect(masterEQNode);
      } catch (_) {}
      try {
        masterVolumeNode.disconnect(masterCompressorNode);
      } catch (_) {}
      try {
        masterEQNode.disconnect(masterCompressorNode);
      } catch (_) {}

      if (isFlat) {
        masterVolumeNode.connect(masterCompressorNode);
      } else {
        masterVolumeNode.connect(masterEQNode);
        masterEQNode.connect(masterCompressorNode);
      }
    }
  }, [masterEQ]);

  // Sync Master Compressor
  useEffect(() => {
    const applyCompressor = (isEco: boolean) => {
      if (masterCompressorNode) {
        const threshold = isEco ? 0 : Math.max(-100, Math.min(0, masterCompressor.threshold));
        const ratio = isEco ? 1 : Math.max(1, masterCompressor.ratio);
        masterCompressorNode.threshold.value = threshold;
        masterCompressorNode.ratio.value = ratio;
      }
    };
    
    applyCompressor(useSequencerStore.getState().isEcoMode);

    const unsubscribe = useSequencerStore.subscribe((state) => {
      applyCompressor(state.isEcoMode);
    });

    return () => unsubscribe();
  }, [masterCompressor]);

  // Sync Reverb parameters and Master Reverb Volume
  useEffect(() => {
    if (masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol), 0.05);
    }

    const applyReverb = () => {
      if (reverbNode) {
        if (reverbNode.decay !== reverbDecay) {
          reverbNode.decay = reverbDecay;
        }
      }
    };

    applyReverb();
    // Note: Reverb SEND levels (including eco mode bypass) are completely handled 
    // by the main volume/pan/fx synchronization useEffect above. 
    // We strictly avoid subscribing to `state.tracks` here to prevent the reverb 
    // from regenerating (and abruptly cutting its tail) when the user adjusts a track fader!
  }, [reverbDecay, masterReverbVol]);

  // Sync Reverb Sends, EQ configurations and Connection in response to Eco Mode / ecoConfig changes
  useEffect(() => {
    let lastDisableFx = useSequencerStore.getState().ecoConfig?.disableFx ?? useSequencerStore.getState().isEcoMode;
    let lastDisableEq = useSequencerStore.getState().ecoConfig?.disableEq ?? useSequencerStore.getState().isEcoMode;

    const applyEcoReverbSendsAndToggle = (disableFx: boolean, tracks: any[]) => {
      handleReverbEcoToggle(disableFx, isPlayingRef.current);

      tracks.forEach((t) => {
        if (reverbSends[t.id]) {
          try {
            const reverbPct = t.fxSends?.reverb ?? t.reverbVal ?? 0;
            const reverbDb = percentToDb(disableFx ? 0 : reverbPct);
            reverbSends[t.id].gain.value = reverbDb;
          } catch (err) {
            console.warn(`Could not set reverb send level for track ${t.id} in eco mode update:`, err);
          }
        }
      });
    };

    const applyEqSync = (tracks: any[]) => {
      tracks.forEach((t) => {
        try {
          syncTrackInsertChain(t.id, t);
        } catch (err) {
          console.warn(`Could not sync track insert chain for track ${t.id}:`, err);
        }
      });
    };

    const initialStore = useSequencerStore.getState();
    applyEcoReverbSendsAndToggle(lastDisableFx, initialStore.tracks);
    applyEqSync(initialStore.tracks);

    const unsubscribe = useSequencerStore.subscribe((state) => {
      const nextDisableFx = state.ecoConfig?.disableFx ?? state.isEcoMode;
      const nextDisableEq = state.ecoConfig?.disableEq ?? state.isEcoMode;

      if (nextDisableFx !== lastDisableFx) {
        lastDisableFx = nextDisableFx;
        applyEcoReverbSendsAndToggle(nextDisableFx, state.tracks);
      }
      if (nextDisableEq !== lastDisableEq) {
        lastDisableEq = nextDisableEq;
        applyEqSync(state.tracks);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Transport BPM
  useEffect(() => {
    if (!isAudioUnlocked) return;
    Tone.Transport.bpm.value = bpm;
  }, [bpm, isAudioUnlocked]);

  // Reset Destination Volume to neutral and process deferred reverb when stopped
  useEffect(() => {
    if (!isAudioUnlocked) return;
    if (!isPlaying) {
      try {
        Tone.Destination.volume.setValueAtTime(0, Tone.context.currentTime);
      } catch (err) {}

      if (getDeferredReverbActivation()) {
        ensureReverbConnected();
        setDeferredReverbActivation(false);
      }
    }
  }, [isPlaying, isAudioUnlocked]);

  // Instancier le Web Worker de compilation une seule fois au montage du composant
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/audioCompiler.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      if (!e.data.success) {
        console.error("❌ Worker compilation failed:", e.data.error);
        setIsCompiling(false);
        return;
      }

      if (e.data.action === 'compileSong') {
        setIsCompiling(false);
        flatCompiledScheduleRef.current = e.data.data;
      }
    };

    compilerWorkerRef.current = worker;

    return () => {
      if (compilerWorkerRef.current) {
        compilerWorkerRef.current.terminate();
        compilerWorkerRef.current = null;
        setIsCompiling(false);
      }
    };
  }, []);

  // Recompile tick schedule when state changes (Async Worker)
  useEffect(() => {
    let lastSoloPatternPlayId = useTransportStore.getState().soloPatternPlayId;

    const compile = (stateTracks: any, totalM: number, mTimeSigs: any, soloId: number | null) => {
      const worker = compilerWorkerRef.current;
      if (!worker) return;

      setIsCompiling(true);

      worker.postMessage({
        action: 'compileSong',
        tracks: stateTracks,
        totalMeasures: totalM,
        measureTimeSigs: mTimeSigs,
        instConfig: instrumentsConfig,
        soloPatternPlayId: soloId
      });
    };

    // Initial compile
    const initialState = useSequencerStore.getState();
    compile(initialState.tracks, initialState.totalMeasures, initialState.measureTimeSigs, lastSoloPatternPlayId);

    // Initial Active Instruments Cache Population (Stroke-level lazy loading)
    const initialActiveInstruments = initialState.tracks.map((t: any) => {
      const inst = instrumentsConfig[t.instrumentIdx];
      if (!inst) return null;
      
      return {
        id: inst.id,
        activeStrokes: getActiveStrokesForTrack(t, initialState.tracks)
      };
    }).filter(Boolean) as ActiveInstrumentData[];

    initialActiveInstruments.sort((a, b) => a.id.localeCompare(b.id));
    lastActiveInstrumentIdsRef.current = JSON.stringify(initialActiveInstruments);

    // Subscribe to Zustand for store changes (using tracksVersion)
    const unsubSeq = useSequencerStore.subscribe((state, prevState) => {
      if (state.tracksVersion !== prevState.tracksVersion) {
        compile(state.tracks, state.totalMeasures, state.measureTimeSigs, lastSoloPatternPlayId);
      }
      
      if (audioEngine && state.tracks !== prevState.tracks) {
        // Optimisation : Extraction des instruments actifs et de leurs frappes (strokes) uniques
        const activeInstruments = state.tracks.map((t: any) => {
          const inst = instrumentsConfig[t.instrumentIdx];
          if (!inst) return null;
          
          return {
            id: inst.id,
            activeStrokes: getActiveStrokesForTrack(t, state.tracks)
          };
        }).filter(Boolean) as ActiveInstrumentData[];

        activeInstruments.sort((a, b) => a.id.localeCompare(b.id));
        const activeInstrumentsString = JSON.stringify(activeInstruments);
        
        if (activeInstrumentsString !== lastActiveInstrumentIdsRef.current) {
          lastActiveInstrumentIdsRef.current = activeInstrumentsString;
          audioEngine.syncActiveInstrumentsMemory(activeInstruments)
            .catch(e => {});
        }
      }
    });

    // Subscribe to useTransportStore for soloPatternPlayId changes
    const unsubTransport = useTransportStore.subscribe((state) => {
      if (state.soloPatternPlayId !== lastSoloPatternPlayId) {
        lastSoloPatternPlayId = state.soloPatternPlayId;
        const seqState = useSequencerStore.getState();
        compile(seqState.tracks, seqState.totalMeasures, seqState.measureTimeSigs, lastSoloPatternPlayId);
      }
    });

    // Subscribe to useSequencerSettingsStore for forcedStrokes changes
    const unsubSettings = useSequencerSettingsStore.subscribe((state, prevState) => {
      if (audioEngine && state.forcedStrokes !== prevState.forcedStrokes) {
        const seqState = useSequencerStore.getState();
        const activeInstruments = seqState.tracks.map((t: any) => {
          const inst = instrumentsConfig[t.instrumentIdx];
          if (!inst) return null;
          
          return {
            id: inst.id,
            activeStrokes: getActiveStrokesForTrack(t, seqState.tracks)
          };
        }).filter(Boolean) as ActiveInstrumentData[];

        activeInstruments.sort((a, b) => a.id.localeCompare(b.id));
        const activeInstrumentsString = JSON.stringify(activeInstruments);
        
        if (activeInstrumentsString !== lastActiveInstrumentIdsRef.current) {
          lastActiveInstrumentIdsRef.current = activeInstrumentsString;
          audioEngine.syncActiveInstrumentsMemory(activeInstruments)
            .catch(e => {});
        }
      }
    });

    return () => {
      unsubSeq();
      unsubTransport();
      unsubSettings();
    };
  }, []);

  // Initialize stable Audio Engine Nodes
  useEffect(() => {
    if (!isAudioUnlocked) return;

    const initAudio = async () => {
      try {
        await loadTone();

        // Guard: Context Closed (Fail-safe)
        if (Tone.getContext().state === 'closed') {
          Tone.setContext(new Tone.Context());
        }

        if (audioEngine) {
          setIsLoading(false);
          return;
        }

        if (isAudioInitializedRef.current) return; // already initialized
        isAudioInitializedRef.current = true;

        const isEco = useSequencerStore.getState().isEcoMode;

        initMasterEffectsChain(
          masterVol,
          masterEQ,
          isEco,
          masterReverbVol,
          metroVolumeRef.current,
          isMetroOnRef.current
        );

        initInstrumentNodes();

      // Synchronize track volume, panning, reverb levels, and mute/solo initially once nodes exist
      tracksRef.current.forEach((t) => {
        if (t.isBusFolder) return;
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst) {
          if (!channels[t.id]) {
            channels[t.id] = new Tone.Channel({ volume: 0 }).connect(masterVolumeNode!);
            try {
              channels[t.id].channelCount = 2;
              channels[t.id].channelCountMode = "explicit";
            } catch (_) {}
            
            meters[t.id] = new Tone.Analyser("waveform", 256) as any;
            channels[t.id].connect(meters[t.id]);

            const initialRevDb = percentToDb(isEco ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
            const initialDistDb = percentToDb(t.fxSends?.distortion ?? 0);

            // Native Tone.js sends for the channel
            reverbSends[t.id] = channels[t.id].send("reverb", initialRevDb);
            distortionSends[t.id] = channels[t.id].send("distortion", initialDistDb);
          }

          if (!trackInputs[t.id]) {
            trackInputs[t.id] = new Tone.Gain(1.0);
            syncTrackInsertChain(t.id, t);
          }

          // Always sync the channel mapping with audioEngine using the start of the insert chain
          audioEngine?.setInstrumentChannel(t.id, inst.id, trackInputs[t.id] || channels[t.id]);

          const gain = Math.max(0.00001, (t.volumeVal ?? 100) / 100);
          const db = t.volumeVal === 0 ? -Infinity : Tone.gainToDb(gain);
          channels[t.id].volume.value = db;
          channels[t.id].pan.value = (t.pan ?? t.panVal ?? 0) / 100;
          channels[t.id].mute = getEffectiveMuteState(tracksRef.current, t.id);
          
          if (reverbSends[t.id]) {
            const targetRevDb = percentToDb(isEco ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
            try { reverbSends[t.id].gain.value = targetRevDb; } catch (_) {}
          }
          if (distortionSends[t.id]) {
            const targetDistDb = percentToDb(t.fxSends?.distortion ?? 0);
            try { distortionSends[t.id].gain.value = targetDistDb; } catch (_) {}
          }
        }
      });

      // Synchronize Master FX Returns initially
      const initialFX = useSequencerStore.getState().masterFX;
      if (masterReverbVolumeNode) {
        const revGain = initialFX.reverb.isMuted ? 0 : Tone.dbToGain(percentToDb(initialFX.reverb.returnVolume));
        masterReverbVolumeNode.gain.value = revGain;
      }
      if (reverbNode) {
        reverbNode.decay = 0.5 + 7.5 * (initialFX.reverb.time / 100);
      }
      syncMasterReverbBypass(initialFX.reverb.isMuted, initialFX.reverb.returnVolume);

      if (masterDistortionVolumeNode) {
        const distGain = initialFX.distortion.isMuted ? 0 : Tone.dbToGain(percentToDb(initialFX.distortion.returnVolume));
        masterDistortionVolumeNode.gain.value = distGain;
      }
      if (distortionNode) {
        distortionNode.distortion = initialFX.distortion.drive / 100;
      }
      syncMasterDistortionBypass(initialFX.distortion.isMuted, initialFX.distortion.returnVolume);

      tracksRef.current.forEach((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst && inst.type === 'voice') {
          t.patterns.forEach((p) => {
            vocalEngineService.loadVocalRecording(p.id);
          });
        }
      });

      // Stable 96-tick sequencing loop using our AudioEngine
      onTickRef.current = (time) => {
        const isDocHidden = typeof document !== 'undefined' && document.hidden;
        let currentTicks = maxTicksRef.current;
        let stepIdx = currentStepIndexRef.current;

        // 1. Déterminer le prochain pas et commuter la mesure si on arrive à la fin
        let nextStepIdx = stepIdx + 1;

        if (stepIdx === -1) {
          nextStepIdx = 0;
          if (soloPatternPlayIdRef.current !== null) {
            measureCountRef.current = 0;
          } else if (isLoopRegionActiveRef.current && loopStartRef.current !== null && (measureCountRef.current < loopStartRef.current || (loopEndRef.current !== null && measureCountRef.current > loopEndRef.current))) {
            measureCountRef.current = loopStartRef.current;
          } else {
            measureCountRef.current = measureCountRef.current % (totalMeasuresRef.current || 1);
          }
          const firstMeasureIdx = measureCountRef.current;
          const firstTimeSig = measureTimeSigsRef.current[firstMeasureIdx] || '4/4';
          currentTicks = getMaxTicks(firstTimeSig);
          maxTicksRef.current = currentTicks;

          flatArrayPointerRef.current = 0;
          absoluteTickCountRef.current = getMeasureStartTick(firstMeasureIdx, measureTimeSigsRef.current);
          currentMeasureStartTickRef.current = absoluteTickCountRef.current;
          lastAbsoluteTickRef.current = -1;
        } else if (stepIdx === currentTicks - 1) {
          nextStepIdx = 0;
          if (soloPatternPlayIdRef.current !== null) {
            measureCountRef.current = 0;
          } else {
            const currentMeasureIdx = measureCountRef.current;
            const effectiveLoopEnd = (isLoopRegionActiveRef.current && loopEndRef.current !== null) ? loopEndRef.current : (totalMeasuresRef.current - 1);

            let activeSection = null;
            const sections = songSectionsRef.current;
            if (sections) {
              for (let i = 0; i < sections.length; i++) {
                if (sections[i].endMeasure === currentMeasureIdx) {
                  activeSection = sections[i];
                  break;
                }
              }
            }

            if (pendingMeasureRef.current !== null) {
              measureCountRef.current = pendingMeasureRef.current;
              pendingMeasureRef.current = null;
              sectionIterationRef.current = pendingIterationRef.current !== null ? pendingIterationRef.current : 1;
              pendingIterationRef.current = null;
            } else if (currentMeasureIdx === effectiveLoopEnd) {
              // Global boundary logic wins
              sectionIterationRef.current = 1;
              if (!isLoopingRef.current) {
                setTimeout(() => {
                  handleStop();
                }, 0);
                measureCountRef.current = (isLoopRegionActiveRef.current && loopStartRef.current !== null) ? loopStartRef.current : 0;
              } else {
                measureCountRef.current = (isLoopRegionActiveRef.current && loopStartRef.current !== null) ? loopStartRef.current : 0;
              }
            } else if (activeSection && sectionIterationRef.current < (activeSection.repeatCount || 1)) {
              // Local section jump
              sectionIterationRef.current++;
              measureCountRef.current = activeSection.startMeasure;
            } else {
              // Normal progression
              if (activeSection) {
                sectionIterationRef.current = 1; // reset for the next pass
              }
              measureCountRef.current = (measureCountRef.current + 1) % (totalMeasuresRef.current || 1);
            }
          }
          const nextMeasureIdx = measureCountRef.current;
          const nextTimeSig = measureTimeSigsRef.current[nextMeasureIdx] || '4/4';
          currentTicks = getMaxTicks(nextTimeSig);
          maxTicksRef.current = currentTicks;
        } else {
          nextStepIdx = nextStepIdx % currentTicks;
        }

        // 2. Avancer le pas
        stepIdx = nextStepIdx;
        currentStepIndexRef.current = stepIdx;

        const currentMeasureIdx = measureCountRef.current;

        // --- VOCAL PLAYBACK CONTINUITY CHECK ---
        {
          const bpm = useSequencerStore.getState().bpm;
          const timeSig = measureTimeSigsRef.current[currentMeasureIdx % (totalMeasuresRef.current || 1)] || '4/4';
          const beats = parseInt(timeSig.split('/')[0]) || 4;
          const measureDurationSec = (beats * 60) / (useSequencerStore.getState().measureBpms[currentMeasureIdx] || bpm);
          const stepCount = getMaxTicks(timeSig);
          const elapsedInMeasure = (stepIdx / stepCount) * measureDurationSec;

          let totalElapsedSec = 0;
          for (let m = 0; m < currentMeasureIdx; m++) {
            const mIdx = m % (useSequencerStore.getState().measureBpms.length || 1);
            const mBpm = useSequencerStore.getState().measureBpms[mIdx] || bpm;
            const mSig = useSequencerStore.getState().measureTimeSigs[mIdx] || '4/4';
            const mBeats = parseInt(mSig.split('/')[0]) || 4;
            totalElapsedSec += (mBeats * 60) / mBpm;
          }
          totalElapsedSec += elapsedInMeasure;

          // Discontinuity seek/loop detection
          if (totalElapsedSec < lastElapsedSecRef.current - 0.1 || totalElapsedSec > lastElapsedSecRef.current + 1.5) {
            activeSequencerVocalsRef.current.forEach(v => v.stop());
            activeSequencerVocalsRef.current.clear();
          }
          lastElapsedSecRef.current = totalElapsedSec;
        }
        // ---------------------------------------

        if (audioEngine) {
          audioEngine.schedulingStep = stepIdx;
          audioEngine.schedulingMeasure = currentMeasureIdx;
        }

        if (stepIdx === 0) {
          const expanded = getExpandedMeasures(totalMeasuresRef.current, songSectionsRef.current);
          let sigId: string | null = null;
          if (expanded.length > 0) {
            const currentExpandedIdx = expanded.findIndex(
              item => item.baseMeasure === currentMeasureIdx && item.iteration === sectionIterationRef.current
            );
            if (currentExpandedIdx !== -1) {
              const prevExpandedIdx = (currentExpandedIdx - 1 + expanded.length) % expanded.length;
              sigId = measureSignalsRef.current[prevExpandedIdx] || null;
            }
          } else {
            const prevMeasureIdx = (currentMeasureIdx - 1 + (totalMeasuresRef.current || 1)) % (totalMeasuresRef.current || 1);
            sigId = measureSignalsRef.current[prevMeasureIdx] || null;
          }
          lastPlayedSignalIdRef.current = sigId;

          currentMeasureStartTickRef.current = getMeasureStartTick(currentMeasureIdx, measureTimeSigsRef.current);
        }

        const _stepForUI = isNaN(stepIdx) ? 0 : stepIdx;
        const _measureForUI = isNaN(currentMeasureIdx) ? 0 : currentMeasureIdx;
        const _currentTicks = isNaN(currentTicks) || currentTicks <= 0 ? 96 : currentTicks;
        const ratioVal = _stepForUI / _currentTicks;

        const rawCtx = Tone.getContext().rawContext as AudioContext;
        // Compensate for hardware output latency on mobile devices so visuals match sound
        const visualDelay = rawCtx.outputLatency || 0.050; // Fallback to 50ms if not supported
        const drawTime = time + visualDelay;

        if (!isDocHidden) {
          Tone.Draw.schedule(() => {
            if (audioEngine) {
              audioEngine.currentStep = _stepForUI;
              audioEngine.currentMeasure = _measureForUI;
            }

            const prevMeasure = useSequencerStore.getState().currentMeasure;
            if (_stepForUI === 0 || _measureForUI !== prevMeasure) {
              setCurrentMeasure(_measureForUI);
              const expanded = getExpandedMeasures(totalMeasuresRef.current, songSectionsRef.current);
              if (expanded.length > 0) {
                const currentExpandedIdx = expanded.findIndex(
                  item => item.baseMeasure === _measureForUI && item.iteration === sectionIterationRef.current
                );
                if (currentExpandedIdx !== -1) {
                  setCurrentExpandedMeasureIdx(currentExpandedIdx);
                }
              } else {
                setCurrentExpandedMeasureIdx(_measureForUI);
              }
            }

            const detail = tickEventDetailRef.current;
            detail.step = _stepForUI;
            detail.measure = _measureForUI;
            detail.maxTicks = _currentTicks;
            detail.ratio = ratioVal;
            detail.visualStep16 = Math.floor(ratioVal * 16);
            detail.visualStep12 = Math.floor(ratioVal * 12);
            detail.time = time;
            detail.iteration = sectionIterationRef.current;

            tickSubscribers.forEach((cb) => {
              try { cb(detail); } catch (err) { console.error(err); }
            });
          }, drawTime);
        }

        // Pré-calculer la durée d'un 96n une seule fois par tick
        const rawBpm = measureBpmsRef.current[currentMeasureIdx];
        const targetBpm = isNaN(rawBpm) || rawBpm <= 0 ? 100 : rawBpm;
        const tick96nSec = 2.5 / targetBpm;

        // 3. Appliquer le BPM
        const transition = measureBpmTransitionsRef.current[currentMeasureIdx] || 'immediate';

        if (stepIdx === 0) {
          try {
            const totalM = totalMeasuresRef.current || 1;
            const prevMeasureIdx = (currentMeasureIdx - 1 + totalM) % totalM;
            const rawPrevBpm = measureBpmsRef.current[prevMeasureIdx];
            const startBpm = isNaN(rawPrevBpm) || rawPrevBpm <= 0 ? targetBpm : rawPrevBpm;

            if (startBpm !== targetBpm) {
              if (transition === 'ramp') {
                const measureDurationSec = currentTicks * tick96nSec;
                Tone.Transport.bpm.cancelScheduledValues(time);
                Tone.Transport.bpm.setValueAtTime(startBpm, time);
                Tone.Transport.bpm.linearRampToValueAtTime(targetBpm, time + measureDurationSec);
              } else {
                Tone.Transport.bpm.cancelScheduledValues(time);
                Tone.Transport.bpm.setValueAtTime(targetBpm, time);
              }
            }
          } catch (e) {}
        }

        // 3b. Appliquer le volume
        const targetVolPercent = measureVolsRef.current[currentMeasureIdx] !== undefined ? measureVolsRef.current[currentMeasureIdx] : 100;
        const volTransition = measureVolTransitionsRef.current[currentMeasureIdx] || 'immediate';

        if (stepIdx === 0) {
          try {
            const endGain = targetVolPercent / 100;
            const prevMeasureIdx = (currentMeasureIdx - 1 + (totalMeasuresRef.current || 1)) % (totalMeasuresRef.current || 1);
            const startVolPercent = measureVolsRef.current[prevMeasureIdx] !== undefined ? measureVolsRef.current[prevMeasureIdx] : 100;
            const startGain = startVolPercent / 100;

            if (endGain !== startGain) {
              if (volTransition === 'ramp') {
                const measureDurationSec = currentTicks * tick96nSec;
                Tone.Destination.volume.cancelScheduledValues(time);
                Tone.Destination.volume.setValueAtTime(Tone.gainToDb(startGain === 0 ? 0.0001 : startGain), time);
                Tone.Destination.volume.linearRampToValueAtTime(Tone.gainToDb(endGain === 0 ? 0.0001 : endGain), time + measureDurationSec);
              } else {
                Tone.Destination.volume.cancelScheduledValues(time);
                Tone.Destination.volume.setValueAtTime(Tone.gainToDb(endGain === 0 ? 0.0001 : endGain), time);
              }
            }
          } catch (e) {}
        }

        // Click metronome beat pulse
        const currentMeasureSig = measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
        const markers = getCachedMarkers(currentMeasureSig, currentTicks);

        if (isMetroOnRef.current && markers.includes(stepIdx)) {
          if (metroVolumeRef.current > 0) {
            const isAccent = (stepIdx === 0);
            playNativeMetroClick(time, isAccent, 'synth', 1.8);
          }
        }

        // Parse trigger of step events
        let swingOffset = 0;
        let swingJitter = 0;
        let posInGroup = 0;
        let stepDurationSec = tick96nSec * 6; // one 16th note
        const globalMode = globalSwingRef.current.mode;
        
        if (globalMode !== 'off') {
          const timeSig = measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
          let beatsCount = 4;
          if (timeSig === '3/4') beatsCount = 3;
          else if (timeSig === '2/4' || timeSig === '6/8') beatsCount = 2;
          else if (timeSig === '12/8') beatsCount = 4;

          const ticksPerBeat = currentTicks / beatsCount;
          const posInBeat = ((stepIdx / ticksPerBeat) % 1) * 4;
          posInGroup = Math.round(posInBeat) % 4;
          
          swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;

          const intensity = (globalSwingRef.current.swingIntensity !== undefined ? globalSwingRef.current.swingIntensity : 100) / 100;

          if (globalMode === 'maracatu') {
            if (posInGroup === 0) {
              swingOffset = swingJitter;
            } else if (posInGroup === 1) {
              swingOffset = (0.04 * intensity * stepDurationSec) + swingJitter;
            } else if (posInGroup === 2) {
              const minimalJitter = (nextRandom() * 0.02 - 0.01) * stepDurationSec;
              swingOffset = (-0.144 * intensity * stepDurationSec) + minimalJitter;
            } else if (posInGroup === 3) {
              swingOffset = (-0.292 * intensity * stepDurationSec) + swingJitter;
            }
          } else if (globalMode === 'custom') {
            // Custom offset is defined in percentages from -100 to 100, where 100 is half a step duration
            const customOffsetPct = globalSwingRef.current.customOffsets[posInGroup] || 0;
            swingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 * intensity + swingJitter;
          }
        }
        const swingTime = time + swingOffset;

        // Percussive notes playback (flat compiled schedule)
        const currentAbsoluteTick = currentMeasureStartTickRef.current + stepIdx;
        const flatArray = flatCompiledScheduleRef.current;
        if (flatArray) {
          const len = flatArray.length;
          let ptr = flatArrayPointerRef.current;

          // Reset pointer if compiled schedule changed, or currentAbsoluteTick decreased or jumped significantly
          if (flatArray !== lastCompiledScheduleRef.current || currentAbsoluteTick < lastAbsoluteTickRef.current || currentAbsoluteTick - lastAbsoluteTickRef.current > 5) {
            ptr = 0;
            while (ptr < len && flatArray[ptr] < currentAbsoluteTick) {
              ptr += 4;
            }
            lastCompiledScheduleRef.current = flatArray;
          }
          lastAbsoluteTickRef.current = currentAbsoluteTick;

          while (ptr < len) {
            const noteTick = flatArray[ptr];
            if (noteTick > currentAbsoluteTick) {
              break;
            }

            if (noteTick === currentAbsoluteTick) {
              const packedData = flatArray[ptr + 1];
              const velocity = flatArray[ptr + 2];
              const microtimingPct = flatArray[ptr + 3];

              // Decode packedData: trackIdx (8 bits), circleStepIdx (5 bits), strokeCharCode (7 bits), decayPct (7 bits), isTuplet (1 bit)
              const trackIdx = (packedData >> 20) & 0xFF;
              const circleStepIdx = (packedData >> 15) & 0x1F;
              const strokeCharCode = (packedData >> 8) & 0x7F;
              const decayPct = (packedData >> 1) & 0x7F;
              const isTuplet = (packedData & 1) === 1;

              const liveTrack = tracksRef.current[trackIdx];
              if (liveTrack) {
                const inst = instrumentsConfig[liveTrack.instrumentIdx];
                if (inst) {
                  const trackVolPct = liveTrack.volumeVal ?? 100;
                  const isMuted = getEffectiveMuteState(tracksRef.current, liveTrack.id);
                  if (trackVolPct > 0 && !isMuted) {
                    const trackVolLinear = Math.pow(trackVolPct / 100, 2);
                    const finalVel = velocity * trackVolLinear;
                    const strokeSymbol = String.fromCharCode(strokeCharCode);
                    const decayMultiplier = decayPct / 100;

                    // Calculate real-time swing and microtiming offsets
                    let noteSwingOffset = 0;
                    if (globalMode !== 'off') {
                      if (isTuplet) {
                        noteSwingOffset = swingJitter;
                      } else {
                        const trackSwingIntensity = liveTrack.swingIntensity !== undefined ? liveTrack.swingIntensity : 100;
                        const trackSwingMultiplier = trackSwingIntensity / 100;

                        if (trackSwingMultiplier === 1) {
                          noteSwingOffset = swingOffset;
                        } else {
                          let baseSwingOffset = 0;
                          const intensity = (globalSwingRef.current.swingIntensity !== undefined ? globalSwingRef.current.swingIntensity : 100) / 100;

                          if (globalMode === 'maracatu') {
                            if (posInGroup === 1) {
                              baseSwingOffset = 0.04 * intensity * stepDurationSec;
                            } else if (posInGroup === 2) {
                              baseSwingOffset = -0.144 * intensity * stepDurationSec;
                            } else if (posInGroup === 3) {
                              baseSwingOffset = -0.292 * intensity * stepDurationSec;
                            }
                          } else if (globalMode === 'custom') {
                            const customOffsetPct = globalSwingRef.current.customOffsets[posInGroup] || 0;
                            baseSwingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 * intensity;
                          }

                          noteSwingOffset = (baseSwingOffset * trackSwingMultiplier) + swingJitter;
                        }
                      }
                    }

                    let activePattern = null;
                    const patterns = liveTrack.patterns;
                    const numPatterns = patterns.length;
                    for (let pIdx = 0; pIdx < numPatterns; pIdx++) {
                      if (patterns[pIdx].measureAssignments[currentMeasureIdx]) {
                        activePattern = patterns[pIdx];
                        break;
                      }
                    }
                    const stepCount = activePattern ? activePattern.steps : 16;
                    const stepDurSec = tick96nSec * (currentTicks / stepCount);
                    const microOffset = (microtimingPct / 100) * stepDurSec * 0.5;

                    const triggerTime = time + noteSwingOffset + microOffset;

                    audioEngine?.playNote(liveTrack.id, strokeSymbol, triggerTime, finalVel, decayMultiplier);

                    // Visual hit trigger
                    if (!isDocHidden) {
                      Tone.Draw.schedule(() => {
                        hitTriggersRef.current.push(liveTrack.id, circleStepIdx, strokeCharCode);
                      }, triggerTime);
                    }
                  }
                }
              }
            }
            ptr += 4;
          }
          flatArrayPointerRef.current = ptr;
        }

        // Vocal recordings logic
        const tracks = tracksRef.current;
        const numTracks = tracks.length;
        const currentMeasureLocal = measureCountRef.current % totalMeasuresRef.current;

        for (let trackIdx = 0; trackIdx < numTracks; trackIdx++) {
          const track = tracks[trackIdx];
          const inst = instrumentsConfig[track.instrumentIdx];
          if (!inst || inst.type !== 'voice') continue;

          const targetPatternId = useAudioStore.getState().targetPatternId;
          const recordingStatus = useAudioStore.getState().recordingStatus;

          // Self-healing reset of trigger flags
          if (targetPatternId === null || recordingStatus === 'inactive') {
            hasTriggeredPunchInRef.current = false;
            hasTriggeredAutoStopRef.current = false;
          }

          if (targetPatternId !== null) {
            const hasPatternBeingRecorded = track.patterns.some(p => Number(p.id) === Number(targetPatternId));
            
            if (hasPatternBeingRecorded) {
              const targetPattern = track.patterns.find(p => Number(p.id) === Number(targetPatternId));
              if (targetPattern) {
                const storeTargetMeasureIdx = useAudioStore.getState().targetMeasureIdx;
                const initialMeasureIdx = storeTargetMeasureIdx !== null
                  ? storeTargetMeasureIdx
                  : targetPattern.measureAssignments.indexOf(true);
                if (initialMeasureIdx !== -1) {
                  const currentMeasureIdx = measureCountRef.current % totalMeasuresRef.current;
                  
                  // 1 measure pre-roll
                  const startMeasureIdx = Math.max(0, initialMeasureIdx - 1);

                  // Calculate endMeasureIdx (1 measure post-roll after consecutive assignments)
                  let consecutiveMeasures = 0;
                  for (let i = initialMeasureIdx; i < totalMeasuresRef.current; i++) {
                    if (targetPattern.measureAssignments[i]) {
                      consecutiveMeasures++;
                    } else {
                      break;
                    }
                  }
                  consecutiveMeasures = Math.max(1, consecutiveMeasures);
                  const endMeasureIdx = initialMeasureIdx + consecutiveMeasures + 1;

                  // 1. Punch-in check: starts immediately when playhead enters or is in the pre-roll measure
                  if (recordingStatus === 'inactive' && currentMeasureIdx === startMeasureIdx && !hasTriggeredPunchInRef.current) {
                    console.log(`🎙️ [VOCAL DEBUG] useAudioSync.ts - Punch-in measure reached: ${currentMeasureIdx}. Calling startRecording()`);
                    hasTriggeredPunchInRef.current = true;
                    useAudioStore.getState().setRecordingStatus('arming');
                    
                    vocalEngineService.startRecording(targetPatternId, {
                      immediate: true,
                      onError: (err) => {
                        console.error("🎙️ [VOCAL DEBUG] Immediate recording error:", err);
                        hasTriggeredPunchInRef.current = false;
                        useAudioStore.getState().setRecordingStatus('inactive');
                      }
                    });
                  }

                  // 2. Auto-stop check: exact start of endMeasureIdx
                  if (recordingStatus === 'recording' && currentMeasureIdx === endMeasureIdx && stepIdx === 0) {
                    if (!hasTriggeredAutoStopRef.current) {
                      hasTriggeredAutoStopRef.current = true;
                      const stopDelayMs = Math.max(0, (time + tick96nSec - Tone.context.rawContext.currentTime) * 1000) + 1000;
                      console.log(`🎙️ [VOCAL DEBUG] useAudioSync.ts - Auto-stop measure reached: ${currentMeasureIdx}. Scheduling stopRecording and handleStop in ${stopDelayMs.toFixed(1)} ms`);
                      workerSetTimeout(() => {
                        vocalEngineService.stopRecording();
                        handleStop();
                      }, stopDelayMs);
                    }
                  }
                }
              }
            }
          }

          // Playback of vocal patterns
          let activePattern = null;
          const patterns = track.patterns;
          const numPatterns = patterns.length;
          for (let pIdx = 0; pIdx < numPatterns; pIdx++) {
            if (patterns[pIdx].measureAssignments[currentMeasureLocal]) {
              activePattern = patterns[pIdx];
              break;
            }
          }
          if (!activePattern) continue;

          const isSoloPlayActive = soloPatternPlayIdRef.current !== null;
          let canPlay = false;

          if (isSoloPlayActive) {
            for (let pIdx = 0; pIdx < numPatterns; pIdx++) {
              if (patterns[pIdx].id === soloPatternPlayIdRef.current) {
                canPlay = true;
                break;
              }
            }
          } else {
            let hasSolo = false;
            for (let tIdx = 0; tIdx < numTracks; tIdx++) {
              if (tracks[tIdx].isSolo) {
                hasSolo = true;
                break;
              }
            }
            canPlay = hasSolo ? track.isSolo : !track.isMute;
          }

          if (!canPlay) {
            const safeId = Number(activePattern.id);
            if (activeSequencerVocalsRef.current.has(safeId)) {
              activeSequencerVocalsRef.current.get(safeId)?.stop();
              activeSequencerVocalsRef.current.delete(safeId);
            }
            continue;
          }

          const hasVocalBlob = useAudioStore.getState().vocalBlobs[Number(activePattern.id)];
          const hasVocalBuf = useAudioStore.getState().vocalBuffers[Number(activePattern.id)];
          const isMicroMode = activePattern.vocalMode === 'micro' || hasVocalBlob || hasVocalBuf;

          if (isMicroMode) {
            const safeId = Number(activePattern.id);
            const vocalBuf = useAudioStore.getState().vocalBuffers[safeId];
            if (vocalBuf && activePattern.vocalMode === 'micro') {
              const bpm = useSequencerStore.getState().bpm;
              const currentMeasureIdx = measureCountRef.current;
              const timeSig = measureTimeSigsRef.current[currentMeasureIdx % (totalMeasuresRef.current || 1)] || '4/4';
              const beats = parseInt(timeSig.split('/')[0]) || 4;
              const measureDurationSec = (beats * 60) / (useSequencerStore.getState().measureBpms[currentMeasureIdx] || bpm);
              const stepCount = getMaxTicks(timeSig);
              const elapsedInMeasure = (stepIdx / stepCount) * measureDurationSec;

              const initialMeasureIdx = activePattern.measureAssignments.indexOf(true);
              if (initialMeasureIdx !== -1) {
                const startMeasureIdx = Math.max(0, initialMeasureIdx - 1);
                
                let consecutiveMeasures = 0;
                for (let i = initialMeasureIdx; i < totalMeasuresRef.current; i++) {
                  if (activePattern.measureAssignments[i]) {
                    consecutiveMeasures++;
                  } else {
                    break;
                  }
                }
                consecutiveMeasures = Math.max(1, consecutiveMeasures);
                const endMeasureIdx = initialMeasureIdx + consecutiveMeasures;

                const isInRange = currentMeasureIdx >= startMeasureIdx && currentMeasureIdx < endMeasureIdx;

                if (isInRange) {
                  let elapsedSec = 0;
                  for (let m = startMeasureIdx; m < currentMeasureIdx; m++) {
                    const mIdx = m % (useSequencerStore.getState().measureBpms.length || 1);
                    const mBpm = useSequencerStore.getState().measureBpms[mIdx] || bpm;
                    const mSig = useSequencerStore.getState().measureTimeSigs[mIdx] || '4/4';
                    const mBeats = parseInt(mSig.split('/')[0]) || 4;
                    elapsedSec += (mBeats * 60) / mBpm;
                  }
                  elapsedSec += elapsedInMeasure;

                  const vocalStartSec = ((activePattern.vocalTrimStart || 0) + (activePattern.vocalNudge || 0)) / 1000;
                  const elapsedSinceVocalStart = elapsedSec - vocalStartSec;

                  const isAlreadyPlaying = activeSequencerVocalsRef.current.has(safeId);

                  if (elapsedSinceVocalStart >= 0 && elapsedSinceVocalStart < vocalBuf.duration) {
                    if (!isAlreadyPlaying) {
                      const outputNode = trackInputs[track.id] || channels[track.id] || Tone.Destination;
                      const voiceInst = instrumentsConfig[track.instrumentIdx];
                      const isCoroTrack = voiceInst?.id === 'coro';

                      console.log(`🎙️ [VOCAL DEBUG] Triggering vocal for pattern ${safeId} at transport time ${time.toFixed(3)}s. Offset: ${elapsedSinceVocalStart.toFixed(3)}s`);
                      const handle = vocalEngineService.playSequencerVocal(
                        safeId,
                        time,
                        elapsedSinceVocalStart,
                        outputNode,
                        track.volumeVal ?? 100,
                        isCoroTrack
                      );
                      if (handle) {
                        activeSequencerVocalsRef.current.set(safeId, handle);
                      }
                    }
                  } else {
                    if (isAlreadyPlaying) {
                      activeSequencerVocalsRef.current.get(safeId)?.stop();
                      activeSequencerVocalsRef.current.delete(safeId);
                    }
                  }
                } else {
                  if (activeSequencerVocalsRef.current.has(safeId)) {
                    activeSequencerVocalsRef.current.get(safeId)?.stop();
                    activeSequencerVocalsRef.current.delete(safeId);
                  }
                }
              }
            } else {
              if (activeSequencerVocalsRef.current.has(safeId)) {
                activeSequencerVocalsRef.current.get(safeId)?.stop();
                activeSequencerVocalsRef.current.delete(safeId);
              }
            }
            continue;
          } else {
            const stepCount = activePattern.steps;
            if (stepIdx % (currentTicks / stepCount) === 0) {
              const cellIdx = Math.floor(stepIdx / (currentTicks / stepCount));
              const state = activePattern.activeSteps[cellIdx];
              if (state && state !== 0) {
                const triggerTime = swingTime;
                const liveTrack = tracks[trackIdx];
                const trackVolPct = liveTrack ? (liveTrack.volumeVal ?? 100) : 100;
                if (trackVolPct > 0) {
                  const trackVolLinear = Math.pow(trackVolPct / 100, 2);
                  const noteVal = activePattern.notes?.[cellIdx] || 'C4';
                  const transposeSteps = useSequencerStore.getState().vocalTransposeSteps || 0;
                  let finalNoteVal = noteVal;
                  if (transposeSteps !== 0) {
                    try {
                      finalNoteVal = Tone.Frequency(noteVal).transpose(transposeSteps).toNote();
                    } catch (_) {}
                  }
                  const noteFreq = noteToFrequency(finalNoteVal);
                  const decayVal = activePattern.decays?.[cellIdx] ?? 10;
                  const numSteps = getVoiceNoteStepsFromDecay(decayVal);
                  const noteDuration = (numSteps * 6) * tick96nSec;
                  const safeId = Number(activePattern.id);
                  if (activePattern.vocalMode === 'micro' && useAudioStore.getState().vocalBuffers[safeId]) {
                    // Bloque le synthétiseur pour laisser place à la voix réelle
                  } else {
                    playNativeVoiceSynth(noteFreq, triggerTime, noteDuration, trackVolLinear, channels[liveTrack.id]);
                  }
                }

                if (!isDocHidden) {
                  Tone.Draw.schedule(() => {
                    hitTriggersRef.current.push(track.id, cellIdx, state);
                  }, triggerTime);
                }
              }
            }
          }
        }
      };

      const rawCtx = Tone.getContext().rawContext as AudioContext;
      audioEngine = new AudioEngine(
        rawCtx,
        (time) => onTickRef.current(time),
        () => {
          const currentMeasureIdx = measureCountRef.current % (totalMeasuresRef.current || 1);
          const rawBpm = measureBpmsRef.current[currentMeasureIdx];
          const targetBpm = isNaN(rawBpm) || rawBpm <= 0 ? 100 : rawBpm;
          return 2.5 / targetBpm;
        },
        (measureIdx) => {
          const timeSig = measureTimeSigsRef.current[measureIdx % (totalMeasuresRef.current || 1)] || '4/4';
          return getMaxTicks(timeSig);
        }
      );

      inputManager = new InputManager(audioEngine);

      // Connect channels to audioEngine
      tracksRef.current.forEach((t) => {
        if (!t.isBusFolder) {
          const inst = instrumentsConfig[t.instrumentIdx];
          if (inst && channels[t.id]) {
            audioEngine?.setInstrumentChannel(t.id, inst.id, channels[t.id]);
          }
        }
      });
      } catch (err) {
        console.error("❌ Critical error during initAudio:", err);
      } finally {
        if (audioEngine) {
          const isMobileDevice = window.innerWidth <= 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
          if (!isMobileDevice) {
            audioEngine.loadAllSamples().catch(e => { /* console.warn("Background load samples failed:", e); */ });
          }
        }
        // ALWAYS unblock the UI.
        setIsLoading(false);
      }
    };

    initAudio();

    return () => {
      // Pour le Strict Mode React 18, nous ne fermons plus et ne détruisons plus le singleton global AudioEngine.
      // Cela évite de réinstancier le graphe audio sur un contexte fermé lors du remontage immédiat.
      if (audioEngine) {
        audioEngine.stop();
      }
      engineTimeoutsRef.current.forEach((t) => clearTimeout(t));
      engineTimeoutsRef.current.clear();
      
      stopAllNativeOscillators();
    };
  }, [isAudioUnlocked]);

  // Dynamic RAM Management for Mobile (Stroke-level Lazy Loading)
  useEffect(() => {
    const isMobileDevice = window.innerWidth <= 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!audioEngine || !isMobileDevice) return;

    const unsub = useSequencerStore.subscribe((state, prevState) => {
      if (state.tracks !== prevState.tracks) {
        const tracks = state.tracks;
        if (tracks.length === 0) return;

        const activeInstruments = tracks
          .filter(t => !t.isHidden)
          .map(t => {
            const inst = instrumentsConfig[t.instrumentIdx];
            if (!inst) return null;

            return {
              id: inst.id,
              activeStrokes: getActiveStrokesForTrack(t, tracks)
            };
          }).filter(Boolean) as ActiveInstrumentData[];

        activeInstruments.sort((a, b) => a.id.localeCompare(b.id));

        audioEngine.syncActiveInstrumentsMemory(activeInstruments)
          .catch(e => { /* console.warn("Dynamic RAM sync failed:", e); */ });
      }
    });

    return unsub;
  }, [audioEngine]);

  const handleTogglePlay = useCallback(async () => {
    if (import.meta.env.DEV) {
    }
    // 🛡️ SYNC CHECK: Resume context synchronously inside the user event click stack to bypass Safari autoplay block
    if (Tone.context && Tone.context.state !== 'running') {
      try {
        Tone.context.resume();
      } catch (e) {
        // console.warn("AudioContext resume failed:", e);
      }
    }
    if (Tone.start) {
      try {
        Tone.start();
      } catch (_) {}
    }

    if (Tone.context && Tone.context.state !== 'running') {
      try {
        await Tone.context.resume();
      } catch (e) {
        // console.warn("AudioContext resume failed:", e);
      }
    }
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    if (!isPlayingRef.current) {
      lastPlayedSignalIdRef.current = null;
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
      if (import.meta.env.DEV) {
      }
      audioEngine?.start();
      setIsPlaying(true);
    } else {
      if (import.meta.env.DEV) {
      }
      audioEngine?.stop();
      Tone.Draw.cancel();
      hitTriggersRef.current.clear();
      console.log("🎙️ [VOCAL DEBUG] useAudioSync.ts - handleTogglePlay stop. Calling stopRecording() unconditionally.");
      vocalEngineService.stopRecording();
      audioEngine?.stopAllBarulho();
      stopAllNativeOscillators();

      vocalEngineService.stopAllVocalPlayback();
      activeSequencerVocalsRef.current.forEach(v => v.stop());
      activeSequencerVocalsRef.current.clear();
      lastElapsedSecRef.current = 0;
      setIsPlaying(false);
      setCurrentMeasure(measureCountRef.current);


      const pausedStep = currentStepIndexRef.current;
      const pausedMeasure = measureCountRef.current;
      const pausedMaxTicks = maxTicksRef.current;
      const ratioVal = pausedMaxTicks > 0 ? (pausedStep >= 0 ? pausedStep : 0) / pausedMaxTicks : 0;

      const detail = tickEventDetailRef.current;
      detail.step = pausedStep;
      detail.measure = pausedMeasure;
      detail.maxTicks = pausedMaxTicks;
      detail.ratio = ratioVal;
      detail.visualStep16 = Math.floor(ratioVal * 16);
      detail.visualStep12 = Math.floor(ratioVal * 12);
      detail.time = Tone.context.currentTime;
      detail.iteration = 1;

      tickSubscribers.forEach((cb) => {
        try { cb(detail); } catch (err) { console.error(err); }
      });
    }
  }, [audioEngine, setIsPlaying, setSoloPatternPlayId, setCurrentMeasure]);

  const handleStop = useCallback(() => {
    // Clear all pending vocal recording or schedule timeouts
    engineTimeoutsRef.current.forEach((t) => clearTimeout(t));
    engineTimeoutsRef.current.clear();

    pendingMeasureRef.current = null;
    pendingIterationRef.current = null;
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    audioEngine?.stop();
    Tone.Draw.cancel();
    hitTriggersRef.current.clear();
    lastPlayedPatternRef.current = {};
    Tone.Transport.stop();
    console.log("🎙️ [VOCAL DEBUG] useAudioSync.ts - handleStop. Calling stopRecording() unconditionally.");
    vocalEngineService.stopRecording();
    audioEngine?.stopAllBarulho();
    stopAllNativeOscillators();

    vocalEngineService.stopAllVocalPlayback();
    activeSequencerVocalsRef.current.forEach(v => v.stop());
    activeSequencerVocalsRef.current.clear();
    lastElapsedSecRef.current = 0;
    setIsPlaying(false);
    currentStepIndexRef.current = -1;
    measureCountRef.current = 0;
    setCurrentMeasure(0);
    Tone.Transport.seconds = 0;
    lastPlayedSignalIdRef.current = null;
    const detail = tickEventDetailRef.current;
    detail.step = -1;
    detail.measure = 0;
    detail.maxTicks = 16;
    detail.ratio = 0;
    detail.visualStep16 = 0;
    detail.visualStep12 = 0;
    detail.time = 0;
    detail.iteration = 1;

    tickSubscribers.forEach((cb) => {
      try { cb(detail); } catch (err) { console.error(err); }
    });
  }, [audioEngine, setIsPlaying, setSoloPatternPlayId, setCurrentMeasure]);

  const handleStartSoloPattern = useCallback(async (patternId: number, variationId?: string) => {
    // 🛡️ SYNC CHECK: Resume context synchronously inside the user event click stack to bypass Safari autoplay block
    if (Tone.context && Tone.context.state !== 'running') {
      try {
        Tone.context.resume();
      } catch (e) {
        // console.warn("AudioContext resume failed:", e);
      }
    }
    if (Tone.start) {
      try {
        Tone.start();
      } catch (_) {}
    }

    if (Tone.context && Tone.context.state !== 'running') {
      try {
        await Tone.context.resume();
      } catch (e) {
        // console.warn("AudioContext resume failed:", e);
      }
    }
    console.log("🎙️ [VOCAL DEBUG] useAudioSync.ts - handleStartSoloPattern. Calling stopRecording() unconditionally.");
    vocalEngineService.stopRecording();
    audioEngine?.stop();
    Tone.Transport.stop();
    audioEngine?.stopAllBarulho();
    stopAllNativeOscillators();

    vocalEngineService.stopAllVocalPlayback();

    setSoloPatternPlayId(patternId);
    setSoloPatternVariationId(variationId || null);
    currentStepIndexRef.current = -1;
    measureCountRef.current = 0;
    setCurrentMeasure(0);
    Tone.Transport.seconds = 0;
    lastPlayedSignalIdRef.current = null;

    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }
    audioEngine?.start();
    setIsPlaying(true);
  }, [audioEngine, setSoloPatternPlayId, setSoloPatternVariationId, setCurrentMeasure, setIsPlaying]);

  const handleStopSoloPattern = useCallback(() => {
    setSoloPatternPlayId(null);
    setSoloPatternVariationId(null);
    if (isPlayingRef.current) {
      handleStop();
    }
  }, [setSoloPatternPlayId, setSoloPatternVariationId, handleStop]);

  const handleTimelineNavigate = useCallback((measureIdx: number, stepIdxInMeasure: number, stepsInMeasure?: number, iteration: number = 1) => {
    const targetMeasure = measureIdx % (totalMeasuresRefInternal.current || 1);
    if (isPlayingRef.current) {
      pendingMeasureRef.current = targetMeasure;
      pendingIterationRef.current = iteration;
      window.dispatchEvent(new CustomEvent('o-girador-measure-queued', {
        detail: {
          measure: targetMeasure,
          iteration: iteration
        }
      }));
      return;
    }

    const mSig = measureTimeSigsRefInternal.current[measureIdx] || '4/4';
    const currentTicks = getMaxTicks(mSig);
    const steps = stepsInMeasure || (mSig === '6/8' || mSig === '12/8' ? 24 : 16);
    const tickIdx = Math.max(0, Math.min(currentTicks - 1, Math.floor((stepIdxInMeasure / steps) * currentTicks)));
    
    measureCountRef.current = measureIdx;
    sectionIterationRef.current = iteration;
    setCurrentMeasure(targetMeasure);
    currentStepIndexRef.current = tickIdx - 1; // -1 so the next loop cycle increments to tickIdx
    maxTicksRef.current = currentTicks;

    if (audioEngine) {
      audioEngine.currentMeasure = measureIdx;
      audioEngine.currentStep = Math.max(0, tickIdx);
    }

    const ratioVal = tickIdx / currentTicks;
    const detail = tickEventDetailRef.current;
    detail.step = tickIdx;
    detail.measure = targetMeasure;
    detail.maxTicks = currentTicks;
    detail.ratio = ratioVal;
    detail.visualStep16 = Math.floor(ratioVal * 16);
    detail.visualStep12 = Math.floor(ratioVal * 12);
    detail.time = Tone.context.currentTime;
    detail.iteration = iteration;

    tickSubscribers.forEach((cb) => {
      try { cb(detail); } catch (err) { console.error(err); }
    });
  }, [setCurrentMeasure]);

  const navigateRef = useRef(handleTimelineNavigate);
  useEffect(() => {
    navigateRef.current = handleTimelineNavigate;
  }, [handleTimelineNavigate]);

  useEffect(() => {
    const handleTimelineNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ mIdx: number; sIdx: number }>;
      const { mIdx, sIdx } = customEvent.detail;
      navigateRef.current(mIdx, sIdx);
    };
    window.addEventListener('o-girador-timeline-nav', handleTimelineNav);
    return () => window.removeEventListener('o-girador-timeline-nav', handleTimelineNav);
  }, []);

  const lastAppliedTracksParamsRef = useRef<Record<string, string>>({});
  const lastAppliedBussesRef = useRef<Record<string, string | null>>({});

  // Synchronize track volume, panning, reverb levels, and mute/solo dynamically when React state changes
  useEffect(() => {
    const unsub = useSequencerStore.subscribe((state, prevState) => {
      if (state.masterFX !== prevState.masterFX) {
        const masterFX = state.masterFX;
        
        // 1. Reverb Return Volume & Mute
        if (masterReverbVolumeNode) {
          const revGain = masterFX.reverb.isMuted
            ? 0
            : Tone.dbToGain(percentToDb(masterFX.reverb.returnVolume));
          masterReverbVolumeNode.gain.rampTo(revGain, 0.05);
        }
        
        // 2. Reverb Return Parameter (Decay)
        if (reverbNode) {
          const decay = 0.5 + 7.5 * (masterFX.reverb.time / 100);
          if (reverbNode.decay !== decay) {
            reverbNode.decay = decay;
          }
        }
        syncMasterReverbBypass(masterFX.reverb.isMuted, masterFX.reverb.returnVolume);
        
        // 3. Distortion Return Volume & Mute
        if (masterDistortionVolumeNode) {
          const distGain = masterFX.distortion.isMuted
            ? 0
            : Tone.dbToGain(percentToDb(masterFX.distortion.returnVolume));
          masterDistortionVolumeNode.gain.rampTo(distGain, 0.05);
        }
        
        // 4. Distortion Return Parameter (Drive)
        if (distortionNode) {
          const distVal = masterFX.distortion.drive / 100;
          if (distortionNode.distortion !== distVal) {
            distortionNode.distortion = distVal;
          }
        }
        syncMasterDistortionBypass(masterFX.distortion.isMuted, masterFX.distortion.returnVolume);
      }

      if (state.tracks !== prevState.tracks) {
        if (!isAudioInitializedRef.current) return;
        const tracks = state.tracks;
        const hasSolo = tracks.some((t: any) => t.isSolo);

        // 1. Initialiser et synchroniser les Bus d'abord
        tracks.forEach((t) => {
          if (t.isBusFolder) {
            // Créer le canal du Bus s'il n'existe pas encore
            if (!busChannels[t.id]) {
              const channelNode = new Tone.Channel({ volume: 0 });
              try {
                channelNode.channelCount = 2;
                channelNode.channelCountMode = "explicit";
              } catch (_) {}
              channelNode.connect(masterVolumeNode!);

              busChannels[t.id] = channelNode;
              
              busMeters[t.id] = new Tone.Analyser("waveform", 256) as any;
              channelNode.connect(busMeters[t.id]);
            }

            const gain = Math.max(0.00001, (t.volumeVal ?? 100) / 100);
            const db = t.volumeVal === 0 ? -Infinity : Tone.gainToDb(gain);
            const pan = (t.panVal || 0) / 100;
            const reverb = t.fxSends?.reverb ?? 0;
            const distortion = t.fxSends?.distortion ?? 0;
            const muteState = getEffectiveMuteState(tracks, t.id);

            const paramHash = `bus_${db}_${pan}_${muteState}_${reverb}_${distortion}`;

            if (lastAppliedTracksParamsRef.current[t.id] !== paramHash) {
              busChannels[t.id].volume.value = db;
              busChannels[t.id].pan.value = pan;
              busChannels[t.id].mute = muteState;

              // Envois d'effet pour le bus de dossier (post-fader)
              if (busChannels[t.id] && !reverbSends[t.id]) {
                const isEco = state.isEcoMode;
                reverbSends[t.id] = busChannels[t.id].send("reverb", percentToDb(isEco ? 0 : reverb));
              }
              if (busChannels[t.id] && !distortionSends[t.id]) {
                distortionSends[t.id] = busChannels[t.id].send("distortion", percentToDb(distortion));
              }

              // Mettre à jour le gain des sends du bus (les sends natifs utilisent des decibels)
              const isEco = state.isEcoMode;
              const targetRevDb = percentToDb(isEco ? 0 : reverb);
              const targetDistDb = percentToDb(distortion);
              if (reverbSends[t.id]) {
                try { reverbSends[t.id].gain.value = targetRevDb; } catch (_) {}
              }
              if (distortionSends[t.id]) {
                try { distortionSends[t.id].gain.value = targetDistDb; } catch (_) {}
              }

              // Reconnecter la sortie du bus de dossier (post-fader)
              busChannels[t.id].disconnect();
              
              const currentBusId = t.busId || null;
              if (currentBusId && busChannels[currentBusId]) {
                busChannels[t.id].connect(busChannels[currentBusId]);
              } else {
                busChannels[t.id].connect(masterVolumeNode!);
              }
              
              busChannels[t.id].connect(busMeters[t.id]!);
              if (reverbSends[t.id]) {
                busChannels[t.id].connect(reverbSends[t.id]);
              }
              if (distortionSends[t.id]) {
                busChannels[t.id].connect(distortionSends[t.id]);
              }

              lastAppliedTracksParamsRef.current[t.id] = paramHash;
            }
          }
        });



        // 2. Synchroniser les pistes normales et leur routage vers les Bus
        tracks.forEach((t) => {
          if (t.isBusFolder) return; // Déjà géré au-dessus

          const inst = instrumentsConfig[t.instrumentIdx];
          if (!inst) return;

          // Création dynamique des canaux si inexistants pour cette piste
          if (!channels[t.id]) {
            channels[t.id] = new Tone.Channel({ volume: 0 }).connect(masterVolumeNode!);
            try {
              channels[t.id].channelCount = 2;
              channels[t.id].channelCountMode = "explicit";
            } catch (_) {}
            meters[t.id] = new Tone.Analyser("waveform", 256) as any;
            channels[t.id].connect(meters[t.id]);

            const isEco = state.isEcoMode;
            const initialRevDb = percentToDb(isEco ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
            const initialDistDb = percentToDb(t.fxSends?.distortion ?? 0);

            // Native Tone.js sends for the channel
            reverbSends[t.id] = channels[t.id].send("reverb", initialRevDb);
            distortionSends[t.id] = channels[t.id].send("distortion", initialDistDb);
          }

          if (!trackInputs[t.id]) {
            trackInputs[t.id] = new Tone.Gain(1.0);
            syncTrackInsertChain(t.id, t);
          }

          // Always sync the channel mapping with audioEngine using the start of the insert chain
          audioEngine?.setInstrumentChannel(t.id, inst.id, trackInputs[t.id] || channels[t.id]);

          const gain = Math.max(0.00001, (t.volumeVal ?? 100) / 100);
          const db = t.volumeVal === 0 ? -Infinity : Tone.gainToDb(gain);
          const pan = (t.pan ?? t.panVal ?? 0) / 100;
          const reverb = t.fxSends?.reverb ?? t.reverbVal ?? 0;
          const distortion = t.fxSends?.distortion ?? 0;
          const muteState = getEffectiveMuteState(tracks, t.id);

          const lowCut = t.lowCut ?? false;
          const eqLowG = t.eqBands?.low?.g ?? 0;
          const eqLowF = t.eqBands?.low?.f ?? 100;
          const eqMidG = t.eqBands?.mid?.g ?? 0;
          const eqMidF = t.eqBands?.mid?.f ?? 1000;
          const eqMidQ = t.eqBands?.mid?.q ?? 'wide';
          const eqHighG = t.eqBands?.high?.g ?? 0;
          const eqHighF = t.eqBands?.high?.f ?? 8000;

          const paramHash = `${db}_${pan}_${muteState}_${reverb}_${distortion}_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;

          // A. Appliquer le volume, pan, mute et les inserts (EQ/Low-Cut)
          if (lastAppliedTracksParamsRef.current[t.id] !== paramHash) {
            channels[t.id].volume.value = db;
            channels[t.id].pan.value = pan;
            channels[t.id].mute = muteState;

            if (reverbSends[t.id]) {
              const isEco = state.isEcoMode;
              const targetRevDb = percentToDb(isEco ? 0 : reverb);
              try { reverbSends[t.id].gain.value = targetRevDb; } catch (_) {}
            }
            if (distortionSends[t.id]) {
              const targetDistDb = percentToDb(distortion);
              try { distortionSends[t.id].gain.value = targetDistDb; } catch (_) {}
            }

            // Mettre à jour la chaîne d'inserts
            syncTrackInsertChain(t.id, t);

            lastAppliedTracksParamsRef.current[t.id] = paramHash;
          }

          // B. Routage dynamique de bus
          const currentBusId = t.busId || null;
          if (lastAppliedBussesRef.current[t.id] !== currentBusId) {
            channels[t.id].disconnect();
            if (currentBusId && busChannels[currentBusId]) {
              channels[t.id].connect(busChannels[currentBusId]);
            } else {
              channels[t.id].connect(masterVolumeNode!);
            }
            
            // Reconnecter le send réverb, le send distorsion et le VU-mètre (post-fader)
            if (reverbSends[t.id]) {
              channels[t.id].connect(reverbSends[t.id]);
            }
            if (distortionSends[t.id]) {
              channels[t.id].connect(distortionSends[t.id]);
            }
            if (meters[t.id]) {
              channels[t.id].connect(meters[t.id]);
            }

            lastAppliedBussesRef.current[t.id] = currentBusId;
          }
        });
      }
    });

    return unsub;
  }, [channels]);

  // The vocal playback scheduling has been migrated directly into the lookahead tick scheduler loop for sample-accuracy and looping support.

  return useMemo(() => ({
    isPlaying,
    isLoading,

    setCurrentMeasure,
    setIsLoading,
    isCompiling,
    get isMetroOn() { return useTransportStore.getState().isMetroOn; },
    setIsMetroOn: (on: boolean) => useTransportStore.getState().setIsMetroOn(on),
    get globalSwing() { return useTransportStore.getState().globalSwing; },
    setGlobalSwing: (gs: GlobalSwing) => useTransportStore.getState().setGlobalSwing(gs),
    get metroVolume() { return useTransportStore.getState().metroVolume; },
    setMetroVolume: (vol: number) => useTransportStore.getState().setMetroVolume(vol),
    get metroSound() { return useTransportStore.getState().metroSound; },
    setMetroSound: (sound: 'synth' | 'clave' | 'cowbell') => useTransportStore.getState().setMetroSound(sound),
    get soloPatternPlayId() { return useTransportStore.getState().soloPatternPlayId; },
    setSoloPatternPlayId: (id: number | null) => useTransportStore.getState().setSoloPatternPlayId(id),
    get soloPatternVariationId() { return useTransportStore.getState().soloPatternVariationId; },
    setSoloPatternVariationId: (id: string | null) => useTransportStore.getState().setSoloPatternVariationId(id),
    // Control Handlers
    handleTogglePlay,
    handleStop,
    handleRewind: handleStop, // alias for backwards compatibility
    handleStartSoloPattern,
    handleStopSoloPattern,
    handleTimelineNavigate,
    // Scheduling references/refs needed by circle sequencer/etc.
    isPlayingRef,
    currentStepIndexRef,
    measureCountRef,
    maxTicksRef,
    isMetroOnRef,
    globalSwingRef,
    soloPatternPlayIdRef,
    soloPatternVariationIdRef,
    hitTriggersRef,
    engineTimeoutsRef,
    lastPlayedSignalIdRef,
    tickScheduleRef
  }), [
    isPlaying,
    isLoading,
    isCompiling,
    handleTogglePlay,
    handleStop,
    handleStartSoloPattern,
    handleStopSoloPattern,
    handleTimelineNavigate
  ]);
}
