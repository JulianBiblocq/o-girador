/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import { AudioEngine } from '../AudioEngine';
import { InputManager } from '../InputManager';
import { TrackGroup, TimeSignature, HitTrigger, SongSection, GlobalSwing } from '../types';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig, getMaxTicks, getMarkers } from '../data';
import { ScheduledNote } from '../workers/audioCompiler.worker';
import { loadTone } from '../ToneLoader';

// Module scope audio engines and nodes to avoid duplicate instantiations on React re-renders
export let metroChannel: Tone.Channel | null = null;
export const channels: { [id: string]: Tone.Channel } = {};
export const meters: { [id: string]: Tone.Meter } = {};
export const voiceSynths: { [id: string]: any } = {};
export let audioEngine: AudioEngine | null = null;
export let inputManager: InputManager | null = null;

export let masterReverbVolumeNode: Tone.Gain | null = null;
export let reverbNode: Tone.Reverb | null = null;
export const reverbSends: { [id: string]: Tone.Gain } = {};
export let masterVolumeNode: Tone.Gain | null = null;
export let masterMeterNode: Tone.Meter | null = null;
export let masterEQNode: Tone.EQ3 | null = null;
export let masterCompressorNode: Tone.Compressor | null = null;
export let masterSoftClipperNode: Tone.WaveShaper | null = null;

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



// Zero-allocation Object Pools
const MAX_TICKS = 96;
const pooledMeasureSchedule: ScheduledNote[][] = Array.from({ length: MAX_TICKS }, () => []);
const sharedNotePool: ScheduledNote[] = [];
let notePoolIdx = 0;

const sharedStepTickMap = new Float32Array(128);

