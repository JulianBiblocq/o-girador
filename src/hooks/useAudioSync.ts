/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import { AudioEngine } from '../AudioEngine';
import { InputManager } from '../InputManager';
import { TrackGroup, TimeSignature, HitTrigger, SongSection } from '../types';
import { instrumentsConfig, getMaxTicks, getMarkers } from '../data';

// Module scope audio engines and nodes to avoid duplicate instantiations on React re-renders
export let bMetroClick: Tone.Synth | null = null;
export let metroClaveClick: Tone.MembraneSynth | null = null;
export let metroCowbellClick: Tone.MetalSynth | null = null;
export let metroChannel: Tone.Channel | null = null;
export const channels: { [id: string]: Tone.Channel } = {};
export const meters: { [id: string]: Tone.Meter } = {};
export const voiceSynths: { [id: string]: any } = {};
export let audioEngine: AudioEngine | null = null;
export let inputManager: InputManager | null = null;

export let reverbNode: Tone.Freeverb | null = null;
export const reverbSends: { [id: string]: Tone.Gain } = {};
export let masterVolumeNode: Tone.Gain | null = null;
export let masterMeterNode: Tone.Meter | null = null;
export let masterEQNode: Tone.EQ3 | null = null;
export let masterCompressorNode: Tone.Compressor | null = null;

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

interface ScheduledNote {
  instId: string;
  playerKey: string;
  baseGain: number;
  stepVolMultiplier: number;
  stepDecayMultiplier: number;
  isStrong: boolean;
  microtimingPct: number;
  stepsPerMeasure: number;
  trackId: number;
  circleStepIdx: number;
  state: string | number;
  isTuplet?: boolean;
}

export function buildTickSchedule(
  tracks: any[],
  totalMeasures: number,
  measureTimeSigs: string[],
  instConfig: any[],
  soloPatternPlayId: number | null
): Map<number, Map<number, ScheduledNote[]>> {
  const schedule = new Map<number, Map<number, ScheduledNote[]>>();
  const hasSolo = tracks.some((t: any) => t.isSolo);
  const isSoloPlayActive = soloPatternPlayId !== null;

  for (let measureIdx = 0; measureIdx < totalMeasures; measureIdx++) {
    const timeSig = measureTimeSigs[measureIdx] || '4/4';
    const parts = timeSig.split('/');
    const beats = parseInt(parts[0], 10);
    const beatUnit = parseInt(parts[1], 10);
    const maxTicks = beats * (96 / beatUnit);
    const measureMap = new Map<number, ScheduledNote[]>();

    tracks.forEach((track: any) => {
      const inst = instConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return; // voice handled separately in loop

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

      const stepCount = activePattern.steps;

      // --- PPQN ELASTIC TUPLET MATH ---
      const ticksPerBeat = maxTicks / beats; // exactly 96 / beatUnit
      const resArray = activePattern.beatResolutions || Array(beats).fill(stepCount / beats);
      
      const stepTickMap: number[] = [];
      const stepIsTupletMap: boolean[] = [];
      let accumulatedTicks = 0;
      
      for (let b = 0; b < beats; b++) {
        const res = resArray[b] || (stepCount / beats);
        const ticksPerStep = ticksPerBeat / res;
        for (let r = 0; r < res; r++) {
          stepTickMap.push(Math.round(accumulatedTicks + r * ticksPerStep));
          stepIsTupletMap.push(res === 3 || res === 6);
        }
        accumulatedTicks += ticksPerBeat;
      }

      for (let step = 0; step < stepCount; step++) {
        const state = activePattern.activeSteps[step];
        if (!state || state === 0 || state === '0') continue;

        // Which 96th-note tick does this step land on?
        const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);

        // Resolve player key
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

        const baseVol = activePattern.volumes?.[step] ?? 80;
        // Humanization : la variation est proportionnelle au volume (+/- 15% du volume actuel)
        const volVariation = (Math.random() * 2 - 1) * (baseVol * 0.15);
        let finalVol = baseVol + volVariation;
        finalVol = Math.max(0, Math.min(100, finalVol)); // Clamp entre 0 et 100

        const stepVolMultiplier = finalVol / 100;
        const stepDecayMultiplier = (activePattern.decays?.[step] ?? 100) / 100;
        const microtimingPct = activePattern.microtimings?.[step] ?? 0;

        if (!measureMap.has(tickIdx)) measureMap.set(tickIdx, []);
        measureMap.get(tickIdx)!.push({
          instId: inst.id,
          playerKey: targetKey,
          baseGain: 1.0,
          stepVolMultiplier,
          stepDecayMultiplier,
          isStrong,
          microtimingPct,
          stepsPerMeasure: stepCount,
          trackId: track.id,
          circleStepIdx: step,
          state,
          isTuplet: stepIsTupletMap[step] || false,
        });
      }
    });

    schedule.set(measureIdx, measureMap);
  }
  return schedule;
}

