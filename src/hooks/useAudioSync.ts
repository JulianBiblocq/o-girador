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
import { loadTone } from '../ToneLoader';

interface ScheduledNote {
  time: number;
  instrumentId: string;
  velocity: number;
  decayMultiplier?: number;
}

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

export const activeNativeOscillators = new Set<OscillatorNode>();

export const playNativeMetroClick = (time: number, isAccent: boolean, soundType: string, volume: number) => {
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const osc = rawCtx.createOscillator();
  const clickGain = rawCtx.createGain();
  osc.connect(clickGain);
  
  if (metroChannel) {
    Tone.connect(clickGain, metroChannel as any);
  } else if (masterVolumeNode) {
    Tone.connect(clickGain, masterVolumeNode as any);
  } else {
    clickGain.connect(rawCtx.destination);
  }

  const freq = isAccent ? 880 : 440;
  const volumeMultiplier = isAccent ? 1.0 : 0.6;
  const finalVol = volume * volumeMultiplier;

  clickGain.gain.setValueAtTime(0.0001, time);
  clickGain.gain.exponentialRampToValueAtTime(finalVol, time + 0.002);

  if (soundType === 'clave') {
    osc.type = 'sine';
    const targetFreq = isAccent ? 1200 : 800;
    osc.frequency.setValueAtTime(targetFreq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.01);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.09);
  } else if (soundType === 'cowbell') {
    osc.type = 'triangle';
    osc.frequency.value = isAccent ? 587.33 : 440;
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.07);
  } else {
    osc.type = 'square';
    osc.frequency.value = freq;
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  activeNativeOscillators.add(osc);
  osc.onended = () => {
    activeNativeOscillators.delete(osc);
    try {
      osc.disconnect();
      clickGain.disconnect();
    } catch (_) {}
  };
};