function buildDynamicMeasureSchedule(
  tracks: any[],
  measureIdx: number,
  timeSig: string,
  instConfig: any[],
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null,
  activeVariationsRef: React.MutableRefObject<Record<number, (string | number)[]>>,
  lastPlayedPatternRef: React.MutableRefObject<Record<number, number>>
): ScheduledNote[][] {
  for (let i = 0; i < MAX_TICKS; i++) {
    pooledMeasureSchedule[i].length = 0;
  }
  notePoolIdx = 0;

  const hasSolo = tracks.some((t: any) => t.isSolo);
  const isSoloPlayActive = soloPatternPlayId !== null;

  const parts = timeSig.split('/');
  const beats = parseInt(parts[0], 10);
  const beatUnit = parseInt(parts[1], 10);
  const maxTicks = beats * (96 / beatUnit);

  tracks.forEach((track: any) => {
    const inst = instConfig[track.instrumentIdx];
    if (!inst || inst.type === 'voice') return;

    let activePattern: any = null;
    let canPlay = false;

    if (isSoloPlayActive) {
      const isTargetSoloTrack = track.patterns.some((p: any) => p.id === soloPatternPlayId);
      if (isTargetSoloTrack) {
        activePattern = track.patterns.find((p: any) => p.id === soloPatternPlayId);
        canPlay = true;
      }
    } else {
      activePattern = track.patterns.find((p: any) => p.measureAssignments[measureIdx]);
      canPlay = hasSolo ? track.isSolo : !track.isMute;
    }

    if (!activePattern || !canPlay) return;

    let stepsToPlay = activePattern.activeSteps;
    let effectiveVolumes = activePattern.volumes;
    let effectiveDecays = activePattern.decays;
    let effectiveMicrotimings = activePattern.microtimings;

    const isFirstTime = lastPlayedPatternRef.current[track.id] !== activePattern.id;
    lastPlayedPatternRef.current[track.id] = activePattern.id;

    if (isSoloPlayActive && soloPatternVariationId === 'base') {
      // Base phrase only, NO variations
    } else if (isSoloPlayActive && soloPatternVariationId && soloPatternVariationId !== 'ensemble' && soloPatternVariationId !== 'base') {
      // Force play specific variation when soloing
      const matchedVariation = activePattern.variations?.find((v: any) => v.id === soloPatternVariationId);
      if (matchedVariation) {
        stepsToPlay = matchedVariation.steps;
        if (matchedVariation.volumes) effectiveVolumes = matchedVariation.volumes;
        if (matchedVariation.decays) effectiveDecays = matchedVariation.decays;
        if (matchedVariation.microtimings) effectiveMicrotimings = matchedVariation.microtimings;
      }
    } else if (
      (!isSoloPlayActive && activePattern.measureAllowVariations?.[measureIdx]) ||
      (isSoloPlayActive && soloPatternVariationId === 'ensemble')
    ) {
      if (activePattern.variations && activePattern.variations.length > 0) {
        let matchedVariation = null;

        if (isFirstTime) {
          matchedVariation = activePattern.variations.find((v: any) => v.playFirstTimeOnly);
        }

        if (!matchedVariation) {
          const validVariations = activePattern.variations.filter((v: any) => !v.playFirstTimeOnly);
          if (validVariations.length > 0) {
            const rand = nextRandom() * 100;
            let sum = 0;
            for (const variation of validVariations) {
              if (rand >= sum && rand < sum + variation.probability) {
                matchedVariation = variation;
                break;
              }
              sum += variation.probability;
            }
          }
        }

        if (matchedVariation) {
          stepsToPlay = matchedVariation.steps;
          if (matchedVariation.volumes) effectiveVolumes = matchedVariation.volumes;
          if (matchedVariation.decays) effectiveDecays = matchedVariation.decays;
          if (matchedVariation.microtimings) effectiveMicrotimings = matchedVariation.microtimings;
        }
      }
    }

    // Save the chosen steps so the UI can render them
    activeVariationsRef.current[track.id] = stepsToPlay;

    const stepCount = activePattern.steps;

    // --- PPQN ELASTIC TUPLET MATH ---
    const ticksPerBeat = maxTicks / beats; // exactly 96 / beatUnit
    const resArray = activePattern.beatResolutions;
    
    let accumulatedTicks = 0;
    let stepTickCount = 0;
    
    for (let b = 0; b < beats; b++) {
      const res = resArray ? resArray[b] : (stepCount / beats);
      const ticksPerStep = ticksPerBeat / res;
      for (let r = 0; r < res; r++) {
        sharedStepTickMap[stepTickCount++] = Math.round(accumulatedTicks + r * ticksPerStep);
      }
      accumulatedTicks += ticksPerBeat;
    }

    for (let step = 0; step < stepCount; step++) {
      const state = stepsToPlay[step];
      if (!state || state === 0 || state === '0') continue;

      const tickIdx = sharedStepTickMap[step] !== undefined ? sharedStepTickMap[step] : Math.floor((step * maxTicks) / stepCount);

      let targetKey: string | null = typeof state === 'string' ? state : String(state);
      let isStrong = false;

      if (inst.type === 'gongue') {
        if (state === 'G' || state === 'A') { isStrong = true; }
      } else if (inst.id === 'caixa') {
        if (['D', 'E', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
      } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
        if (['D', 'E', 'X', 'I', 'C'].includes(state)) { isStrong = true; }
      } else if (inst.id === 'tarol') {
        if (['D', 'E', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
      } else if (inst.id === 'agbe') {
        if (['D', 'E', 'S'].includes(state)) { isStrong = true; }
      } else {
        if (['D', 'E', 'P', 'T'].includes(state as string)) { isStrong = true; }
      }

      if (!targetKey) continue;

      const baseVol = effectiveVolumes?.[step] ?? 80;
      // Humanization : la variation est proportionnelle au volume (+/- 15% du volume actuel)
      const volVariation = (Math.random() * 2 - 1) * (baseVol * 0.15);
      let finalVol = baseVol + volVariation;
      finalVol = Math.max(0, Math.min(100, finalVol)); // Clamp entre 0 et 100

      const stepVolMultiplier = finalVol / 100;
      const stepDecayMultiplier = (effectiveDecays?.[step] ?? 100) / 100;
      const microtimingPct = effectiveMicrotimings?.[step] ?? 0;

      if (tickIdx < MAX_TICKS) {
        if (notePoolIdx >= sharedNotePool.length) {
          sharedNotePool.push({ instId: '', playerKey: '', baseGain: 1.0, stepVolMultiplier: 1.0, stepDecayMultiplier: 1.0, isStrong: false, microtimingPct: 0, stepsPerMeasure: 16, trackId: -1, circleStepIdx: 0, state: 0, isTuplet: false });
        }
        const pooledNote = sharedNotePool[notePoolIdx++];
        pooledNote.instId = inst.id;
        pooledNote.playerKey = targetKey;
        pooledNote.baseGain = 1.0;
        pooledNote.stepVolMultiplier = stepVolMultiplier;
        pooledNote.stepDecayMultiplier = stepDecayMultiplier;
        pooledNote.isStrong = isStrong;
        pooledNote.microtimingPct = microtimingPct;
        pooledNote.stepsPerMeasure = stepCount;
        pooledNote.trackId = track.id;
        pooledNote.circleStepIdx = step;
        pooledNote.state = state;
        pooledNote.isTuplet = false;

        pooledMeasureSchedule[tickIdx].push(pooledNote);
      }
    }
  });

  return pooledMeasureSchedule;
}

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

  // Vocal Recorder state & handlers
  isRecordingVocal: boolean;
  startVocalRecording: (patternId: number) => void;
  stopVocalRecording: () => void;
  finishVocalRecording: () => void;
  recordingVocalPatternIdRef: React.MutableRefObject<number | null>;
  vocalRecordingStateRef: React.MutableRefObject<'inactive' | 'waiting' | 'recording'>;
  recordedMeasuresCountRef: React.MutableRefObject<number>;
  recordingDurationMeasuresRef: React.MutableRefObject<number>;
  vocalPlayersRef: React.MutableRefObject<{ [patternId: number]: any }>;
  isVocalGuideEnabledRef: React.MutableRefObject<boolean>;
  loadVocalRecording: (patternId: number) => Promise<any>;

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

  isRecordingVocal,
  startVocalRecording,
  stopVocalRecording,
  finishVocalRecording,
  recordingVocalPatternIdRef,
  vocalRecordingStateRef,
  recordedMeasuresCountRef,
  recordingDurationMeasuresRef,
  vocalPlayersRef,
  isVocalGuideEnabledRef,
  loadVocalRecording,

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
  // 🛡️ FIX (Audit): Rapatrie instanciation à l'intérieur du hook React via des useRef
  const bMetroClickRef = useRef<Tone.Synth | null>(null);
  const metroClaveClickRef = useRef<Tone.MembraneSynth | null>(null);
  const metroCowbellClickRef = useRef<Tone.MetalSynth | null>(null);

  useEffect(() => {
    return () => {
      // 🛡️ FIX (Audit): Cleanup orphan synths to prevent memory leaks
      try {
        if (bMetroClickRef.current) { bMetroClickRef.current.dispose(); bMetroClickRef.current = null; }
        if (metroClaveClickRef.current) { metroClaveClickRef.current.dispose(); metroClaveClickRef.current = null; }
        if (metroCowbellClickRef.current) { metroCowbellClickRef.current.dispose(); metroCowbellClickRef.current = null; }
      } catch (_) {}
    };
  }, []);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const compilerWorkerRef = useRef<Worker | null>(null);
  const isRecordingRef = useRef(false);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);
  const setCurrentMeasure = (useSequencerStore as any)(state => state.setCurrentMeasure) as any;

  const [isMetroOn, setIsMetroOn] = useState<boolean>(false);
  const [metroVolume, setMetroVolume] = useState<number>(80);
  const [metroSound, setMetroSound] = useState<'synth' | 'clave' | 'cowbell'>('synth');
  const sectionIterationRef = useRef<number>(1);
  const lastPlayedPatternRef = useRef<Record<number, number>>({});
  const [globalSwing, setGlobalSwing] = useState<GlobalSwing>({ mode: 'maracatu', customOffsets: [0, 8, -29, -58] });
  const [soloPatternPlayId, setSoloPatternPlayId] = useState<number | null>(null);
  const [soloPatternVariationId, setSoloPatternVariationId] = useState<string | null>(null);

  // Scheduling loop safety refs
  const maxTicksRef = useRef<number>(96);
  const isMetroOnRef = useRef<boolean>(false);
  const metroVolumeRef = useRef<number>(80);
  const metroSoundRef = useRef<string>('synth');
  const globalSwingRef = useRef<GlobalSwing>({ mode: 'maracatu', customOffsets: [0, 8, -29, -58] });
  const soloPatternPlayIdRef = useRef<number | null>(null);
  const soloPatternVariationIdRef = useRef<string | null>(null);

  const hitTriggersRef = useRef<HitTrigger[]>([]);
  const engineTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  // We still keep tickScheduleRef for rendering static partition / export / pre-compilation
  const tickScheduleRef = useRef<Map<number, Map<number, ScheduledNote[]>>>(new Map());
  
  // Dynamic schedule for the currently playing measure
  const currentDynamicScheduleRef = useRef<ScheduledNote[][] | null>(null);

  // Local values sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    setIsPlayingRef.current = setIsPlaying;
  });

  useEffect(() => {
    isMetroOnRef.current = isMetroOn;
    globalSwingRef.current = globalSwing;
    metroVolumeRef.current = metroVolume;
    metroSoundRef.current = metroSound;
    if (metroChannel) {
      const gain = Math.max(0.00001, metroVolume / 100);
      const db = metroVolume === 0 ? -Infinity : Tone.gainToDb(gain);
      metroChannel.volume.value = db;
      metroChannel.mute = !isMetroOn;
    }
  }, [isMetroOn, globalSwing, metroVolume, metroSound]);

  useEffect(() => {
    soloPatternPlayIdRef.current = soloPatternPlayId;
    soloPatternVariationIdRef.current = soloPatternVariationId;
  }, [soloPatternPlayId, soloPatternVariationId]);

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
    const applyVolume = () => {
      if (masterVolumeNode) {
        const isEco = (window as any).oGiradorEcoMode;
        const baseGain = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
        const multiplier = isEco ? Tone.dbToGain(-8) : 1.0;
        masterVolumeNode.gain.setValueAtTime(
          baseGain * multiplier,
          Tone.context.currentTime
        );
      }
    };

    applyVolume();
    window.addEventListener('eco-mode-changed', applyVolume);
    return () => window.removeEventListener('eco-mode-changed', applyVolume);
  }, [masterVol]);

  // Sync Master EQ
  useEffect(() => {
    if (masterEQNode) {
      masterEQNode.low.value = masterEQ.low;
      masterEQNode.mid.value = masterEQ.mid;
      masterEQNode.high.value = masterEQ.high;
    }
  }, [masterEQ]);

  // Sync Master Compressor
  useEffect(() => {
    const applyCompressor = () => {
      if (masterCompressorNode) {
        const isEco = (window as any).oGiradorEcoMode;
        masterCompressorNode.threshold.value = isEco ? 0 : masterCompressor.threshold;
        masterCompressorNode.ratio.value = isEco ? 1 : masterCompressor.ratio;
      }
    };
    
    applyCompressor();
    window.addEventListener('eco-mode-changed', applyCompressor);
    return () => window.removeEventListener('eco-mode-changed', applyCompressor);
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

  // Sync Reverb Sends in response to Eco Mode changes
  useEffect(() => {
    const applyEcoReverbSends = () => {
      const isEco = (window as any).oGiradorEcoMode;
      const tracks = useSequencerStore.getState().tracks;
      
      tracks.forEach((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst && reverbSends[inst.id]) {
          const reverb = (t.reverbVal || 0) / 100;
          reverbSends[inst.id].gain.value = isEco ? 0 : reverb;
        }
      });
    };

    applyEcoReverbSends();
    window.addEventListener('eco-mode-changed', applyEcoReverbSends);
    return () => window.removeEventListener('eco-mode-changed', applyEcoReverbSends);
  }, []);

  // Sync Transport BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Reset Destination Volume to neutral when stopped
  useEffect(() => {
    if (!isPlaying) {
      try {
        Tone.Destination.volume.setValueAtTime(0, Tone.context.currentTime);
      } catch (err) {}
    }
  }, [isPlaying]);

  // Instancier le Web Worker de compilation une seule fois au montage du composant
  useEffect(() => {
    compilerWorkerRef.current = new Worker(
      new URL('../workers/audioCompiler.worker.ts', import.meta.url),
      { type: 'module' }
    );

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
    let lastSignature = "";
    let lastTotalMeasures = 0;
    let lastMeasureTimeSigs: any = null;
    let lastSoloPatternPlayId = soloPatternPlayId;

    const compile = (stateTracks: any, totalM: number, mTimeSigs: any, soloId: number | null) => {
      const worker = compilerWorkerRef.current;
      if (!worker) return;

      setIsCompiling(true);

      worker.onmessage = (e) => {
        setIsCompiling(false);
        if (e.data.success) {
          const serialized = e.data.data;
          const newSchedule = new Map<number, Map<number, ScheduledNote[]>>();
          for (const [mIdx, measureEntries] of serialized) {
            const mMap = new Map<number, ScheduledNote[]>(measureEntries);
            newSchedule.set(mIdx, mMap);
          }
          tickScheduleRef.current = newSchedule;
        } else {
          console.error("❌ Worker compilation failed:", e.data.error);
        }
      };

      worker.postMessage({
        tracks: stateTracks,
        totalMeasures: totalM,
        measureTimeSigs: mTimeSigs,
        instConfig: instrumentsConfig,
        soloPatternPlayId: soloId
      });
    };

    const getTracksSignature = (tracksList: any[]) => JSON.stringify(
      tracksList.map(t => ({
        id: t.id,
        isMute: t.isMute,
        isSolo: t.isSolo,
        instrumentIdx: t.instrumentIdx,
        patterns: t.patterns.map(p => {
          const { vocalAudioData, ...safePattern } = p;
          return safePattern;
        })
      }))
    );

    // Initial compile
    const initialState = useSequencerStore.getState();
    lastSignature = getTracksSignature(initialState.tracks);
    lastTotalMeasures = initialState.totalMeasures;
    lastMeasureTimeSigs = initialState.measureTimeSigs;

    compile(initialState.tracks, initialState.totalMeasures, initialState.measureTimeSigs, soloPatternPlayId);

    // Subscribe to Zustand for store changes
    const unsub = useSequencerStore.subscribe((state, prevState) => {
      let changed = false;
      
      if (state.tracks !== prevState.tracks) {
        const newSignature = getTracksSignature(state.tracks);
        if (newSignature !== lastSignature) {
          lastSignature = newSignature;
          changed = true;
          
          // Background sync audio buffers only when tracks actually change
          if (audioEngine) {
            const activeIndexes = new Set<number>();
            state.tracks.forEach((t: any) => activeIndexes.add(t.instrumentIdx));
            audioEngine.syncActiveInstrumentsMemory(Array.from(activeIndexes))
              .catch(e => console.warn("Background load samples failed:", e));
          }
        }
      }
      
      if (state.totalMeasures !== prevState.totalMeasures) {
        lastTotalMeasures = state.totalMeasures;
        changed = true;
      }
      
      if (state.measureTimeSigs !== prevState.measureTimeSigs) {
        lastMeasureTimeSigs = state.measureTimeSigs;
        changed = true;
      }
      
      if (changed) {
        compile(state.tracks, state.totalMeasures, state.measureTimeSigs, lastSoloPatternPlayId);
      }
    });

    return () => {
      unsub();
    };
  }, [soloPatternPlayId]);

  // Initialize stable Audio Engine Nodes
  useEffect(() => {
    const initAudio = async () => {
      try {
        await loadTone();
        if (bMetroClickRef.current) return; // already initialized

        const isEco = (window as any).oGiradorEcoMode;

      if (!masterVolumeNode) {
        if (!Tone.context) {
          Tone.setContext(new Tone.Context({ latencyHint: 'playback' }));
        }

        masterEQNode = new Tone.EQ3({
          low: masterEQ.low,
          mid: masterEQ.mid,
          high: masterEQ.high
        });
        masterCompressorNode = new Tone.Compressor({
          threshold: isEco ? 0 : -12, // Changed from -24 to prevent heavy pumping on percussion
          ratio: isEco ? 1 : 2,       // Gentle glue compression instead of hard squashing
          attack: 0.015,  // Faster attack to catch peaks
          release: 0.15   // Faster release to avoid swelling the reverb tail on the next beat
        });

        masterVolumeNode = new Tone.Gain(1.0);
        masterVolumeNode.connect(masterEQNode);
        masterEQNode.connect(masterCompressorNode);
        
        // Add a highpass filter at 55Hz to remove mud and sub-bass that tablets/phones can't reproduce
        // This prevents inaudible low frequencies from triggering the Limiter and causing stutter/pumping
        const masterHighpassNode = new Tone.Filter(55, 'highpass');
        masterCompressorNode.connect(masterHighpassNode);

        // Add a Limiter at -2dB to prevent digital clipping when many instruments hit simultaneously
        const masterLimiterNode = new Tone.Limiter(-2);
        masterHighpassNode.connect(masterLimiterNode);

        // Tone.js 0% CPU Soft Clipper (Tone.WaveShaper using cubic curve with 4x oversampling)
        masterSoftClipperNode = new Tone.WaveShaper();
        const curveSize = 8192;
        const clipperCurve = new Float32Array(curveSize);
        for (let i = 0; i < curveSize; i++) {
          const x = (2 * i) / (curveSize - 1) - 1;
          let y = (3 * x - Math.pow(x, 3)) / 2;
          if (x <= -1) {
            y = -1.0;
          } else if (x >= 1) {
            y = 1.0;
          }
          clipperCurve[i] = y;
        }
        masterSoftClipperNode.curve = clipperCurve;
        masterSoftClipperNode.oversample = '4x';

        // Connect chain: masterLimiterNode -> masterSoftClipperNode -> Tone.Destination
        masterLimiterNode.connect(masterSoftClipperNode);
        masterSoftClipperNode.connect(Tone.Destination);
        
        const baseGain = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
        const multiplier = isEco ? Tone.dbToGain(-8) : 1.0;
        masterVolumeNode.gain.value = baseGain * multiplier;
        masterMeterNode = new Tone.Meter();
        (window as any).masterMeterNode = masterMeterNode;
        Tone.Destination.connect(masterMeterNode);
      }


      metroChannel = new Tone.Channel({ volume: Tone.gainToDb(metroVolumeRef.current / 100) }).connect(masterVolumeNode);
      metroChannel.mute = !isMetroOnRef.current;

      bMetroClickRef.current = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 },
      }).connect(metroChannel);

      metroClaveClickRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.01 }
      }).connect(metroChannel);

      metroCowbellClickRef.current = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
      }).connect(metroChannel);
      metroCowbellClickRef.current.frequency.value = 200;

      if (!masterReverbVolumeNode) {
        masterReverbVolumeNode = new Tone.Gain(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol)).connect(masterVolumeNode);
      }

      if (!reverbNode) {
        reverbNode = new Tone.Reverb({ decay: 2.5, preDelay: 0.02, wet: 1 }).connect(masterReverbVolumeNode);
      }

      instrumentsConfig.forEach((inst) => {
        if (!channels[inst.id]) {
          channels[inst.id] = new Tone.Channel({ volume: 0 }).connect(masterVolumeNode!);
        }
        if (!meters[inst.id]) {
          meters[inst.id] = new Tone.Meter();
          channels[inst.id].connect(meters[inst.id]);
        }

        if (!reverbSends[inst.id]) {
          reverbSends[inst.id] = new Tone.Gain(0);
          channels[inst.id].connect(reverbSends[inst.id]);
          reverbSends[inst.id].connect(reverbNode!);
        }

        if (inst.type === 'voice') {
          if (!voiceSynths[inst.id]) {
            voiceSynths[inst.id] = new Tone.AMSynth({
              harmonicity: 1,
              oscillator: { type: 'sine' },
              modulation: { type: 'sine' },
              envelope: { attack: 0.05, decay: 0.2 },
              volume: -10,
            }).connect(channels[inst.id]);
          }
        }
      });

      // Synchronize track volume, panning, reverb levels, and mute/solo initially once nodes exist
      const initialHasSolo = tracksRef.current.some((t: any) => t.isSolo);
      tracksRef.current.forEach((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst) {
          if (channels[inst.id]) {
            const gain = Math.max(0.00001, (t.volumeVal ?? 100) / 100);
            const db = t.volumeVal === 0 ? -Infinity : Tone.gainToDb(gain);
            channels[inst.id].volume.value = db;
            channels[inst.id].pan.value = (t.panVal || 0) / 100;
            channels[inst.id].mute = t.isMute || (initialHasSolo && !t.isSolo);
          }
          if (reverbSends[inst.id]) {
            reverbSends[inst.id].gain.value = isEco ? 0 : (t.reverbVal || 0) / 100;
          }
        }
      });

      // Load vocal recordings for all patterns in tracks
      tracksRef.current.forEach((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst && inst.type === 'voice') {
          t.patterns.forEach((p) => {
            loadVocalRecording(p.id);
          });
        }
      });

      // Stable 96-tick sequencing loop using our AudioEngine
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      audioEngine = new AudioEngine(
        rawCtx,
        (time) => {
          if (import.meta.env.DEV) {
          }
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
          } else if (stepIdx === currentTicks - 1) {
            nextStepIdx = 0;
            if (soloPatternPlayIdRef.current !== null) {
              measureCountRef.current = 0;
            } else {
              const currentMeasureIdx = measureCountRef.current;
              const effectiveLoopEnd = (isLoopRegionActiveRef.current && loopEndRef.current !== null) ? loopEndRef.current : (totalMeasuresRef.current - 1);

              const activeSection = songSectionsRef.current?.find(s => currentMeasureIdx === s.endMeasure);

              if (currentMeasureIdx === effectiveLoopEnd) {
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

          if (stepIdx === 0) {
            const prevMeasureIdx = (currentMeasureIdx - 1 + (totalMeasuresRef.current || 1)) % (totalMeasuresRef.current || 1);
            const sigId = measureSignalsRef.current[prevMeasureIdx] || null;
            lastPlayedSignalIdRef.current = sigId;

            // Dynamically evaluate variations and build schedule for this measure
            const timeSig = measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
            currentDynamicScheduleRef.current = buildDynamicMeasureSchedule(
              tracksRef.current,
              currentMeasureIdx,
              timeSig,
              instrumentsConfig,
              soloPatternPlayIdRef.current,
              soloPatternVariationIdRef.current,
              activeVariationsRef,
              lastPlayedPatternRef
            );
          }

          const _stepForUI = isNaN(stepIdx) ? 0 : stepIdx;
          const _measureForUI = isNaN(currentMeasureIdx) ? 0 : currentMeasureIdx;
          const _currentTicks = isNaN(currentTicks) || currentTicks <= 0 ? 96 : currentTicks;
          const ratioVal = _stepForUI / _currentTicks;

          const delaySec = Math.max(0, time - rawCtx.currentTime);
          
          // Compensate for hardware output latency on mobile devices so visuals match sound
          const visualDelay = rawCtx.outputLatency || 0.050; // Fallback to 50ms if not supported
          const drawTime = time + visualDelay;

          Tone.Draw.schedule(() => {
            // ECO MODE: We used to bypass the visual dispatch here, but we now allow the needle to animate
            // while saving CPU strictly on DSP effects (Reverb, Compressor).

            window.dispatchEvent(new CustomEvent('o-girador-tick', {
              detail: {
                step: _stepForUI,
                measure: _measureForUI,
                maxTicks: _currentTicks,
                ratio: ratioVal,
                visualStep16: Math.floor(ratioVal * 16),
                visualStep12: Math.floor(ratioVal * 12),
                time: time
              }
            }));

            // Delay the heavy React render until *after* the playhead frame has been painted
            if (_stepForUI === 0) {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  React.startTransition(() => {
                    setCurrentMeasure(_measureForUI);
                  });
                }, 0);
              });
            }
          }, drawTime);

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
            const metroVolLinear = Math.pow(Math.max(0, metroVolumeRef.current / 100), 2);
            if (metroVolLinear > 0) {
              if (metroSoundRef.current === 'clave') {
                const noteVal = stepIdx === 0 ? 'A5' : 'E5';
                metroClaveClickRef.current?.triggerAttackRelease(noteVal, '32n', time, metroVolLinear);
              } else if (metroSoundRef.current === 'cowbell') {
                metroCowbellClickRef.current?.triggerAttackRelease('32n', time, (stepIdx === 0 ? 1 : 0.6) * metroVolLinear);
              } else {
                const noteVal = stepIdx === 0 ? 'A5' : 'E5';
                bMetroClickRef.current?.triggerAttackRelease(noteVal, '32n', time, metroVolLinear);
              }
            }
          }

          // Parse trigger of step events
          let swingOffset = 0;
          let swingJitter = 0;
          const globalMode = globalSwingRef.current.mode;
          
          if (globalMode !== 'off') {
            const stepDurationSec = tick96nSec * 6; // one 16th note
            const posInBeat = ((stepIdx / (currentTicks / 4)) % 1) * 4;
            const posInGroup = Math.round(posInBeat) % 4;
            
            swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;

            if (globalMode === 'maracatu') {
              if (posInGroup === 0) {
                swingOffset = swingJitter;
              } else if (posInGroup === 1) {
                swingOffset = (0.04 * stepDurationSec) + swingJitter;
              } else if (posInGroup === 2) {
                const minimalJitter = (nextRandom() * 0.02 - 0.01) * stepDurationSec;
                swingOffset = (-0.144 * stepDurationSec) + minimalJitter;
              } else if (posInGroup === 3) {
                swingOffset = (-0.292 * stepDurationSec) + swingJitter;
              }
            } else if (globalMode === 'custom') {
              // Custom offset is defined in percentages from -100 to 100, where 100 is half a step duration
              const customOffsetPct = globalSwingRef.current.customOffsets[posInGroup] || 0;
              swingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 + swingJitter;
            }
          }
          const swingTime = time + swingOffset;

          // Play non-voice scheduled notes from DYNAMIC schedule
          const scheduledNotes = currentDynamicScheduleRef.current?.[stepIdx];

          if (scheduledNotes) {
            for (const note of scheduledNotes) {
              try {
                let vel = 1.0;
                if (globalMode !== 'off') {
                  if (note.isTuplet) {
                    vel = note.isStrong
                      ? 0.8 + (nextRandom() * 0.1 - 0.05)
                      : 0.5 + (nextRandom() * 0.1 - 0.05);
                  } else {
                    vel = note.isStrong
                      ? 0.8 + (nextRandom() * 0.2 - 0.1)
                      : 0.4 + (nextRandom() * 0.24 - 0.12);
                  }
                }
                vel *= note.stepVolMultiplier;

                const stepDurSec = tick96nSec * (currentTicks / note.stepsPerMeasure);
                const microOffset = (note.microtimingPct / 100) * stepDurSec * 0.5;
                const triggerTime = time + (note.isTuplet ? swingJitter : swingOffset) + microOffset;

                const liveTrack = tracksRef.current.find(t => t.id === note.trackId);
                const trackVolPct = liveTrack ? (liveTrack.volumeVal ?? 100) : 100;
                
                if (trackVolPct > 0) {
                  const trackVolLinear = Math.pow(trackVolPct / 100, 2);
                  const finalVel = note.baseGain * vel * trackVolLinear;

                  if (import.meta.env.DEV) {
                  }
                  audioEngine?.playNote(note.instId, note.playerKey, triggerTime, finalVel, note.stepDecayMultiplier);
                }

                Tone.Draw.schedule(() => {
                  hitTriggersRef.current.push({ trackId: note.trackId, stepIndex: note.circleStepIdx, state: note.state });
                }, triggerTime);
              } catch (_) {}
            }
          }

          // Vocal recordings logic
          tracksRef.current.forEach((track) => {
            const currentMeasureLocal = measureCountRef.current % totalMeasuresRef.current;
            const inst = instrumentsConfig[track.instrumentIdx];
            if (!inst || inst.type !== 'voice') return;

            if (recordingVocalPatternIdRef.current !== null) {
              const hasPatternBeingRecorded = track.patterns.some((p: any) => p.id === recordingVocalPatternIdRef.current);
              if (hasPatternBeingRecorded) {
                if (stepIdx === 0 && vocalRecordingStateRef.current === 'waiting') {
                  vocalRecordingStateRef.current = 'recording';
                  const startDelayMs = Math.max(0, (time - Tone.context.rawContext.currentTime) * 1000);
                  setTimeout(() => {
                    startVocalRecording(recordingVocalPatternIdRef.current!);
                  }, startDelayMs);
                  recordedMeasuresCountRef.current = 0;
                } else if (stepIdx === currentTicks - 1 && vocalRecordingStateRef.current === 'recording') {
                  recordedMeasuresCountRef.current += 1;
                  if (recordedMeasuresCountRef.current >= recordingDurationMeasuresRef.current) {
                    vocalRecordingStateRef.current = 'inactive';
                    const stopDelayMs = Math.max(0, (time + tick96nSec - Tone.context.rawContext.currentTime) * 1000);
                    setTimeout(() => {
                      finishVocalRecording();
                    }, stopDelayMs);
                  }
                }
              }
            }

            // Playback of vocal patterns
            const activePattern = track.patterns.find((p: any) => p.measureAssignments[currentMeasureLocal]);
            if (!activePattern) return;

            const isSoloPlayActive = soloPatternPlayIdRef.current !== null;
            let canPlay = false;

            if (isSoloPlayActive) {
              canPlay = track.patterns.some((p: any) => p.id === soloPatternPlayIdRef.current);
            } else {
              const hasSolo = tracksRef.current.some((t: any) => t.isSolo);
              canPlay = hasSolo ? track.isSolo : !track.isMute;
            }

            if (!canPlay) return;

            if (activePattern.vocalMode === 'micro') {
              const player = vocalPlayersRef.current[activePattern.id];
              if (player && player.loaded) {
                const bpmVal = measureBpmsRef.current[currentMeasureLocal] || 100;
                const beatsPerMeasure = parseInt(currentMeasureSig.split('/')[0]) || 4;
                const beatsPerMin = bpmVal;
                const measureDurationSec = (beatsPerMeasure * 60) / beatsPerMin;

                let playbackRate = 1.0;
                if (activePattern.vocalBpmSync && activePattern.vocalBaseBpm) {
                  playbackRate = bpmVal / activePattern.vocalBaseBpm;
                }

                const delaySec = (activePattern.vocalLatency ?? 0) / 1000;
                const triggerTime = time + delaySec;

                const liveTrack = tracksRef.current.find(t => t.id === track.id);
                const trackVolPct = liveTrack ? (liveTrack.volumeVal ?? 100) : 100;

                if (stepIdx === 0 && trackVolPct > 0) {
                  player.volume.value = Tone.gainToDb(Math.pow(trackVolPct / 100, 2) || 0.0001);
                  player.playbackRate = playbackRate;
                  player.start(triggerTime, 0, measureDurationSec);

                  if (isVocalGuideEnabledRef.current && bMetroClickRef.current) {
                    bMetroClickRef.current.triggerAttackRelease('C6', '16n', triggerTime);
                  }
                }
              }
            } else {
              const stepCount = activePattern.steps;
              if (stepIdx % (currentTicks / stepCount) === 0) {
                const cellIdx = Math.floor(stepIdx / (currentTicks / stepCount));
                const state = activePattern.activeSteps[cellIdx];
                if (state && state !== 0) {
                  const synth = voiceSynths[inst.id];
                  if (synth) {
                    const symbol = String(state);
                    const noteVal = symbol === 'D' ? 'A3' : symbol === 'E' ? 'E3' : 'C3';
                    const triggerTime = swingTime;
                    const liveTrack = tracksRef.current.find(t => t.id === track.id);
                    const trackVolPct = liveTrack ? (liveTrack.volumeVal ?? 100) : 100;
                    if (trackVolPct > 0) {
                      const trackVolLinear = Math.pow(trackVolPct / 100, 2);
                      synth.triggerAttackRelease(noteVal, '8n', triggerTime, trackVolLinear);
                    }

                    Tone.Draw.schedule(() => {
                      hitTriggersRef.current.push({ trackId: track.id, stepIndex: cellIdx, state });
                    }, triggerTime);
                  }
                }
              }
            }
          });
        },
        () => {
          const currentMeasureIdx = measureCountRef.current % (totalMeasuresRef.current || 1);
          const rawBpm = measureBpmsRef.current[currentMeasureIdx];
          const targetBpm = isNaN(rawBpm) || rawBpm <= 0 ? 100 : rawBpm;
          return 2.5 / targetBpm;
        }
      );

      inputManager = new InputManager(audioEngine);

      // Connect channels to audioEngine
      instrumentsConfig.forEach((inst) => {
        if (inst.type !== 'voice' && channels[inst.id]) {
          audioEngine?.setInstrumentChannel(inst.id, channels[inst.id]);
        }
      });
      } catch (err) {
        console.error("❌ Critical error during initAudio:", err);
      } finally {
        if (audioEngine) {
          const isMobileDevice = window.innerWidth <= 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
          if (!isMobileDevice) {
            audioEngine.loadAllSamples().catch(e => console.warn("Background load samples failed:", e));
          }
        }
        // ALWAYS unblock the UI.
        setIsLoading(false);
      }
    };

    initAudio();

    return () => {
      if (audioEngine) {
        audioEngine.dispose();
        audioEngine = null;
      }
      inputManager = null;
    };
  }, []);

  // Dynamic RAM Management for Mobile
  useEffect(() => {
    const isMobileDevice = window.innerWidth <= 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!audioEngine || !isMobileDevice) return;

    const unsub = useSequencerStore.subscribe((state, prevState) => {
      if (state.tracks !== prevState.tracks) {
        const tracks = state.tracks;
        if (tracks.length === 0) return;

        const hasSolo = tracks.some(t => t.isSolo);
        const activeIndexes = new Set<number>();
        
        tracks.forEach(t => {
          const isMuted = t.isMute || (hasSolo && !t.isSolo);
          if (!isMuted && !t.isHidden) {
            activeIndexes.add(t.instrumentIdx);
          }
        });

        audioEngine.syncActiveInstrumentsMemory(Array.from(activeIndexes))
          .catch(e => console.warn("Dynamic RAM sync failed:", e));
      }
    });

    return unsub;
  }, [audioEngine]);

  const handleTogglePlay = async () => {
    if (import.meta.env.DEV) {
    }
    if (Tone.context && Tone.context.state !== 'running') {
      try {
        await Tone.context.resume();
      } catch (e) {
        console.warn("AudioContext resume failed:", e);
      }
    }
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    if (!isPlaying) {
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
      hitTriggersRef.current = [];
      Tone.Transport.pause();
      if (isRecordingVocal) {
        stopVocalRecording();
      }
      audioEngine?.stopAllBarulho();
      instrumentsConfig.forEach((inst) => {
        if (voiceSynths[inst.id]) {
          try {
            voiceSynths[inst.id].triggerRelease();
          } catch (_) {}
        }
      });

      (Object.values(vocalPlayersRef.current) as any[]).forEach((player) => {
        try {
          player.stop();
        } catch (_) {}
      });
      setIsPlaying(false);
      setCurrentMeasure(measureCountRef.current);


      const pausedStep = currentStepIndexRef.current;
      const pausedMeasure = measureCountRef.current;
      const pausedMaxTicks = maxTicksRef.current;
      const ratioVal = pausedMaxTicks > 0 ? (pausedStep >= 0 ? pausedStep : 0) / pausedMaxTicks : 0;

      window.dispatchEvent(new CustomEvent('o-girador-tick', {
        detail: {
          step: pausedStep,
          measure: pausedMeasure,
          maxTicks: pausedMaxTicks,
          ratio: ratioVal,
          visualStep16: Math.floor(ratioVal * 16),
          visualStep12: Math.floor(ratioVal * 12)
        }
      }));
    }
  };

  const handleStop = () => {
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    audioEngine?.stop();
    Tone.Draw.cancel();
    hitTriggersRef.current = [];
    lastPlayedPatternRef.current = {};
    Tone.Transport.stop();
    if (isRecordingVocal) {
      stopVocalRecording();
    }
    audioEngine?.stopAllBarulho();
    instrumentsConfig.forEach((inst) => {
      if (voiceSynths[inst.id]) {
        try {
          voiceSynths[inst.id].triggerRelease();
        } catch (_) {}
      }
    });

    (Object.values(vocalPlayersRef.current) as any[]).forEach((player) => {
      try {
        player.stop();
      } catch (_) {}
    });
    setIsPlaying(false);
    currentStepIndexRef.current = -1;
    measureCountRef.current = 0;
    setCurrentMeasure(0);
    Tone.Transport.seconds = 0;
    lastPlayedSignalIdRef.current = null;
    window.dispatchEvent(new CustomEvent('o-girador-tick', {
      detail: { step: -1, measure: 0, maxTicks: 16 }
    }));
  };

  const handleStartSoloPattern = async (patternId: number, variationId?: string) => {
    if (Tone.context && Tone.context.state !== 'running') {
      try {
        await Tone.context.resume();
      } catch (e) {
        console.warn("AudioContext resume failed:", e);
      }
    }
    if (isRecordingVocal) {
      stopVocalRecording();
    }
    audioEngine?.stop();
    Tone.Transport.stop();
    audioEngine?.stopAllBarulho();
    instrumentsConfig.forEach((inst) => {
      if (voiceSynths[inst.id]) {
        try {
          voiceSynths[inst.id].triggerRelease();
        } catch (_) {}
      }
    });

    (Object.values(vocalPlayersRef.current) as any[]).forEach((player) => {
      try {
        player.stop();
      } catch (_) {}
    });

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
  };

  const handleStopSoloPattern = () => {
    setSoloPatternPlayId(null);
    setSoloPatternVariationId(null);
    if (isPlayingRef.current) {
      handleStop();
    }
  };

  const handleTimelineNavigate = (measureIdx: number, stepIdxInMeasure: number, stepsInMeasure?: number) => {
    const mSig = measureTimeSigs[measureIdx] || '4/4';
    const currentTicks = getMaxTicks(mSig);
    const steps = stepsInMeasure || (mSig === '6/8' || mSig === '12/8' ? 24 : 16);
    const tickIdx = Math.max(0, Math.min(currentTicks - 1, Math.floor((stepIdxInMeasure / steps) * currentTicks)));
    
    measureCountRef.current = measureIdx;
    setCurrentMeasure(measureIdx % totalMeasures);
    currentStepIndexRef.current = tickIdx - 1; // -1 so the next loop cycle increments to tickIdx
    maxTicksRef.current = currentTicks;

    const ratioVal = tickIdx / currentTicks;
    window.dispatchEvent(new CustomEvent('o-girador-tick', {
      detail: {
        step: tickIdx,
        measure: measureIdx % totalMeasures,
        maxTicks: currentTicks,
        ratio: ratioVal,
        visualStep16: Math.floor(ratioVal * 16),
        visualStep12: Math.floor(ratioVal * 12)
      }
    }));
  };

  const navigateRef = useRef(handleTimelineNavigate);
  useEffect(() => {
    navigateRef.current = handleTimelineNavigate;
  });

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

  // Synchronize track volume, panning, reverb levels, and mute/solo dynamically when React state changes
  useEffect(() => {
    const unsub = useSequencerStore.subscribe((state, prevState) => {
      if (state.tracks !== prevState.tracks) {
        const tracks = state.tracks;
        const hasSolo = tracks.some((t: any) => t.isSolo);

        tracks.forEach((t) => {
          const inst = instrumentsConfig[t.instrumentIdx];
          if (!inst || !channels[inst.id]) return;

          const gain = Math.max(0.00001, (t.volumeVal ?? 100) / 100);
          const db = t.volumeVal === 0 ? -Infinity : Tone.gainToDb(gain);
          const pan = (t.panVal || 0) / 100;
          const muteState = t.isMute || (hasSolo && !t.isSolo);
          const reverb = (t.reverbVal || 0) / 100;

          const paramHash = `${db}_${pan}_${muteState}_${reverb}`;

          if (lastAppliedTracksParamsRef.current[t.id] !== paramHash) {
            channels[inst.id].volume.value = db;
            channels[inst.id].pan.value = pan;
            channels[inst.id].mute = muteState;

            if (reverbSends[inst.id]) {
              const isEco = (window as any).oGiradorEcoMode;
              reverbSends[inst.id].gain.value = isEco ? 0 : reverb;
            }

            lastAppliedTracksParamsRef.current[t.id] = paramHash;
          }
        });
      }
    });
    
    return unsub;
  }, [channels]);

  return {
    isPlaying,
    isLoading,

    setCurrentMeasure,
    setIsLoading,
    isCompiling,
    isMetroOn,
    setIsMetroOn,
    globalSwing,
    setGlobalSwing,
    metroVolume,
    setMetroVolume,
    metroSound,
    setMetroSound,
    soloPatternPlayId,
    setSoloPatternPlayId,
    soloPatternVariationId,
    setSoloPatternVariationId,
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
  };
}
