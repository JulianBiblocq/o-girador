/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { AudioEngine } from '../AudioEngine';
import { InputManager } from '../InputManager';
import { TrackGroup, TimeSignature, HitTrigger } from '../types';
import { instrumentsConfig, getMaxTicks, getMarkers } from '../data';

// Module scope audio engines and nodes to avoid duplicate instantiations on React re-renders
export let bMetroClick: Tone.Synth | null = null;
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
  state: any;
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

      for (let step = 0; step < stepCount; step++) {
        const state = activePattern.activeSteps[step];
        if (!state || state === 0) continue;

        // Which 96th-note tick does this step land on?
        const tickIdx = Math.floor((step * maxTicks) / stepCount);

        // Resolve player key
        let targetKey: string | null = typeof state === 'string' ? state : String(state);
        let isStrong = false;

        if (inst.type === 'gongue') {
          if (state === 'G' || state === 'A') { isStrong = true; }
        } else if (inst.id === 'caixa') {
          if (['D', 'E', 'Q', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
          if (['D', 'E', 'Q', 'X', 'I', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'tarol') {
          if (['D', 'E', 'Q', 'R', 'r', 'X', 'F', 'C'].includes(state)) { isStrong = true; }
        } else if (inst.id === 'agbe') {
          if (['D', 'E', 'S'].includes(state)) { isStrong = true; }
        } else {
          if (['D', 'E', 'P', 'T'].includes(state as string)) { isStrong = true; }
        }

        if (!targetKey) continue;

        const stepVolMultiplier = (activePattern.volumes?.[step] ?? 80) / 100;
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
        });
      }
    });

    schedule.set(measureIdx, measureMap);
  }
  return schedule;
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
  const [isSwingOn, setIsSwingOn] = useState<boolean>(true);
  const [soloPatternPlayId, setSoloPatternPlayId] = useState<number | null>(null);

  // Scheduling loop safety refs
  const maxTicksRef = useRef<number>(96);
  const isMetroOnRef = useRef<boolean>(false);
  const isSwingOnRef = useRef<boolean>(true);
  const soloPatternPlayIdRef = useRef<number | null>(null);

  const hitTriggersRef = useRef<HitTrigger[]>([]);
  const engineTimeoutsRef = useRef<any[]>([]);
  const tickScheduleRef = useRef<Map<number, Map<number, ScheduledNote[]>>>(new Map());

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
  }, [isMetroOn, isSwingOn]);

  useEffect(() => {
    soloPatternPlayIdRef.current = soloPatternPlayId;
  }, [soloPatternPlayId]);

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

  // Recompile tick schedule when state changes
  useEffect(() => {
    console.log("⚙️⚙️⚙️ [AUDIO_ENGINE_SYNC_&_RECOMPILE] Hook state changed! Recompiling tickScheduleRef...");
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
  }, [
    tracks,
    totalMeasures,
    measureTimeSigs,
    soloPatternPlayId
  ]);

  // Initialize stable Audio Engine Nodes
  useEffect(() => {
    const initAudio = async () => {
      if (bMetroClick) return; // already initialized

      if (!masterVolumeNode) {
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
        masterCompressorNode.toDestination();
        
        masterVolumeNode.gain.value = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
        masterMeterNode = new Tone.Meter();
        (window as any).masterMeterNode = masterMeterNode;
        Tone.Destination.connect(masterMeterNode);
      }

      // Configure Tone.js lookAhead to 150ms for pre-scheduling audio events
      try {
        Tone.getContext().lookAhead = 0.15;
      } catch (err) {
        console.warn("Failed to set Tone.js lookAhead:", err);
      }

      bMetroClick = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 },
        volume: 4,
      }).connect(masterVolumeNode);

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
            const gain = (t.volumeVal ?? 100) / 100;
            channels[inst.id].volume.value = Tone.gainToDb(gain);
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
          console.log("⏰⏰⏰ [AUDIO ENGINE ON_TICK CALLBACK] Fired. time: " + time + " | currentStepIndexRef: " + currentStepIndexRef.current);
          let currentTicks = maxTicksRef.current;
          let stepIdx = currentStepIndexRef.current;

          // 1. Commuter la mesure si on arrive à la fin
          if (stepIdx === -1) {
            if (soloPatternPlayIdRef.current !== null) {
              measureCountRef.current = 0;
            } else if (loopStartRef.current !== null && (measureCountRef.current < loopStartRef.current || (loopEndRef.current !== null && measureCountRef.current > loopEndRef.current))) {
              measureCountRef.current = loopStartRef.current;
            } else {
              measureCountRef.current = measureCountRef.current % (totalMeasuresRef.current || 1);
            }
            const firstMeasureIdx = measureCountRef.current;
            const firstTimeSig = measureTimeSigsRef.current[firstMeasureIdx] || '4/4';
            currentTicks = getMaxTicks(firstTimeSig);
            maxTicksRef.current = currentTicks;
          } else if (stepIdx === currentTicks - 1) {
            if (soloPatternPlayIdRef.current !== null) {
              measureCountRef.current = 0;
            } else {
              const currentMeasureIdx = measureCountRef.current;
              if (loopStartRef.current !== null && loopEndRef.current !== null && currentMeasureIdx === loopEndRef.current) {
                measureCountRef.current = loopStartRef.current;
              } else {
                measureCountRef.current = (measureCountRef.current + 1) % (totalMeasuresRef.current || 1);
              }
            }
            const nextMeasureIdx = measureCountRef.current;
            const nextTimeSig = measureTimeSigsRef.current[nextMeasureIdx] || '4/4';
            currentTicks = getMaxTicks(nextTimeSig);
            maxTicksRef.current = currentTicks;
          }

          // 2. Avancer le pas
          stepIdx = (stepIdx + 1) % currentTicks;
          currentStepIndexRef.current = stepIdx;

          const currentMeasureIdx = measureCountRef.current;

          if (stepIdx === 0) {
            const prevMeasureIdx = (currentMeasureIdx - 1 + (totalMeasuresRef.current || 1)) % (totalMeasuresRef.current || 1);
            const sigId = measureSignalsRef.current[prevMeasureIdx] || null;
            lastPlayedSignalIdRef.current = sigId;
          }

          const _stepForUI = isNaN(stepIdx) ? 0 : stepIdx;
          const _measureForUI = isNaN(currentMeasureIdx) ? 0 : currentMeasureIdx;
          const _currentTicks = isNaN(currentTicks) || currentTicks <= 0 ? 96 : currentTicks;
          const ratioVal = _stepForUI / _currentTicks;

          const delayMs = Math.max(0, (time - rawCtx.currentTime) * 1000);
          const timeoutId = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('baquemix-tick', {
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
            engineTimeoutsRef.current = engineTimeoutsRef.current.filter(id => id !== timeoutId);
          }, delayMs);
          engineTimeoutsRef.current.push(timeoutId);

          // Pré-calculer la durée d'un 96n une seule fois par tick
          const targetBpm = measureBpmsRef.current[currentMeasureIdx] ?? 100;
          const tick96nSec = 2.5 / targetBpm;

          // 3. Appliquer le BPM
          const transition = measureBpmTransitionsRef.current[currentMeasureIdx] || 'immediate';

          if (stepIdx === 0) {
            try {
              if (transition === 'ramp') {
                const prevMeasureIdx = (currentMeasureIdx - 1 + totalMeasuresRef.current) % totalMeasuresRef.current;
                const startBpm = measureBpmsRef.current[prevMeasureIdx] ?? targetBpm;
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
            const noteVal = stepIdx === 0 ? 'A5' : 'E5';
            bMetroClick?.triggerAttackRelease(noteVal, '32n', time);
          }

          // Parse trigger of step events
          let swingOffset = 0;
          if (isSwingOnRef.current) {
            const stepDurationSec = tick96nSec * 6; // one 16th note
            const posInBeat = ((stepIdx / (currentTicks / 4)) % 1) * 4;
            const posInGroup = Math.round(posInBeat) % 4;
            const swingIntensity = 1.0;
            const jitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;

            if (posInGroup === 0) {
              swingOffset = (0.05 * swingIntensity * stepDurationSec) + jitter;
            } else if (posInGroup === 1) {
              swingOffset = (0.15 * swingIntensity * stepDurationSec) + jitter;
            } else if (posInGroup === 2) {
              const minimalJitter = (nextRandom() * 0.02 - 0.01) * stepDurationSec;
              swingOffset = (0.02 * swingIntensity * stepDurationSec) + minimalJitter;
            } else if (posInGroup === 3) {
              swingOffset = (-0.10 * swingIntensity * stepDurationSec) + jitter;
            }
          }
          const swingTime = time + swingOffset;

          // Play non-voice scheduled notes
          const measureMap = tickScheduleRef.current.get(currentMeasureIdx);
          const scheduledNotes = measureMap?.get(stepIdx);

          if (scheduledNotes) {
            for (const note of scheduledNotes) {
              try {
                let vel = 1.0;
                if (isSwingOnRef.current) {
                  vel = note.isStrong
                    ? 0.8 + (nextRandom() * 0.2 - 0.1)
                    : 0.4 + (nextRandom() * 0.24 - 0.12);
                }
                vel *= note.stepVolMultiplier;

                const stepDurSec = tick96nSec * (currentTicks / note.stepsPerMeasure);
                const microOffset = (note.microtimingPct / 100) * stepDurSec * 0.5;
                const triggerTime = swingTime + microOffset;

                console.log("🎵 [PLAY NOTE] AudioEngine", note.instId, note.playerKey, triggerTime);
                audioEngine?.playNote(note.instId, note.playerKey, triggerTime, note.baseGain * vel, note.stepDecayMultiplier);

                const delayMs = Math.max(0, (triggerTime - rawCtx.currentTime) * 1000);
                const timeoutId = setTimeout(() => {
                  hitTriggersRef.current.push({ trackId: note.trackId, stepIndex: note.circleStepIdx, state: note.state });
                  engineTimeoutsRef.current = engineTimeoutsRef.current.filter(id => id !== timeoutId);
                }, delayMs);
                engineTimeoutsRef.current.push(timeoutId);
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

                if (stepIdx === 0) {
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
                    synth.triggerAttackRelease(noteVal, '8n', triggerTime);

                    const delayMs = Math.max(0, (triggerTime - rawCtx.currentTime) * 1000);
                    const timeoutId = setTimeout(() => {
                      hitTriggersRef.current.push({ trackId: track.id, stepIndex: cellIdx, state });
                      engineTimeoutsRef.current = engineTimeoutsRef.current.filter(id => id !== timeoutId);
                    }, delayMs);
                    engineTimeoutsRef.current.push(timeoutId);
                  }
                }
              }
            }
          });
        },
        () => {
          const currentMeasureIdx = measureCountRef.current % (totalMeasuresRef.current || 1);
          const targetBpm = measureBpmsRef.current[currentMeasureIdx] ?? 100;
          return 2.5 / targetBpm;
        }
      );

      // Connect channels to audioEngine
      instrumentsConfig.forEach((inst) => {
        if (inst.type !== 'voice' && channels[inst.id]) {
          audioEngine?.setInstrumentChannel(inst.id, channels[inst.id]);
        }
      });

      // Load all samples via the AudioEngine
      audioEngine.loadAllSamples()
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load samples via AudioEngine:", err);
          setIsLoading(false);
        });
    };

    initAudio();
  }, []);

  const handleTogglePlay = async () => {
    console.log("📣📣📣 [PLAY_BUTTON_TRIGGERED] handleTogglePlay called! Current state -> isPlaying: " + isPlaying + " | currentStepIndexRef: " + currentStepIndexRef.current);
    await Tone.start();
    if (soloPatternPlayIdRef.current !== null) {
      setSoloPatternPlayId(null);
    }
    if (!isPlaying) {
      lastPlayedSignalIdRef.current = null;
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
      console.log("🚀 [AUDIO ENGINE START] Starting audioEngine. Step index ref:", currentStepIndexRef.current);
      audioEngine?.start();
      setIsPlaying(true);
    } else {
      console.log("⏸️ [AUDIO ENGINE STOP] Stopping audioEngine.");
      audioEngine?.stop();
      engineTimeoutsRef.current.forEach(clearTimeout);
      engineTimeoutsRef.current = [];
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

      window.dispatchEvent(new CustomEvent('baquemix-tick', {
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
    engineTimeoutsRef.current.forEach(clearTimeout);
    engineTimeoutsRef.current = [];
    hitTriggersRef.current = [];
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
    window.dispatchEvent(new CustomEvent('baquemix-tick', {
      detail: { step: -1, measure: 0, maxTicks: 16 }
    }));
  };

  const handleStartSoloPattern = async (patternId: number) => {
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
    handleTogglePlay();
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
    window.dispatchEvent(new CustomEvent('baquemix-tick', {
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

  return {
    isPlaying,
    isLoading,
    currentMeasure,
    currentStepIndex,
    setCurrentMeasure,
    setCurrentStepIndex,
    isMetroOn,
    setIsMetroOn,
    isSwingOn,
    setIsSwingOn,
    soloPatternPlayId,
    setSoloPatternPlayId,
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
    hitTriggersRef,
    engineTimeoutsRef,
    lastPlayedSignalIdRef,
    tickScheduleRef
  };
}
