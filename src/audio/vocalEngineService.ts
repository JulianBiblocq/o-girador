/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
export { useAudioStore, useSequencerStore };
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../db';
import { channels, masterVolumeNode } from './effectsChain';
import { instrumentsConfig } from '../data';
import { playNativeMetroClick, playCountInBeep } from './nativeSynths';
import { calculateDeterministicVocalClipMeta } from '../utils/audioBufferUtils';
import { VocalClipMeta } from '../types/store.types';
import { getBeatsPerMeasure } from '../utils/measureHelpers';

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

export function workerClearTimeout(id: number) {
  pendingCallbacks.delete(id);
  const worker = getTimerWorker();
  if (worker) {
    worker.postMessage({ type: 'clearTimeout', id });
  }
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
let activeTimeoutIds: number[] = [];
let isPunchingOut = false;
let activeTargetPatternId: number | null = null;
let activeTargetMeasure: number | null = null;

function clearScheduledEvents() {
  activeScheduledEvents.forEach((id) => {
    try {
      Tone.Transport.clear(id);
    } catch (_) {}
  });
  activeScheduledEvents = [];
  activeTimeoutIds.forEach((id) => {
    try {
      workerClearTimeout(id);
      clearTimeout(id);
    } catch (_) {}
  });
  activeTimeoutIds = [];
}

export const vocalEngineService = {
  isArming: false,
  get mediaRecorder(): MediaRecorder | null {
    return mediaRecorder;
  },
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

  get isPunchingOut(): boolean {
    return isPunchingOut;
  },

  /**
   * Pre-warms and arms the hardware microphone and MediaRecorder instance.
   * Ensures zero latency when punch-in is triggered at step 0.
   */
  async armRecording(
    patternId: number,
    targetMeasure: number,
    options: {
      deviceId?: string;
      onError?: (err: Error) => void;
      onRecordingStopped?: (blob: Blob) => void;
    } = {}
  ): Promise<boolean> {
    if (this.isArming) return false;
    const numPatternId = Number(patternId);
    activeTargetPatternId = numPatternId;
    activeTargetMeasure = targetMeasure;

    const store = useAudioStore.getState();
    store.setTargetPatternId(numPatternId);
    store.setTargetMeasureIdx(targetMeasure);
    store.setRecordingStatus('arming');

    // If mediaRecorder is already created and stream active, we are ready!
    if (mediaRecorder && audioStream && audioStream.active) {
      return true;
    }

    this.isArming = true;
    try {
      if (Tone.context && Tone.context.state !== 'running') {
        try { await Tone.context.resume(); } catch (_) {}
      }
      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      if (rawCtx && rawCtx.state !== 'running') {
        try { await rawCtx.resume(); } catch (_) {}
      }

      const targetDeviceId = options.deviceId || store.selectedDeviceId;
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

      recordedChunks = [];
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
          const targetPid = activeTargetPatternId || numPatternId;
          useAudioStore.getState().setTempRecording({ patternId: targetPid, blob });
          if (options.onRecordingStopped) {
            options.onRecordingStopped(blob);
          }
        } catch (err: any) {
          console.error("🎙️ [VOCAL ENGINE] Error on media recorder stop:", err);
          if (options.onError) options.onError(err);
        } finally {
          this.cleanupMedia();
          const s = useAudioStore.getState();
          s.setRecordingStatus('inactive');
          s.setTargetPatternId(null);
          s.setIsFocusRecordingMode(false);
          isPunchingOut = false;
        }
      };

      this.isArming = false;
      return true;
    } catch (err: any) {
      this.isArming = false;
      console.error("🎙️ [VOCAL ENGINE] Error arming recording:", err);
      this.cleanupMedia();
      store.setRecordingStatus('inactive');
      store.setTargetPatternId(null);
      store.setIsFocusRecordingMode(false);
      if (options.onError) options.onError(err);
      return false;
    }
  },

  /**
   * Starts recording silently and immediately on the hardware MediaRecorder.
   */
  punchIn(patternId?: number, targetMeasure?: number) {
    if (patternId !== undefined) activeTargetPatternId = Number(patternId);
    if (targetMeasure !== undefined) activeTargetMeasure = targetMeasure;

    const store = useAudioStore.getState();
    store.setIsFocusRecordingMode(true);
    store.setRecordingStatus('recording');
    store.setRecordingStartTimelineSec(Tone.Transport.seconds);

    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      try {
        mediaRecorder.start();
        console.log("🎙️ [VOCAL ENGINE] Punch-in MediaRecorder started silently at measure", targetMeasure);
      } catch (e) {
        console.error("🎙️ [VOCAL ENGINE] Error starting MediaRecorder at punch-in:", e);
      }
    }
  },

  /**
   * Schedules a deterministic punch-out after a specified tail duration (+0.8s).
   */
  schedulePunchOut(tailSec: number = 0.8, onStopPlayback?: () => void) {
    if (isPunchingOut) return;
    isPunchingOut = true;

    const safetyTimeoutMs = Math.ceil(tailSec * 1000);
    const timerId = workerSetTimeout(() => {
      if (onStopPlayback) {
        try { onStopPlayback(); } catch (_) {}
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (e) {
          console.error("🎙️ [VOCAL ENGINE] Error stopping MediaRecorder at punch-out:", e);
        }
      }
      try { Tone.Transport.stop(); } catch (_) {}
      const store = useAudioStore.getState();
      store.setRecordingStatus('inactive');
      store.setIsFocusRecordingMode(false);
    }, safetyTimeoutMs);

    activeTimeoutIds.push(timerId);
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
  /**
   * 2-Measure Punch-in Recording Workflow with edge-case handling for M < 2:
   * - M >= 2: Play starts at M - 2 (Bateria only). Punch-in silent at M - 1 step 0. Chant at M. Punch-out at M + 0.8s.
   * - M = 1: Play starts at M = 0 with immediate punch-in. Chant at M = 1. Punch-out at M = 1 + 0.8s.
   * - M = 0: 1-measure count-in (pre-roll 4 beeps) with mic open from count-in (T = 0).
   */
  async startRecording(
    patternId: number,
    options: {
      targetMeasure?: number;
      onStartSequencer?: (targetMeasure?: number) => void;
      onStopSequencer?: () => void;
      onRecordingStopped?: (blob: Blob) => void;
      onError?: (err: Error) => void;
      deviceId?: string;
      immediate?: boolean;
    } = {}
  ) {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const numPatternId = Number(patternId);

    const tracks = sequencerStore.tracks;
    const voiceTrack = tracks.find(t => t.patterns?.some(p => Number(p.id) === numPatternId));
    const targetPattern = voiceTrack?.patterns?.find(p => Number(p.id) === numPatternId);
    const initialMeasureIdx = targetPattern?.measureAssignments.indexOf(true) ?? 0;

    const M = options.targetMeasure !== undefined
      ? options.targetMeasure
      : (store.targetMeasureIdx !== null ? store.targetMeasureIdx : (initialMeasureIdx !== -1 ? initialMeasureIdx : 0));

    // Reset previous scheduled events
    this.cleanupTimers();

    const armed = await this.armRecording(numPatternId, M, {
      deviceId: options.deviceId,
      onError: options.onError,
      onRecordingStopped: options.onRecordingStopped,
    });
    if (!armed && !mediaRecorder) {
      return;
    }

    if (options.immediate) {
      this.punchIn(numPatternId, M);
      return;
    }

    // 🛡️ Edge-cases M < 2
    if (M >= 2) {
      // 1. Nominal workflow: Launch playback at M - 2 with skipPreRoll: true
      const startMeasure = M - 2;
      if (options.onStartSequencer) {
        options.onStartSequencer(startMeasure);
      }
    } else if (M === 1) {
      // 2. M = 1: Launch playback at M = 0 with immediate punch-in at M = 0
      this.punchIn(numPatternId, M);
      if (options.onStartSequencer) {
        options.onStartSequencer(0);
      }
    } else {
      // 3. M = 0: Fallback on 1 measure of classic metronome count-in (pre-roll 4 beeps)
      // with microphone open from count-in (T = 0)
      const targetBpm = (sequencerStore.measureBpms && sequencerStore.measureBpms[0] > 0)
        ? sequencerStore.measureBpms[0]
        : (sequencerStore.bpm || 100);
      const targetTimeSig = (sequencerStore.measureTimeSigs && sequencerStore.measureTimeSigs[0]) || '4/4';
      const beatsCount = getBeatsPerMeasure(targetTimeSig);
      const isCompound = (targetTimeSig as string) === '6/8' || (targetTimeSig as string) === '9/8' || (targetTimeSig as string) === '12/8';
      const beatDurationSec = isCompound ? (90 / targetBpm) : (60 / targetBpm);
      const preRollDurationSec = beatsCount * beatDurationSec;

      Tone.Transport.stop();
      Tone.Transport.position = 0;
      clearScheduledEvents();

      for (let b = 0; b < beatsCount; b++) {
        const isDownbeat = b === 0;
        const idB = Tone.Transport.schedule((time) => {
          if (isDownbeat) {
            store.setRecordingStatus('countdown');
            if (mediaRecorder && mediaRecorder.state === 'inactive') {
              try { mediaRecorder.start(); } catch (e) {
                console.error("🎙️ [VOCAL ENGINE] Error starting MediaRecorder at count-in:", e);
              }
            }
          }
          playCountInBeep(time, isDownbeat ? 1200 : 800, isDownbeat);
        }, b * beatDurationSec);
        activeScheduledEvents.push(idB);
      }

      const idPunchIn = Tone.Transport.schedule((time) => {
        store.setRecordingStartTimelineSec(time);
        store.setRecordingStatus('recording');
        if (options.onStartSequencer) {
          options.onStartSequencer(0);
        }
      }, preRollDurationSec);
      activeScheduledEvents.push(idPunchIn);

      const patternDurationSec = beatsCount * beatDurationSec;
      const totalCaptureSec = preRollDurationSec + patternDurationSec + 0.8;
      const idPunchOut = Tone.Transport.schedule(() => {
        this.schedulePunchOut(0, options.onStopSequencer);
      }, totalCaptureSec);
      activeScheduledEvents.push(idPunchOut);

      Tone.Transport.start(undefined, 0);
    }
  },

  /**
   * Stops the active recording process immediately and releases hardware mic stream.
   */
  stopRecording() {
    if (isPunchingOut) return;

    this.isArming = false;
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
    isPunchingOut = false;
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

    // Détermination du BPM d'ancrage effectif de la mesure assignée
    const ptnRef = voiceTrack?.patterns.find(p => Number(p.id) === Number(patternId));
    const initialMeasureIdx = ptnRef?.measureAssignments?.indexOf(true) !== -1 
      ? (ptnRef?.measureAssignments?.indexOf(true) ?? 0) 
      : 0;
    const anchorBpm = sequencerStore.measureBpms[initialMeasureIdx % (sequencerStore.measureBpms.length || 1)] || sequencerStore.bpm;

    const beatDurationSec = 60 / anchorBpm;
    const anacrusisBeats = ptnRef?.vocalClip?.anacrusisBeats ?? 0;
    const anacrusisSec = anacrusisBeats * beatDurationSec;
    const nudgeMs = ptnRef?.vocalClip?.nudgeMs ?? (ptnRef?.vocalNudge ?? 0);

    // En écoute solo (pré-écoute), décaler le trigger pour que le sample démarre dès l'offset 0 à l'instant 'time'
    const previewTime = time + anacrusisSec - (nudgeMs / 1000);

    this.playSequencerVocal(patternId, previewTime, anchorBpm, outputNode, trackVolPct, isCoro, onStop);
  },

  /**
   * Plays a vocal pattern aligned with the sequencer timeline.
   * Directives de calage strictes (Suppression du conflit de double rognage) :
   * 1. L'offset interne de lecture est strictement 0 par défaut (player.start(triggerTime, 0)).
   * 2. Le calage musical est uniquement géré par triggerTime = measureStartTime - anacrusisSec + (nudgeMs / 1000).
   * 3. Cas limite Mesure 0 absolue (triggerTime < 0) :
   *    internalBufferOffset = (-triggerTime) * playbackRate
   *    player.start(actualTime, internalBufferOffset)
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

    // Détermination du BPM effectif de la mesure d'ancrage
    const initialMeasureIdx = ptnRef?.measureAssignments?.indexOf(true) !== -1 
      ? (ptnRef?.measureAssignments?.indexOf(true) ?? 0) 
      : 0;
    const anchorMeasureBpm = sequencerStore.measureBpms[initialMeasureIdx % (sequencerStore.measureBpms.length || 1)] || sequencerStore.bpm;
    const effectiveBpm = currentBpm || anchorMeasureBpm;

    // Retrieve or recycle persistent player (Safeguard 2)
    const activeEntry = this.getOrCreateVocalPlayer(patternId, audioBuffer, outputNode);
    const mainPlayer = activeEntry.mainPlayer;
    const mainGain = activeEntry.mainGain;

    // 1. Time-stretching calculation
    const baseBpm = clip?.baseBpm || ptnRef?.vocalBaseBpm || anchorMeasureBpm;
    const playbackRate = effectiveBpm / baseBpm;
    mainPlayer.playbackRate = playbackRate;

    // 2. Mathématique de l'Anacrouse basée sur le BPM effectif de la mesure
    const beatDurationSec = 60 / effectiveBpm;
    const anacrusisBeats = clip?.anacrusisBeats ?? 0;
    const anacrusisSec = anacrusisBeats * beatDurationSec;
    const nudgeMs = clip?.nudgeMs ?? (ptnRef?.vocalNudge ?? 0);

    // Calcul de l'instant de déclenchement sur la timeline
    const triggerTime = measureStartTime - anacrusisSec + (nudgeMs / 1000);
    const bufferDuration = audioBuffer.duration;

    // Stop previous playback on this player
    try {
      mainPlayer.stop();
    } catch (_) {}

    // Track volume gain
    const baseGainLinear = Math.pow(trackVolPct / 100, 2);

    // 1. L'offset interne de lecture doit être 0 par défaut :
    //    Le buffer stocké dans vocalBuffers[patternId] étant déjà physiquement rogné,
    //    on ne saute aucun échantillon à l'intérieur du buffer (player.start(triggerTime, 0)).
    // 2. Le calage musical est uniquement géré par le moment de déclenchement (triggerTime).
    // 3. Cas limite de l'anacrouse sur la mesure 0 absolue (triggerTime < 0) :
    //    Uniquement si triggerTime < 0 (impossible de planifier dans le passé) :
    //    - Déclencher à actualTime (measureStartTime ou 0).
    //    - Appliquer exceptionnellement l'offset interne compensé :
    //      internalBufferOffset = (-triggerTime) * playbackRate
    if (triggerTime >= 0) {
      mainGain.gain.setValueAtTime(baseGainLinear, triggerTime);
      mainPlayer.start(triggerTime, 0);
    } else {
      const internalBufferOffset = (-triggerTime) * playbackRate;
      const remainingDuration = Math.max(0, bufferDuration - internalBufferOffset);
      if (remainingDuration <= 0) {
        return null;
      }
      const actualTime = measureStartTime >= 0 ? measureStartTime : 0;
      mainGain.gain.setValueAtTime(baseGainLinear, actualTime);
      mainPlayer.start(actualTime, internalBufferOffset);
    }

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
