/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../db';
import { channels, masterVolumeNode } from './effectsChain';
import { instrumentsConfig } from '../data';
import { playNativeMetroClick } from './nativeSynths';
import { calculateDeterministicVocalClipMeta } from '../utils/audioBufferUtils';
import { VocalClipMeta } from '../types/store.types';

// Background-immune high-precision worker timer helpers to bypass browser tab throttling
let timerWorker: Worker | null = null;
let nextTimerId = 1;
const pendingCallbacks = new Map<number, () => void>();

function getTimerWorker(): Worker {
  if (typeof window === 'undefined') return null as any;
  if (!timerWorker) {
    const code = `
      let activeTimers = new Map();
      self.onmessage = (e) => {
        const { type, id, delay } = e.data;
        if (type === 'setTimeout') {
          const timerId = setTimeout(() => {
            postMessage({ type: 'timeout', id });
            activeTimers.delete(id);
          }, delay);
          activeTimers.set(id, timerId);
        } else if (type === 'clearTimeout') {
          const timerId = activeTimers.get(id);
          if (timerId !== undefined) {
            clearTimeout(timerId);
            activeTimers.delete(id);
          }
        } else if (type === 'setInterval') {
          const timerId = setInterval(() => {
            postMessage({ type: 'interval', id });
          }, delay);
          activeTimers.set(id, timerId);
        } else if (type === 'clearInterval') {
          const timerId = activeTimers.get(id);
          if (timerId !== undefined) {
            clearInterval(timerId);
            activeTimers.delete(id);
          }
        }
      };
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    timerWorker = new Worker(url);
    URL.revokeObjectURL(url);

    timerWorker.onmessage = (e) => {
      const { type, id } = e.data;
      const callback = pendingCallbacks.get(id);
      if (callback) {
        callback();
        if (type === 'timeout') {
          pendingCallbacks.delete(id);
        }
      }
    };
  }
  return timerWorker;
}

export function workerSetTimeout(callback: () => void, delay: number): number {
  const id = nextTimerId++;
  pendingCallbacks.set(id, callback);
  getTimerWorker().postMessage({ type: 'setTimeout', id, delay });
  return id;
}

export interface ActiveVocal {
  mainPlayer: Tone.GrainPlayer;
  mainGain: Tone.Gain;
  currentBuffer: AudioBuffer | null;
  chorusPlayers: Tone.GrainPlayer[];
  chorusGains: Tone.Gain[];
  panners: Tone.Panner[];
}

// Persistent GrainPlayer instance cache to prevent GC spikes and Web Audio leaks (Safeguard 2)
const activeVocals = new Map<number, ActiveVocal>();

let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let activeScheduledEvents: number[] = [];

function clearScheduledEvents() {
  activeScheduledEvents.forEach((id) => {
    try {
      Tone.Transport.clear(id);
    } catch (_) {}
  });
  activeScheduledEvents = [];
}

export const vocalEngineService = {
  recordingDurationMeasures: 1,
  recordedMeasuresCount: 0,

  /**
   * Helper to scan vocal pattern and find the exact temporal start offset (in seconds)
   * of the first active syllable (either in pre-roll or main grid).
   */
  getPatternFirstNoteOffset(pattern: any, bpm: number): number {
    const beatsPerMeasure = 4;
    const measureDurationSec = (beatsPerMeasure * 60) / bpm;
    
    // 1. Scan Pre-roll (Mesure -1)
    if (pattern.preRollActiveSteps) {
      for (let i = 0; i < 16; i++) {
        const stepVal = pattern.preRollActiveSteps[i];
        if (stepVal && stepVal !== 0 && stepVal !== '0') {
          const stepDurationPreRoll = measureDurationSec / 16;
          return -measureDurationSec + (i * stepDurationPreRoll);
        }
      }
    }
    
    // 2. Scan main measure grid
    if (pattern.activeSteps) {
      const steps = pattern.steps || 16;
      for (let j = 0; j < steps; j++) {
        const stepVal = pattern.activeSteps[j];
        if (stepVal && stepVal !== 0 && stepVal !== '0') {
          const stepDurationMain = measureDurationSec / steps;
          return j * stepDurationMain;
        }
      }
    }
    
    return 0;
  },

  /**
   * Pattern-First deterministic recording workflow asservi à Tone.Transport:
   * 1. Mode focus activé immédiatement pour isoler le CPU audio.
   * 2. Count-in de 4 temps au métronome.
   * 3. Micro activé dès le début du pre-roll (Temps 0) pour capturer l'anacrouse.
   * 4. Punch-in du motif au Temps 4 (1ère mesure utile).
   * 5. Arrêt automatique déterministe à fin du motif + 1.5s de résonance.
   * 6. Libération matérielle stricte du micro (Safeguard 3).
   */
  async startRecording(
    patternId: number,
    options: {
      onStartSequencer?: () => void;
      onRecordingStopped?: (blob: Blob) => void;
      onError?: (err: Error) => void;
      deviceId?: string;
      immediate?: boolean;
    } = {}
  ) {
    const numPatternId = Number(patternId);
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const bpm = sequencerStore.bpm;

    // Reset scheduled Transport events
    this.cleanupTimers();

    // Mode Focus immédiat pour alléger le rendu et isoler le CPU
    store.setIsFocusRecordingMode(true);
    store.setRecordingStatus(options.immediate ? 'recording' : 'arming');
    store.setTargetPatternId(numPatternId);
    recordedChunks = [];

    try {
      const targetDeviceId = options.deviceId || store.selectedDeviceId;

      // Request raw, unadulterated microphone stream
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: targetDeviceId ? {
          deviceId: { exact: targetDeviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } : {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaRecorder = new MediaRecorder(audioStream, {
        audioBitsPerSecond: 96000,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(recordedChunks, {
            type: mediaRecorder?.mimeType || 'audio/webm',
          });

          // Store temporary recording in store for validation modal
          useAudioStore.getState().setTempRecording({ patternId: numPatternId, blob });

          if (options.onRecordingStopped) {
            options.onRecordingStopped(blob);
          }
        } catch (err: any) {
          console.error("🎙️ [VOCAL ENGINE] Error on media recorder stop:", err);
          if (options.onError) options.onError(err);
        } finally {
          // Safeguard 3: Strict hardware microphone stream release
          this.cleanupMedia();
          store.setRecordingStatus('inactive');
          store.setTargetPatternId(null);
          store.setIsFocusRecordingMode(false);
        }
      };

      // Find target pattern
      const tracks = sequencerStore.tracks;
      const voiceTrack = tracks.find(t => t.patterns.some(p => Number(p.id) === numPatternId));
      const targetPattern = voiceTrack?.patterns.find(p => Number(p.id) === numPatternId);

      if (!targetPattern || !voiceTrack) {
        throw new Error("Target pattern or voice track not found");
      }

      // Calculate duration of the pattern (in measures)
      const initialMeasureIdx = targetPattern.measureAssignments.indexOf(true) !== -1 
        ? targetPattern.measureAssignments.indexOf(true) 
        : 0;

      let consecutiveMeasures = 0;
      for (let i = initialMeasureIdx; i < sequencerStore.totalMeasures; i++) {
        if (targetPattern.measureAssignments[i]) {
          consecutiveMeasures++;
        } else {
          break;
        }
      }
      consecutiveMeasures = Math.max(1, consecutiveMeasures);

      const targetMeasureBpm = sequencerStore.measureBpms[initialMeasureIdx % (sequencerStore.measureBpms.length || 1)] || bpm;
      const beatDurationSec = 60 / targetMeasureBpm;
      const countInDurationSec = 4 * beatDurationSec; // Exactly 1 measure pre-roll (4 beats)
      const patternDurationSec = consecutiveMeasures * 4 * beatDurationSec;
      const resonanceTailSec = 1.5; // 1.5s natural decay margin

      if (options.immediate) {
        if (mediaRecorder && mediaRecorder.state === 'inactive') {
          mediaRecorder.start();
          store.setRecordingStartTimelineSec(Tone.Transport.seconds);
          store.setRecordingStatus('recording');
        }
      } else {
        // Pattern-First: Start count-in at Transport position 0 for absolute temporal predictability
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        clearScheduledEvents();

        // Count-in Beat 1: Start MediaRecorder IMMEDIATELY at T=0 to capture early anacrusis
        const idB1 = Tone.Transport.schedule((time) => {
          store.setRecordingStatus('countdown');
          playNativeMetroClick(time, true, 'synth', 0.85);

          if (mediaRecorder && mediaRecorder.state === 'inactive') {
            try {
              mediaRecorder.start();
            } catch (e) {
              console.error("🎙️ [VOCAL ENGINE] Error starting MediaRecorder at count-in:", e);
            }
          }
        }, 0);

        // Count-in Beat 2
        const idB2 = Tone.Transport.schedule((time) => {
          playNativeMetroClick(time, false, 'synth', 0.5);
        }, 1 * beatDurationSec);

        // Count-in Beat 3
        const idB3 = Tone.Transport.schedule((time) => {
          playNativeMetroClick(time, false, 'synth', 0.5);
        }, 2 * beatDurationSec);

        // Count-in Beat 4
        const idB4 = Tone.Transport.schedule((time) => {
          playNativeMetroClick(time, false, 'synth', 0.5);
        }, 3 * beatDurationSec);

        // Pattern Start (Temps 1): T = countInDurationSec
        const idPunchIn = Tone.Transport.schedule((time) => {
          store.setRecordingStartTimelineSec(time);
          store.setRecordingStatus('recording');

          // Launch backing track (Roda) if requested
          if (options.onStartSequencer) {
            options.onStartSequencer();
          }
        }, countInDurationSec);

        // Punch-Out: T = countInDurationSec + patternDurationSec + resonanceTailSec
        const stopTimeSec = countInDurationSec + patternDurationSec + resonanceTailSec;
        const idPunchOut = Tone.Transport.schedule(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
              mediaRecorder.stop();
            } catch (e) {
              console.error("🎙️ [VOCAL ENGINE] Error stopping MediaRecorder at Punch-out:", e);
            }
          }
          Tone.Transport.stop();
          store.setRecordingStatus('inactive');
          store.setIsFocusRecordingMode(false);
        }, stopTimeSec);

        activeScheduledEvents.push(idB1, idB2, idB3, idB4, idPunchIn, idPunchOut);
        Tone.Transport.start(undefined, 0);
      }
    } catch (err: any) {
      console.error("🎙️ [VOCAL ENGINE] Error in startRecording:", err);
      this.cleanupTimers();
      this.cleanupMedia();
      store.setRecordingStatus('inactive');
      store.setTargetPatternId(null);
      store.setIsFocusRecordingMode(false);
      if (options.onError) options.onError(err);
    }
  },

  /**
   * Stops the active recording process immediately and releases hardware mic stream.
   */
  stopRecording() {
    this.cleanupTimers();
    Tone.Transport.stop();
    const store = useAudioStore.getState();
    store.setRecordingStatus('inactive');
    store.setTargetPatternId(null);
    store.setIsFocusRecordingMode(false);

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (err) {
        console.error("🎙️ [VOCAL ENGINE] Error stopping media recorder:", err);
      }
    }
    this.cleanupMedia();
  },

  cleanupTimers() {
    clearScheduledEvents();
  },

  /**
   * Safeguard 3: Strict hardware microphone stream release.
   * Ensures browser recording indicator light turns off immediately.
   */
  cleanupMedia() {
    if (audioStream) {
      try {
        audioStream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (_) {}
      audioStream = null;
    }
    mediaRecorder = null;
  },

  /**
   * Loads a vocal recording from IndexedDB and pre-decodes it into RAM.
   */
  async loadVocalRecording(patternId: number): Promise<Blob | null> {
    try {
      const blob = await getVocalRecording(patternId);
      if (blob) {
        useAudioStore.getState().addVocalBlob(patternId, blob);
        
        // Zero-latency RAM pre-decode
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const rawCtx = Tone.getContext().rawContext as AudioContext;
          const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
          useAudioStore.getState().setVocalBuffer(patternId, audioBuffer);
        } catch (decErr) {
          console.error(`Failed to pre-decode vocal recording for pattern ${patternId}:`, decErr);
        }

        return blob;
      }
    } catch (err) {
      console.error(`Failed to load vocal recording for pattern ${patternId}:`, err);
    }
    return null;
  },

  /**
   * Deletes a vocal recording from IndexedDB and RAM, and cleans up audio nodes.
   */
  async deleteVocalRecording(patternId: number) {
    try {
      await deleteVocalRecording(patternId);
      useAudioStore.getState().removeVocalBlob(patternId);
      useAudioStore.getState().removeVocalBuffer(patternId);
      this.disposeVocalPlayer(patternId);

      // Reset pattern vocalMode to 'synth' in sequencer store
      const sequencerStore = useSequencerStore.getState();
      const tracks = sequencerStore.tracks;
      const newTracks = tracks.map((t) => {
        const hasPattern = t.patterns.some((p) => Number(p.id) === Number(patternId));
        if (hasPattern) {
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (Number(p.id) === Number(patternId)) {
                return {
                  ...p,
                  vocalMode: 'synth',
                  vocalClip: undefined,
                  vocalNudge: 0,
                  vocalTrimStart: 0,
                  vocalBaseBpm: undefined,
                  vocalBpmSync: undefined
                } as any;
              }
              return p;
            })
          };
        }
        return t;
      });
      sequencerStore.setTracks(newTracks);
    } catch (err) {
      console.error(`Failed to delete vocal recording for pattern ${patternId}:`, err);
    }
  },

  /**
   * Safeguard 2: Reusable Tone.GrainPlayer instance cache.
   * Prevents node recreation and memory churn on high frequency iterations.
   */
  getOrCreateVocalPlayer(patternId: number, audioBuffer: AudioBuffer, outputNode: any): ActiveVocal {
    let entry = activeVocals.get(patternId);

    if (entry) {
      // Re-use existing player and update buffer if modified
      if (entry.currentBuffer !== audioBuffer) {
        entry.mainPlayer.buffer.set(audioBuffer);
        entry.currentBuffer = audioBuffer;
      }
      return entry;
    }

    // Allocate once and persist
    const mainPlayer = new Tone.GrainPlayer(audioBuffer);
    mainPlayer.grainSize = 0.09;
    mainPlayer.overlap = 0.04;
    mainPlayer.volume.value = 0; // Unity gain

    const mainGain = new Tone.Gain(1);
    mainPlayer.connect(mainGain);
    mainGain.connect(outputNode || masterVolumeNode || Tone.Destination);

    entry = {
      mainPlayer,
      mainGain,
      currentBuffer: audioBuffer,
      chorusPlayers: [],
      chorusGains: [],
      panners: []
    };

    activeVocals.set(patternId, entry);
    return entry;
  },

  /**
   * Safely stops and disposes a cached vocal player instance.
   */
  disposeVocalPlayer(patternId: number) {
    const entry = activeVocals.get(patternId);
    if (entry) {
      try { entry.mainPlayer.stop(); entry.mainPlayer.dispose(); } catch (_) {}
      try { entry.mainGain.disconnect(); entry.mainGain.dispose(); } catch (_) {}
      entry.chorusPlayers.forEach(p => { try { p.stop(); p.dispose(); } catch (_) {} });
      entry.chorusGains.forEach(g => { try { g.disconnect(); g.dispose(); } catch (_) {} });
      entry.panners.forEach(pan => { try { pan.disconnect(); pan.dispose(); } catch (_) {} });
      activeVocals.delete(patternId);
    }
  },

  /**
   * Stops playback of a pattern without disposing the persistent player instance.
   */
  stopVocalPattern(patternId: number) {
    const entry = activeVocals.get(patternId);
    if (entry) {
      try {
        entry.mainPlayer.stop();
      } catch (_) {}
      entry.chorusPlayers.forEach(p => {
        try { p.stop(); } catch (_) {}
      });
    }
  },

  /**
   * Stops all active vocal playback.
   */
  stopAllVocalPlayback() {
    Array.from(activeVocals.keys()).forEach(id => this.stopVocalPattern(id));
  },

  /**
   * Saves a validated recording to IndexedDB and registers it in the store.
   */
  async saveValidatedRecording(patternId: number, blob: Blob) {
    await saveVocalRecording(patternId, blob);
    useAudioStore.getState().addVocalBlob(patternId, blob);
  },

  /**
   * Plays a vocal pattern locally (for preview or solo auditioning).
   */
  async playVocalPattern(patternId: number, time: number, onStop?: () => void) {
    const store = useAudioStore.getState();
    let audioBuffer = store.vocalBuffers[patternId];
    if (!audioBuffer) {
      const blob = store.vocalBlobs[patternId] || await this.loadVocalRecording(patternId);
      if (!blob) return;
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const rawCtx = Tone.getContext().rawContext as AudioContext;
        audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
        store.setVocalBuffer(patternId, audioBuffer);
      } catch (err) {
        console.error(`Error decoding vocal blob for pattern ${patternId}:`, err);
        return;
      }
    }

    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = sequencerStore.tracks.find(t => t.patterns.some(p => Number(p.id) === Number(patternId)));
    const outputNode = (voiceTrack && channels[voiceTrack.id]) || masterVolumeNode || Tone.Destination;
    const trackVolPct = voiceTrack ? (voiceTrack.volumeVal ?? 100) : 100;
    const isCoro = voiceTrack ? instrumentsConfig[voiceTrack.instrumentIdx]?.id === 'coro' : false;

    this.playSequencerVocal(patternId, time, sequencerStore.bpm, outputNode, trackVolPct, isCoro, onStop);
  },

  /**
   * Plays a vocal pattern aligned with the sequencer timeline.
   * Implements:
   * - Safeguard 1: triggerTime = measureStartTime - anacrusisSec + nudgeSec, with Measure 0 clamping and internal buffer offset advance.
   * - Safeguard 2: Tone.GrainPlayer instance reuse.
   * - Time-stretching: player.playbackRate = currentBpm / clipMeta.baseBpm.
   */
  playSequencerVocal(
    patternId: number,
    measureStartTime: number,
    currentBpm: number,
    outputNode: any,
    trackVolPct: number,
    isCoroTrack: boolean,
    onStop?: () => void
  ) {
    const store = useAudioStore.getState();
    const audioBuffer = store.vocalBuffers[patternId];
    if (!audioBuffer) return null;

    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = sequencerStore.tracks.find(t => t.patterns.some(p => Number(p.id) === Number(patternId)));
    const ptnRef = voiceTrack?.patterns.find(p => Number(p.id) === Number(patternId));
    const clip = ptnRef?.vocalClip;

    // Retrieve or recycle persistent player (Safeguard 2)
    const activeEntry = this.getOrCreateVocalPlayer(patternId, audioBuffer, outputNode);
    const mainPlayer = activeEntry.mainPlayer;
    const mainGain = activeEntry.mainGain;

    // 1. Time-stretching calculation
    const baseBpm = clip?.baseBpm || ptnRef?.vocalBaseBpm || currentBpm;
    const playbackRate = currentBpm / baseBpm;
    mainPlayer.playbackRate = playbackRate;

    // 2. Safeguard 1: Mathématique de l'Anacrouse & Sécurité Mesure 0
    const beatDurationSec = 60 / currentBpm;
    const anacrusisBeats = clip?.anacrusisBeats ?? 0;
    const anacrusisSec = anacrusisBeats * beatDurationSec;
    const nudgeSec = (clip?.nudgeMs ?? (ptnRef?.vocalNudge ?? 0)) / 1000;

    // Convention de signe stricte : anacrouse se déclenche AVANT le temps 1
    const rawTriggerTime = measureStartTime - anacrusisSec + nudgeSec;
    const now = Tone.context.currentTime;
    const bufferDuration = audioBuffer.duration;

    let actualStartPlayTime = rawTriggerTime;
    let internalBufferOffset = 0;

    // Cas limite Mesure 0 : si rawTriggerTime < 0, bride à 0 et compense l'offset
    if (rawTriggerTime < 0) {
      actualStartPlayTime = 0;
      const clippedSec = -rawTriggerTime;
      internalBufferOffset = clippedSec * playbackRate;
    } else if (rawTriggerTime < now) {
      // Late join compensation if playback started mid-measure
      actualStartPlayTime = now;
      const lateSec = now - rawTriggerTime;
      internalBufferOffset = lateSec * playbackRate;
    }

    const remainingDuration = Math.max(0, bufferDuration - internalBufferOffset);

    if (remainingDuration <= 0) {
      return null;
    }

    // Stop previous playback on this player
    try {
      mainPlayer.stop();
    } catch (_) {}

    // Track volume gain
    const baseGainLinear = Math.pow(trackVolPct / 100, 2);
    mainGain.gain.setValueAtTime(baseGainLinear, actualStartPlayTime);

    // Trigger GrainPlayer with offset and duration
    mainPlayer.start(actualStartPlayTime, internalBufferOffset, remainingDuration);

    if (onStop) {
      mainPlayer.onstop = () => {
        onStop();
      };
    }

    return {
      mainPlayer,
      stop: () => {
        try { mainPlayer.stop(); } catch (_) {}
      }
    };
  }
};