function buildDynamicMeasureSchedule(
  tracks: any[],
  measureIdx: number,
  timeSig: string,
  instConfig: any[],
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null,
  activeVariationsRef: React.MutableRefObject<Record<number, (string | number)[]>>,
  lastPlayedPatternRef: React.MutableRefObject<Record<number, number>>
): Map<number, ScheduledNote[]> {
  const measureMap = new Map<number, ScheduledNote[]>();
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
    const resArray = activePattern.beatResolutions || Array(beats).fill(stepCount / beats);
    
    const stepTickMap: number[] = [];
    let accumulatedTicks = 0;
    
    for (let b = 0; b < beats; b++) {
      const res = resArray[b] || (stepCount / beats);
      const ticksPerStep = ticksPerBeat / res;
      for (let r = 0; r < res; r++) {
        stepTickMap.push(Math.round(accumulatedTicks + r * ticksPerStep));
      }
      accumulatedTicks += ticksPerBeat;
    }

    for (let step = 0; step < stepCount; step++) {
      const state = stepsToPlay[step];
      if (!state || state === 0 || state === '0') continue;

      const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);

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

      if (!measureMap.has(tickIdx)) measureMap.set(tickIdx, []);
      measureMap.get(tickIdx)!.push({
        instId: inst.id,
        playerKey: targetKey,
        baseGain: 1.0,
        stepVolMultiplier,
        stepDecayMultiplier,
        isStrong,
        microtimingPct,
        stepsPerMeasure: stepCount,
        trackId: track.id,
        circleStepIdx: step,
        state,
      });
    }
  });

  return measureMap;
}

interface UseAudioSyncProps {
  tracks: TrackGroup[];
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
  reverbType: 'room' | 'studio' | 'hall';
}