export const playNativeVoiceSynth = (freq: number, time: number, duration: number, volume: number, channelNode: any) => {
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const osc = rawCtx.createOscillator();
  const voiceGain = rawCtx.createGain();
  osc.connect(voiceGain);

  if (channelNode) {
    Tone.connect(voiceGain, channelNode);
  } else if (masterVolumeNode) {
    Tone.connect(voiceGain, masterVolumeNode as any);
  } else {
    voiceGain.connect(rawCtx.destination);
  }

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

  const attack = 0.05;
  voiceGain.gain.setValueAtTime(0.0001, time);
  voiceGain.gain.exponentialRampToValueAtTime(volume * 0.3, time + attack);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.start(time);
  osc.stop(time + duration);

  activeNativeOscillators.add(osc);
  osc.onended = () => {
    activeNativeOscillators.delete(osc);
    try {
      osc.disconnect();
      voiceGain.disconnect();
    } catch (_) {}
  };
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
  const tickEventDetailRef = useRef({
    step: 0,
    measure: 0,
    maxTicks: 96,
    ratio: 0,
    visualStep16: 0,
    visualStep12: 0,
    time: 0
  });
  const isAudioInitializedRef = useRef(false);

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

  // FLAT SONG SCHEDULE REFERENCES
  const flatCompiledScheduleRef = useRef<Float32Array | null>(null);
  const lastCompiledScheduleRef = useRef<Float32Array | null>(null);
  const absoluteTickCountRef = useRef<number>(0);
  const flatArrayPointerRef = useRef<number>(0);
  const lastAbsoluteTickRef = useRef<number>(-1);
  const currentMeasureStartTickRef = useRef<number>(0);
  


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
    let lastSignature = "";
    let lastTotalMeasures = 0;
    let lastMeasureTimeSigs: any = null;
    let lastSoloPatternPlayId = soloPatternPlayId;

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
            const activeIds = new Set<string>();
            state.tracks.forEach((t: any) => {
              const inst = instrumentsConfig[t.instrumentIdx];
              if (inst) activeIds.add(inst.id);
            });
            audioEngine.syncActiveInstrumentsMemory(Array.from(activeIds))
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
        if (isAudioInitializedRef.current) return; // already initialized
        isAudioInitializedRef.current = true;

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

      // Native oscillators used instead of Tone.Synth objects to reduce CPU overhead

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

        // Native voice oscillators used instead of Tone.AMSynth to reduce CPU overhead
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
          const isDocHidden = typeof document !== 'undefined' && document.hidden;
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

            currentMeasureStartTickRef.current = getMeasureStartTick(currentMeasureIdx, measureTimeSigsRef.current);
          }

          const _stepForUI = isNaN(stepIdx) ? 0 : stepIdx;
          const _measureForUI = isNaN(currentMeasureIdx) ? 0 : currentMeasureIdx;
          const _currentTicks = isNaN(currentTicks) || currentTicks <= 0 ? 96 : currentTicks;
          const ratioVal = _stepForUI / _currentTicks;

          const delaySec = Math.max(0, time - rawCtx.currentTime);
          
          // Compensate for hardware output latency on mobile devices so visuals match sound
          const visualDelay = rawCtx.outputLatency || 0.050; // Fallback to 50ms if not supported
          const drawTime = time + visualDelay;

          if (!isDocHidden) {
            Tone.Draw.schedule(() => {
              // ECO MODE: We used to bypass the visual dispatch here, but we now allow the needle to animate
              // while saving CPU strictly on DSP effects (Reverb, Compressor).

              const detail = tickEventDetailRef.current;
              detail.step = _stepForUI;
              detail.measure = _measureForUI;
              detail.maxTicks = _currentTicks;
              detail.ratio = ratioVal;
              detail.visualStep16 = Math.floor(ratioVal * 16);
              detail.visualStep12 = Math.floor(ratioVal * 12);
              detail.time = time;

              window.dispatchEvent(new CustomEvent('o-girador-tick', {
                detail
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
            const metroVolLinear = Math.pow(Math.max(0, metroVolumeRef.current / 100), 2);
            if (metroVolLinear > 0) {
              const isAccent = (stepIdx === 0);
              playNativeMetroClick(time, isAccent, metroSoundRef.current, metroVolLinear);
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

                // Decode packedData: trackIdx (4 bits), circleStepIdx (5 bits), strokeCharCode (7 bits), decayPct (7 bits), isTuplet (1 bit)
                const trackIdx = (packedData >> 20) & 0x0F;
                const circleStepIdx = (packedData >> 15) & 0x1F;
                const strokeCharCode = (packedData >> 8) & 0x7F;
                const decayPct = (packedData >> 1) & 0x7F;
                const isTuplet = (packedData & 1) === 1;

                const liveTrack = tracksRef.current[trackIdx];
                if (liveTrack) {
                  const inst = instrumentsConfig[liveTrack.instrumentIdx];
                  if (inst) {
                    const trackVolPct = liveTrack.volumeVal ?? 100;
                    if (trackVolPct > 0) {
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
                          noteSwingOffset = swingOffset;
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

                      audioEngine?.playNote(inst.id, strokeSymbol, triggerTime, finalVel, decayMultiplier);

                      // Visual hit trigger
                      if (!isDocHidden) {
                        Tone.Draw.schedule(() => {
                          hitTriggersRef.current.push({ trackId: liveTrack.id, stepIndex: circleStepIdx, state: strokeCharCode });
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

            if (recordingVocalPatternIdRef.current !== null) {
              let hasPatternBeingRecorded = false;
              const patterns = track.patterns;
              const numPatterns = patterns.length;
              for (let pIdx = 0; pIdx < numPatterns; pIdx++) {
                if (patterns[pIdx].id === recordingVocalPatternIdRef.current) {
                  hasPatternBeingRecorded = true;
                  break;
                }
              }

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

            if (!canPlay) continue;

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

                const liveTrack = tracks[trackIdx];
                const trackVolPct = liveTrack ? (liveTrack.volumeVal ?? 100) : 100;

                if (stepIdx === 0 && trackVolPct > 0) {
                  player.volume.value = Tone.gainToDb(Math.pow(trackVolPct / 100, 2) || 0.0001);
                  player.playbackRate = playbackRate;
                  player.start(triggerTime, 0, measureDurationSec);

                  if (isVocalGuideEnabledRef.current) {
                    playNativeMetroClick(triggerTime, true, 'synth', 0.5);
                  }
                }
              }
            } else {
              const stepCount = activePattern.steps;
              if (stepIdx % (currentTicks / stepCount) === 0) {
                const cellIdx = Math.floor(stepIdx / (currentTicks / stepCount));
                const state = activePattern.activeSteps[cellIdx];
                if (state && state !== 0) {
                  const symbol = String(state);
                  const noteVal = symbol === 'D' ? 'A3' : symbol === 'E' ? 'E3' : 'C3';
                  const triggerTime = swingTime;
                  const liveTrack = tracks[trackIdx];
                  const trackVolPct = liveTrack ? (liveTrack.volumeVal ?? 100) : 100;
                  if (trackVolPct > 0) {
                    const trackVolLinear = Math.pow(trackVolPct / 100, 2);
                    const noteFreq = noteVal === 'A3' ? 220.00 : noteVal === 'E3' ? 329.63 : 130.81;
                    const noteDuration = 12 * tick96nSec;
                    playNativeVoiceSynth(noteFreq, triggerTime, noteDuration, trackVolLinear, channels[inst.id]);
                  }

                  if (!isDocHidden) {
                    Tone.Draw.schedule(() => {
                      hitTriggersRef.current.push({ trackId: track.id, stepIndex: cellIdx, state });
                    }, triggerTime);
                  }
                }
              }
            }
          }
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
      activeNativeOscillators.forEach((osc) => {
        try { osc.stop(); osc.disconnect(); } catch (_) {}
      });
      activeNativeOscillators.clear();
      isAudioInitializedRef.current = false;
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

        const activeIds = new Set<string>();
        
        tracks.forEach(t => {
          // Keep active track instruments loaded in RAM even if muted or bypassed by solo,
          // so that they trigger instantly when unmuted/unsoloed.
          if (!t.isHidden) {
            const inst = instrumentsConfig[t.instrumentIdx];
            if (inst) activeIds.add(inst.id);
          }
        });

        audioEngine.syncActiveInstrumentsMemory(Array.from(activeIds))
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
      activeNativeOscillators.forEach((osc) => {
        try { osc.stop(); osc.disconnect(); } catch (_) {}
      });
      activeNativeOscillators.clear();

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

      const detail = tickEventDetailRef.current;
      detail.step = pausedStep;
      detail.measure = pausedMeasure;
      detail.maxTicks = pausedMaxTicks;
      detail.ratio = ratioVal;
      detail.visualStep16 = Math.floor(ratioVal * 16);
      detail.visualStep12 = Math.floor(ratioVal * 12);
      detail.time = Tone.context.currentTime;

      window.dispatchEvent(new CustomEvent('o-girador-tick', { detail }));
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
    activeNativeOscillators.forEach((osc) => {
      try { osc.stop(); osc.disconnect(); } catch (_) {}
    });
    activeNativeOscillators.clear();

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
    const detail = tickEventDetailRef.current;
    detail.step = -1;
    detail.measure = 0;
    detail.maxTicks = 16;
    detail.ratio = 0;
    detail.visualStep16 = 0;
    detail.visualStep12 = 0;
    detail.time = 0;

    window.dispatchEvent(new CustomEvent('o-girador-tick', { detail }));
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
    activeNativeOscillators.forEach((osc) => {
      try { osc.stop(); osc.disconnect(); } catch (_) {}
    });
    activeNativeOscillators.clear();

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