export function useAudioSync({
  tracks,
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
  reverbType
}: UseAudioSyncProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentMeasure, setCurrentMeasure] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);

  const [isMetroOn, setIsMetroOn] = useState<boolean>(false);
  const [metroVolume, setMetroVolume] = useState<number>(80);
  const [metroSound, setMetroSound] = useState<'synth' | 'clave' | 'cowbell'>('synth');
  const sectionIterationRef = useRef<number>(1);
  const lastPlayedPatternRef = useRef<Record<number, number>>({});
  const [isSwingOn, setIsSwingOn] = useState<boolean>(true);
  const [soloPatternPlayId, setSoloPatternPlayId] = useState<number | null>(null);
  const [soloPatternVariationId, setSoloPatternVariationId] = useState<string | null>(null);

  // Scheduling loop safety refs
  const maxTicksRef = useRef<number>(96);
  const isMetroOnRef = useRef<boolean>(false);
  const metroVolumeRef = useRef<number>(80);
  const metroSoundRef = useRef<string>('synth');
  const isSwingOnRef = useRef<boolean>(true);
  const soloPatternPlayIdRef = useRef<number | null>(null);
  const soloPatternVariationIdRef = useRef<string | null>(null);

  const hitTriggersRef = useRef<HitTrigger[]>([]);
  const engineTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  // We still keep tickScheduleRef for rendering static partition / export / pre-compilation
  const tickScheduleRef = useRef<Map<number, Map<number, ScheduledNote[]>>>(new Map());
  
  // Dynamic schedule for the currently playing measure
  const currentDynamicScheduleRef = useRef<Map<number, ScheduledNote[]>>(new Map());

  // Local values sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    setIsPlayingRef.current = setIsPlaying;
  });

  useEffect(() => {
    isMetroOnRef.current = isMetroOn;
    isSwingOnRef.current = isSwingOn;
    metroVolumeRef.current = metroVolume;
    metroSoundRef.current = metroSound;
    if (metroChannel) {
      const gain = Math.max(0.00001, metroVolume / 100);
      const db = metroVolume === 0 ? -Infinity : Tone.gainToDb(gain);
      metroChannel.volume.value = db;
      metroChannel.mute = !isMetroOn;
    }
  }, [isMetroOn, isSwingOn, metroVolume, metroSound]);

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

  // Sync Master Volume node
  useEffect(() => {
    if (masterVolumeNode) {
      masterVolumeNode.gain.setValueAtTime(
        Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol),
        Tone.context.currentTime
      );
    }
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
    if (masterCompressorNode) {
      masterCompressorNode.threshold.value = masterCompressor.threshold;
      masterCompressorNode.ratio.value = masterCompressor.ratio;
    }
  }, [masterCompressor]);

  // Sync Reverb parameters
  useEffect(() => {
    if (reverbNode) {
      const config = {
        room: { roomSize: 0.4, dampening: 4000 },
        studio: { roomSize: 0.6, dampening: 3000 },
        hall: { roomSize: 0.85, dampening: 1500 }
      }[reverbType];

      reverbNode.roomSize.value = config.roomSize;
      reverbNode.dampening = config.dampening;
    }
  }, [reverbType]);

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

  const tracksMusicalSignature = useMemo(() => {
    return JSON.stringify(
      tracks.map(t => ({
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
  }, [tracks]);

  // Recompile tick schedule when state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("⚙️⚙️⚙️ [AUDIO_ENGINE_SYNC_&_RECOMPILE] Hook state changed! Recompiling tickScheduleRef...");
    }
    try {
      const schedule = buildTickSchedule(
        tracks,
        totalMeasures,
        measureTimeSigs,
        instrumentsConfig,
        soloPatternPlayId
      );
      tickScheduleRef.current = schedule;
    } catch (err) {
      console.error("❌ Failed to compile tick schedule:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tracksMusicalSignature,
    totalMeasures,
    measureTimeSigs,
    soloPatternPlayId
  ]);

  // Initialize stable Audio Engine Nodes
  useEffect(() => {
    const initAudio = async () => {
      try {
        if (bMetroClick) return; // already initialized

      if (!masterVolumeNode) {
        if (!Tone.context || Tone.context.state !== 'running') {
          Tone.setContext(new Tone.Context({ latencyHint: 'playback' }));
        }

        masterEQNode = new Tone.EQ3({
          low: masterEQ.low,
          mid: masterEQ.mid,
          high: masterEQ.high
        });
        masterCompressorNode = new Tone.Compressor({
          threshold: masterCompressor.threshold,
          ratio: masterCompressor.ratio,
          attack: 0.03,
          release: 0.25
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
        masterLimiterNode.toDestination();
        
        masterVolumeNode.gain.value = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
        masterMeterNode = new Tone.Meter();
        (window as any).masterMeterNode = masterMeterNode;
        Tone.Destination.connect(masterMeterNode);
      }


      metroChannel = new Tone.Channel({ volume: Tone.gainToDb(metroVolumeRef.current / 100) }).connect(masterVolumeNode);
      metroChannel.mute = !isMetroOnRef.current;

      bMetroClick = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 },
      }).connect(metroChannel);

      metroClaveClick = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.01 }
      }).connect(metroChannel);

      metroCowbellClick = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
      }).connect(metroChannel);
      metroCowbellClick.frequency.value = 200;

      if (!reverbNode) {
        reverbNode = new Tone.Freeverb({ roomSize: 0.6, dampening: 3000 }).connect(masterVolumeNode);
      }

      instrumentsConfig.forEach((inst) => {
        channels[inst.id] = new Tone.Channel({ volume: 0 }).connect(masterVolumeNode!);
        meters[inst.id] = new Tone.Meter();
        channels[inst.id].connect(meters[inst.id]);

        if (!reverbSends[inst.id]) {
          reverbSends[inst.id] = new Tone.Gain(0);
          channels[inst.id].connect(reverbSends[inst.id]);
          reverbSends[inst.id].connect(reverbNode!);
        }

        if (inst.type === 'voice') {
          voiceSynths[inst.id] = new Tone.AMSynth({
            harmonicity: 1,
            oscillator: { type: 'sine' },
            modulation: { type: 'sine' },
            envelope: { attack: 0.05, decay: 0.2 },
            volume: -10,
          }).connect(channels[inst.id]);
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
            reverbSends[inst.id].gain.value = (t.reverbVal || 0) / 100;
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
            console.log("⏰⏰⏰ [AUDIO ENGINE ON_TICK CALLBACK] Fired. time: " + time + " | currentStepIndexRef: " + currentStepIndexRef.current);
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
            // Update React state explicitly for context subscribers, once per measure boundary
            setCurrentMeasure(currentMeasureIdx);

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
            // ECO MODE: Bypass completely the UI visual dispatch during playback to save 100% CPU for audio
            if ((window as any).oGiradorEcoMode && isPlayingRef.current) return;

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
          }, drawTime);

          // Pré-calculer la durée d'un 96n une seule fois par tick
          const rawBpm = measureBpmsRef.current[currentMeasureIdx];
          const targetBpm = isNaN(rawBpm) || rawBpm <= 0 ? 100 : rawBpm;
          const tick96nSec = 2.5 / targetBpm;

          // 3. Appliquer le BPM
          const transition = measureBpmTransitionsRef.current[currentMeasureIdx] || 'immediate';

          if (stepIdx === 0) {
            try {
              if (transition === 'ramp') {
                const totalM = totalMeasuresRef.current || 1;
                const prevMeasureIdx = (currentMeasureIdx - 1 + totalM) % totalM;
                const rawPrevBpm = measureBpmsRef.current[prevMeasureIdx];
                const startBpm = isNaN(rawPrevBpm) || rawPrevBpm <= 0 ? targetBpm : rawPrevBpm;
                const measureDurationSec = currentTicks * tick96nSec;
                Tone.Transport.bpm.cancelScheduledValues(time);
                Tone.Transport.bpm.setValueAtTime(startBpm, time);
                Tone.Transport.bpm.linearRampToValueAtTime(targetBpm, time + measureDurationSec);
              } else {
                Tone.Transport.bpm.cancelScheduledValues(time);
                Tone.Transport.bpm.setValueAtTime(targetBpm, time);
              }
            } catch (e) {}
          }

          // 3b. Appliquer le volume
          const targetVolPercent = measureVolsRef.current[currentMeasureIdx] !== undefined ? measureVolsRef.current[currentMeasureIdx] : 100;
          const volTransition = measureVolTransitionsRef.current[currentMeasureIdx] || 'immediate';

          if (stepIdx === 0) {
            try {
              const endGain = targetVolPercent / 100;
              if (volTransition === 'ramp') {
                const prevMeasureIdx = (currentMeasureIdx - 1 + totalMeasuresRef.current) % totalMeasuresRef.current;
                const startVolPercent = measureVolsRef.current[prevMeasureIdx] !== undefined ? measureVolsRef.current[prevMeasureIdx] : 100;
                const startGain = startVolPercent / 100;
                const measureDurationSec = currentTicks * tick96nSec;
                Tone.Destination.volume.cancelScheduledValues(time);
                Tone.Destination.volume.setValueAtTime(Tone.gainToDb(startGain === 0 ? 0.0001 : startGain), time);
                Tone.Destination.volume.linearRampToValueAtTime(Tone.gainToDb(endGain === 0 ? 0.0001 : endGain), time + measureDurationSec);
              } else {
                Tone.Destination.volume.cancelScheduledValues(time);
                Tone.Destination.volume.setValueAtTime(Tone.gainToDb(endGain === 0 ? 0.0001 : endGain), time);
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
                metroClaveClick?.triggerAttackRelease(noteVal, '32n', time, metroVolLinear);
              } else if (metroSoundRef.current === 'cowbell') {
                metroCowbellClick?.triggerAttackRelease('32n', time, (stepIdx === 0 ? 1 : 0.6) * metroVolLinear);
              } else {
                const noteVal = stepIdx === 0 ? 'A5' : 'E5';
                bMetroClick?.triggerAttackRelease(noteVal, '32n', time, metroVolLinear);
              }
            }
          }

          // Parse trigger of step events
          let swingOffset = 0;
          let swingJitter = 0;
          if (isSwingOnRef.current) {
            const stepDurationSec = tick96nSec * 6; // one 16th note
            const posInBeat = ((stepIdx / (currentTicks / 4)) % 1) * 4;
            const posInGroup = Math.round(posInBeat) % 4;
            const swingIntensity = 1.0;
            swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;

            if (posInGroup === 0) {
              swingOffset = (0.05 * swingIntensity * stepDurationSec) + swingJitter;
            } else if (posInGroup === 1) {
              swingOffset = (0.15 * swingIntensity * stepDurationSec) + swingJitter;
            } else if (posInGroup === 2) {
              const minimalJitter = (nextRandom() * 0.02 - 0.01) * stepDurationSec;
              swingOffset = (0.02 * swingIntensity * stepDurationSec) + minimalJitter;
            } else if (posInGroup === 3) {
              swingOffset = (-0.10 * swingIntensity * stepDurationSec) + swingJitter;
            }
          }
          const swingTime = time + swingOffset;

          // Play non-voice scheduled notes from DYNAMIC schedule
          const scheduledNotes = currentDynamicScheduleRef.current?.get(stepIdx);

          if (scheduledNotes) {
            for (const note of scheduledNotes) {
              try {
                let vel = 1.0;
                if (isSwingOnRef.current) {
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
                    console.log("🎵 [PLAY NOTE] AudioEngine", note.instId, note.playerKey, triggerTime);
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

                  if (isVocalGuideEnabledRef.current && bMetroClick) {
                    bMetroClick.triggerAttackRelease('C6', '16n', triggerTime);
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
          audioEngine.loadAllSamples().catch(e => console.warn("Background load samples failed:", e));
        }
        // ALWAYS unblock the UI.
        setIsLoading(false);
      }
    };

    initAudio();
  }, []);

  const handleTogglePlay = async () => {
    if (import.meta.env.DEV) {
      console.log("📣📣📣 [PLAY_BUTTON_TRIGGERED] handleTogglePlay called! Current state -> isPlaying: " + isPlaying + " | currentStepIndexRef: " + currentStepIndexRef.current);
    }
    await Tone.start();
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    if (!isPlaying) {
      lastPlayedSignalIdRef.current = null;
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
      if (import.meta.env.DEV) {
        console.log("🚀 [AUDIO ENGINE START] Starting audioEngine. Step index ref:", currentStepIndexRef.current);
      }
      audioEngine?.start();
      setIsPlaying(true);
    } else {
      if (import.meta.env.DEV) {
        console.log("⏸️ [AUDIO ENGINE STOP] Stopping audioEngine.");
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
      setCurrentStepIndex(currentStepIndexRef.current);

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
    setCurrentStepIndex(-1);
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
    await Tone.start();
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
    setCurrentStepIndex(-1);
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

  const handleTimelineNavigate = (measureIdx: number, stepIdxInMeasure: number, stepsInMeasure: number) => {
    const mSig = measureTimeSigs[measureIdx] || '4/4';
    const currentTicks = getMaxTicks(mSig);
    const tickIdx = Math.max(0, Math.min(currentTicks - 1, Math.floor((stepIdxInMeasure / stepsInMeasure) * currentTicks)));
    
    measureCountRef.current = measureIdx;
    setCurrentMeasure(measureIdx % totalMeasures);
    currentStepIndexRef.current = tickIdx - 1; // -1 so the next loop cycle increments to tickIdx
    setCurrentStepIndex(tickIdx);
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

  const lastAppliedTracksParamsRef = useRef<Record<string, string>>({});

  // Synchronize track volume, panning, reverb levels, and mute/solo dynamically when React state changes
  useEffect(() => {
    if (Object.keys(channels).length === 0) return;

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
        // console.log(`Setting track ${inst.id} volume to ${t.volumeVal}% (db: ${db})`);
        channels[inst.id].volume.value = db;
        channels[inst.id].pan.value = pan;
        channels[inst.id].mute = muteState;

        if (reverbSends[inst.id]) {
          reverbSends[inst.id].gain.value = reverb;
        }

        lastAppliedTracksParamsRef.current[t.id] = paramHash;
      }
    });
  }, [tracks]);

  return {
    isPlaying,
    isLoading,
    currentMeasure,
    currentStepIndex,
    setCurrentMeasure,
    setCurrentStepIndex,
    setIsLoading,
    isMetroOn,
    setIsMetroOn,
    metroVolume,
    setMetroVolume,
    metroSound,
    setMetroSound,
    isSwingOn,
    setIsSwingOn,
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
    isSwingOnRef,
    soloPatternPlayIdRef,
    soloPatternVariationIdRef,
    hitTriggersRef,
    engineTimeoutsRef,
    lastPlayedSignalIdRef,
    tickScheduleRef
  };
}
