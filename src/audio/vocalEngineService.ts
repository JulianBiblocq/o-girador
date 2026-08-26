import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../db';
import { channels, masterVolumeNode } from './effectsChain';
import { instrumentsConfig } from '../data';
import { playNativeMetroClick } from './nativeSynths';
import { analyzeVocalTransient, calculateVocalClipMeta } from '../utils/audioBufferUtils';
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


interface ActiveVocal {
  mainPlayer: Tone.GrainPlayer;
  mainGain: Tone.Gain;
  chorusPlayers: Tone.GrainPlayer[];
  chorusGains: Tone.Gain[];
  panners: Tone.Panner[];
}

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
    const beatsPerMeasure = 4; // default
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
   * Starts the recording process with Tone.Transport scheduled count-in and punch-in/out.
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

    store.setRecordingStatus(options.immediate ? 'recording' : 'arming');
    store.setTargetPatternId(numPatternId);
    recordedChunks = [];

    try {
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
          this.cleanupMedia();
          store.setRecordingStatus('inactive');
          store.setTargetPatternId(null);
          store.setIsFocusRecordingMode(false);
        }
      };

      // Find target pattern & calculate measure loop duration
      const tracks = sequencerStore.tracks;
      const voiceTrack = tracks.find(t => t.patterns.some(p => Number(p.id) === numPatternId));
      const targetPattern = voiceTrack?.patterns.find(p => Number(p.id) === numPatternId);

      if (!targetPattern || !voiceTrack) {
        throw new Error("Target pattern or voice track not found");
      }

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

      // -------------------------------------------------------------
      // CALCUL DU TEMPS ABSOLU (Gestion des Répétitions & Playlist Linéaire)
      // -------------------------------------------------------------
      let absoluteStartSec = 0;
      const measureBpms = sequencerStore.measureBpms;
      const measureTimeSigs = sequencerStore.measureTimeSigs;

      for (let m = 0; m < initialMeasureIdx; m++) {
        const mIdx = m % (measureBpms.length || 1);
        const mBpm = measureBpms[mIdx] || bpm;
        const timeSig = measureTimeSigs[mIdx] || '4/4';
        const beats = parseInt(timeSig.split('/')[0]) || 4;
        absoluteStartSec += (beats * 60) / mBpm;
      }

      const targetMeasureBpm = measureBpms[initialMeasureIdx % (measureBpms.length || 1)] || bpm;
      const targetBeatDurationSec = 60 / targetMeasureBpm;
      const loopDurationSec = consecutiveMeasures * 4 * targetBeatDurationSec;
      const countInDurationSec = 4 * targetBeatDurationSec;

      let countInStartSec = absoluteStartSec - countInDurationSec;
      let punchInTimeSec = absoluteStartSec;
      let punchOutTimeSec = absoluteStartSec + loopDurationSec;

      // Handle measure 0 start where countInStartSec would be negative
      let transportStartPosSec = countInStartSec;
      if (countInStartSec < 0) {
        transportStartPosSec = 0;
        countInStartSec = 0;
        punchInTimeSec = countInDurationSec;
        punchOutTimeSec = punchInTimeSec + loopDurationSec;
      }



      if (options.immediate) {
        if (mediaRecorder && mediaRecorder.state === 'inactive') {
          try {
            mediaRecorder.start();
            store.setRecordingStartTimelineSec(Tone.Transport.seconds);
            store.setRecordingStatus('recording');
          } catch (e) {
            console.error("Error in immediate recording start:", e);
          }
        }
      } else {
        // Stop current Transport & clear events
        Tone.Transport.stop();
        Tone.Transport.position = transportStartPosSec;
        clearScheduledEvents();

        // -------------------------------------------------------------
        // ÉTAPE B : DECOMPTE (COUNT-IN) 4 TEMPS - DEMARRAGE DU MICRO AU BEAT 1 (PRE-ROLL CAPTURE)
        // -------------------------------------------------------------
        // Beat 1 (Start MediaRecorder immediately for early pre-roll capture)
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
        }, countInStartSec);

        // Beat 2
        const idB2 = Tone.Transport.schedule((time) => {
          playNativeMetroClick(time, false, 'synth', 0.5);
        }, countInStartSec + (1 * targetBeatDurationSec));

        // Beat 3
        const idB3 = Tone.Transport.schedule((time) => {
          playNativeMetroClick(time, false, 'synth', 0.5);
        }, countInStartSec + (2 * targetBeatDurationSec));

        // Beat 4
        const idB4 = Tone.Transport.schedule((time) => {
          playNativeMetroClick(time, false, 'synth', 0.5);
        }, countInStartSec + (3 * targetBeatDurationSec));

        // -------------------------------------------------------------
        // ÉTAPE C : PUNCH-IN VISUEL & DU SEQUENCEUR (START RODA BACKING TRACK)
        // -------------------------------------------------------------
        const idPunchIn = Tone.Transport.schedule((time) => {

          
          store.setRecordingStartTimelineSec(time);
          store.setRecordingStatus('recording');

          // Launch Roda sequencer backing track
          if (options.onStartSequencer) {
            options.onStartSequencer();
          }
        }, punchInTimeSec);

        // -------------------------------------------------------------
        // ÉTAPE D : PUNCH-OUT (STRICT AUTO-STOP RECORDING AT LOOP END)
        // -------------------------------------------------------------
        const idPunchOut = Tone.Transport.schedule((time) => {

          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
              mediaRecorder.stop();
            } catch (e) {
              console.error("🎙️ [VOCAL ENGINE] Error stopping MediaRecorder at Punch-out:", e);
            }
          }
          Tone.Transport.stop();
          store.setRecordingStatus('inactive');
        }, punchOutTimeSec);

        activeScheduledEvents.push(idB1, idB2, idB3, idB4, idPunchIn, idPunchOut);

        // ÉTAPE A : Lancement du Transport Audio au temps d'armement
        Tone.Transport.start(undefined, transportStartPosSec);
      }

    } catch (err: any) {
      console.error("🎙️ [VOCAL ENGINE] Error in startRecording:", err);
      this.cleanupTimers();
      this.cleanupMedia();
      store.setRecordingStatus('inactive');
      store.setTargetPatternId(null);
      if (options.onError) options.onError(err);
    }
  },

  /**
   * Stops the active recording process.
   */
  stopRecording() {

    this.cleanupTimers();
    Tone.Transport.stop();
    const store = useAudioStore.getState();
    store.setRecordingStatus('inactive');
    store.setTargetPatternId(null);
    store.setIsFocusRecordingMode(false);

    if (mediaRecorder) {
      if (mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (err) {
          console.error("🎙️ [VOCAL ENGINE] Error stopping media recorder:", err);
          this.cleanupMedia();
        }
      } else {
        this.cleanupMedia();
      }
    } else {
      this.cleanupMedia();
    }
  },

  cleanupTimers() {
    clearScheduledEvents();
  },

  cleanupMedia() {
    if (audioStream) {
      try {
        audioStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      audioStream = null;
    }
    mediaRecorder = null;
  },

  /**
   * Auto-Trim & Alignment helper (Phase 3):
   * Decodes a recorded Blob, runs transient onset detection with 50ms pre-roll,
   * calculates VocalClipMeta for pattern alignment, and stores the buffer in RAM.
   */
  async processVocalBlobAndCalculateMeta(
    patternId: number,
    blob: Blob
  ): Promise<{ buffer: AudioBuffer; meta: VocalClipMeta } | null> {
    try {
      const sequencerStore = useSequencerStore.getState();
      const bpm = sequencerStore.bpm;

      const voiceTrack = sequencerStore.tracks.find((t) =>
        t.patterns.some((p) => Number(p.id) === Number(patternId))
      );
      const targetPattern = voiceTrack?.patterns.find(
        (p) => Number(p.id) === Number(patternId)
      );

      if (!targetPattern) {
        throw new Error(`Target pattern ${patternId} not found`);
      }

      const arrayBuffer = await blob.arrayBuffer();
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

      // Save decoded buffer in store for instant playback
      useAudioStore.getState().addVocalBuffer(patternId, audioBuffer);

      const initialMeasureIdx = targetPattern.measureAssignments.indexOf(true) !== -1
        ? targetPattern.measureAssignments.indexOf(true)
        : 0;

      const startMeasureIdx = Math.max(0, initialMeasureIdx - 1);
      const getElapsedSeconds = (mCount: number) => {
        let secs = 0;
        for (let i = 0; i < mCount; i++) {
          const mIdx = i % (sequencerStore.measureBpms.length || 1);
          const mBpm = sequencerStore.measureBpms[mIdx] || bpm;
          const timeSig = sequencerStore.measureTimeSigs[mIdx] || '4/4';
          const beats = parseInt(timeSig.split('/')[0]) || 4;
          secs += (beats * 60) / mBpm;
        }
        return secs;
      };

      const recordingStartTimelineSec = useAudioStore.getState().recordingStartTimelineSec;
      const recordingStartSec = recordingStartTimelineSec ?? getElapsedSeconds(startMeasureIdx);
      const preRollDurationSec = getElapsedSeconds(initialMeasureIdx) - recordingStartSec;

      const firstNoteOffsetSec = this.getPatternFirstNoteOffset(targetPattern, bpm);
      const meta = calculateVocalClipMeta(audioBuffer, firstNoteOffsetSec, preRollDurationSec, bpm);


      return { buffer: audioBuffer, meta };
    } catch (err) {
      console.error(`🎙️ [VOCAL ENGINE] Erreur lors du calcul Auto-Trim pour le pattern ${patternId}:`, err);
      return null;
    }
  },

  /**
   * Loads a vocal recording from IndexedDB and registers it in the store.
   */
  async loadVocalRecording(patternId: number): Promise<Blob | null> {
    try {
      const blob = await getVocalRecording(patternId);
      if (blob) {
        useAudioStore.getState().addVocalBlob(patternId, blob);
        
        // Pre-decode blob to AudioBuffer in RAM for zero-latency playback
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const rawCtx = Tone.getContext().rawContext as AudioContext;
          const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
          useAudioStore.getState().addVocalBuffer(patternId, audioBuffer);
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

  async deleteVocalRecording(patternId: number) {
    try {
      await deleteVocalRecording(patternId);
      useAudioStore.getState().removeVocalBlob(patternId);
      useAudioStore.getState().removeVocalBuffer(patternId);
      this.stopVocalPattern(patternId);

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

  async playVocalPattern(patternId: number, time: number, onStop?: () => void) {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    
    // Choke existing playback for this pattern if any
    this.stopVocalPattern(patternId);

    let audioBuffer = store.vocalBuffers[patternId];
    if (!audioBuffer) {
      let blob = store.vocalBlobs[patternId];
      if (!blob) {
        blob = await this.loadVocalRecording(patternId) || undefined;
      }
      if (!blob) return;

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const rawCtx = Tone.getContext().rawContext as AudioContext;
        audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
        store.addVocalBuffer(patternId, audioBuffer);
      } catch (err) {
        console.error(`🎙️ [VOCAL DEBUG] Error decoding vocal blob for pattern ${patternId}:`, err);
        return;
      }
    }

    try {
      const tracks = sequencerStore.tracks;
      const voiceTrack = tracks.find(t => t.patterns.some(p => Number(p.id) === Number(patternId)));
      const outputNode = (voiceTrack && channels[voiceTrack.id]) || masterVolumeNode || Tone.Destination;

      const trackVolPct = voiceTrack ? (voiceTrack.volumeVal ?? 100) : 100;
      const baseGain = Math.pow(trackVolPct / 100, 2);

      // Main vocal player
      const mainPlayer = new Tone.GrainPlayer(audioBuffer);
      mainPlayer.grainSize = 0.09;
      mainPlayer.overlap = 0.04;
      mainPlayer.volume.value = 0; // Unity gain (using Tone.Gain for fades)

      const mainGain = new Tone.Gain(1);
      mainPlayer.connect(mainGain);
      mainGain.connect(outputNode as any);

      // Calculate time-stretch playbackRate
      const currentMeasureIdx = sequencerStore.currentMeasure || 0;
      const measureBpm = sequencerStore.measureBpms[currentMeasureIdx] || sequencerStore.bpm;
      
      let ptnRef = voiceTrack?.patterns.find(p => Number(p.id) === Number(patternId));
      
      let playbackRate = 1.0;
      const clip = ptnRef?.vocalClip;
      
      if (clip) {
        if (clip.bpmSync && clip.baseBpm) {
          playbackRate = measureBpm / clip.baseBpm;
        }
      } else if (ptnRef && ptnRef.vocalBpmSync && ptnRef.vocalBaseBpm) {
        playbackRate = measureBpm / ptnRef.vocalBaseBpm;
      }
      mainPlayer.playbackRate = playbackRate;

      // Extract non-destructive alignment parameters
      const offsetStart = clip ? (clip.offsetStart || 0) : ((ptnRef as any)?.vocalTrimStart || 0) / 1000;
      const startTimeDelay = clip ? (clip.startTimeDelay || 0) : ((ptnRef as any)?.vocalNudge || 0) / 1000;
      const offsetEnd = clip && clip.offsetEnd !== undefined ? clip.offsetEnd : audioBuffer.duration;

      const triggerTime = time + startTimeDelay;
      const now = Tone.context.currentTime;

      let startOffset = offsetStart;
      let startPlayTime = triggerTime;

      if (triggerTime < now) {
        const lateJoinSec = now - triggerTime;
        startOffset = offsetStart + lateJoinSec;
        startPlayTime = now;
      }

      const playbackDurationSec = offsetEnd - offsetStart;
      const remainingDuration = Math.max(0, playbackDurationSec - (startOffset - offsetStart));

      // Setup active vocal track tracking
      const activeVocalEntry: ActiveVocal = {
        mainPlayer,
        mainGain,
        chorusPlayers: [],
        chorusGains: [],
        panners: [],
      };

      // Set up main player stop cleanup
      mainPlayer.onstop = () => {
        this.stopVocalPattern(patternId);
        if (onStop) {
          onStop();
        }
      };



      if (remainingDuration > 0) {
        mainPlayer.start(startPlayTime, startOffset, remainingDuration);

        // Schedule smooth fades to avoid pops/clicks, securing start times against web audio engine lookahead blocks
        const baseGainVal = baseGain;
        const fadeStartTime = Math.max(startPlayTime, Tone.context.currentTime);
        mainGain.gain.setValueAtTime(0, fadeStartTime);
        mainGain.gain.linearRampToValueAtTime(baseGainVal, fadeStartTime + 0.01); // 10ms fade-in
        mainGain.gain.setValueAtTime(baseGainVal, fadeStartTime + remainingDuration - 0.03);
        mainGain.gain.linearRampToValueAtTime(0, fadeStartTime + remainingDuration); // 30ms fade-out
      }

      // Guide melody option
      if (store.isVocalGuideEnabled) {
        const guideTime = Math.max(now, triggerTime);
        playNativeMetroClick(guideTime, true, 'synth', 0.5);
      }

      // Chorus/Ensemble effect
      const voiceInst = voiceTrack ? instrumentsConfig[voiceTrack.instrumentIdx] : null;
      const isCoroTrack = voiceInst?.id === 'coro';
      const chorusDensity = isCoroTrack ? store.chorusDensity : 0;
      if (chorusDensity > 0) {
        const panner1 = new Tone.Panner(-0.5);
        const player1 = new Tone.GrainPlayer(audioBuffer);
        player1.grainSize = 0.09;
        player1.overlap = 0.04;
        player1.playbackRate = playbackRate;
        player1.volume.value = 0;

        const chorusGain1 = new Tone.Gain(1);
        player1.connect(chorusGain1);
        chorusGain1.connect(panner1);
        panner1.connect(outputNode as any);
        player1.detune = -8;
        
        let chorister1Time = triggerTime + 0.015;
        let chorister1Offset = offsetStart + 0.015;
        if (chorister1Time < now) {
          const lateSec = now - chorister1Time;
          chorister1Offset = offsetStart + 0.015 + lateSec;
          chorister1Time = now;
        }
        const remainingChorister1 = Math.max(0, playbackDurationSec - (chorister1Offset - offsetStart));
        if (remainingChorister1 > 0) {
          player1.start(chorister1Time, chorister1Offset, remainingChorister1);

          const cGainVal = baseGain * chorusDensity;
          chorusGain1.gain.setValueAtTime(0, chorister1Time);
          chorusGain1.gain.linearRampToValueAtTime(cGainVal, chorister1Time + 0.01);
          chorusGain1.gain.setValueAtTime(cGainVal, chorister1Time + remainingChorister1 - 0.03);
          chorusGain1.gain.linearRampToValueAtTime(0, chorister1Time + remainingChorister1);
        }

        activeVocalEntry.chorusPlayers.push(player1);
        activeVocalEntry.chorusGains.push(chorusGain1);
        activeVocalEntry.panners.push(panner1);

        const panner2 = new Tone.Panner(0.5);
        const player2 = new Tone.GrainPlayer(audioBuffer);
        player2.grainSize = 0.09;
        player2.overlap = 0.04;
        player2.playbackRate = playbackRate;
        player2.volume.value = 0;

        const chorusGain2 = new Tone.Gain(1);
        player2.connect(chorusGain2);
        chorusGain2.connect(panner2);
        panner2.connect(outputNode as any);
        player2.detune = 10;
        
        let chorister2Time = triggerTime + 0.025;
        let chorister2Offset = offsetStart + 0.025;
        if (chorister2Time < now) {
          const lateSec = now - chorister2Time;
          chorister2Offset = offsetStart + 0.025 + lateSec;
          chorister2Time = now;
        }
        const remainingChorister2 = Math.max(0, playbackDurationSec - (chorister2Offset - offsetStart));
        if (remainingChorister2 > 0) {
          player2.start(chorister2Time, chorister2Offset, remainingChorister2);

          const cGainVal = baseGain * chorusDensity;
          chorusGain2.gain.setValueAtTime(0, chorister2Time);
          chorusGain2.gain.linearRampToValueAtTime(cGainVal, chorister2Time + 0.01);
          chorusGain2.gain.setValueAtTime(cGainVal, chorister2Time + remainingChorister2 - 0.03);
          chorusGain2.gain.linearRampToValueAtTime(0, chorister2Time + remainingChorister2);
        }

        activeVocalEntry.chorusPlayers.push(player2);
        activeVocalEntry.chorusGains.push(chorusGain2);
        activeVocalEntry.panners.push(panner2);
      }

      activeVocals.set(patternId, activeVocalEntry);

    } catch (err) {
      console.error(`Error playing vocal pattern ${patternId}:`, err);
    }
  },

  stopVocalPattern(patternId: number) {
    const entry = activeVocals.get(patternId);
    if (entry) {
      try {
        entry.mainPlayer.onstop = null;
        entry.mainPlayer.stop();
        entry.mainPlayer.dispose();
      } catch (_) {}
      try {
        entry.mainGain.disconnect();
        entry.mainGain.dispose();
      } catch (_) {}

      entry.chorusPlayers.forEach(p => {
        try { p.stop(); p.dispose(); } catch (_) {}
      });
      entry.chorusGains.forEach(g => {
        try { g.disconnect(); g.dispose(); } catch (_) {}
      });
      entry.panners.forEach(pan => {
        try { pan.disconnect(); pan.dispose(); } catch (_) {}
      });

      activeVocals.delete(patternId);
    }
  },

  /**
   * Stops all active vocal playback nodes.
   */
  stopAllVocalPlayback() {
    const patternIds = Array.from(activeVocals.keys());
    patternIds.forEach(id => this.stopVocalPattern(id));
  },

  /**
   * Saves a validated temporary recording to IndexedDB and registers it in the store.
   */
  async saveValidatedRecording(patternId: number, blob: Blob) {
    await saveVocalRecording(patternId, blob);
    useAudioStore.getState().addVocalBlob(patternId, blob);
  },

  /**
   * Creates and plays a vocal buffer aligned with the sequencer timeline.
   * Returns players and panners references for active tracking/cleanup.
   */
  playSequencerVocal(
    patternId: number,
    time: number,
    elapsedSec: number,
    outputNode: any,
    trackVolPct: number,
    isCoroTrack: boolean
  ) {
    const store = useAudioStore.getState();
    const audioBuffer = store.vocalBuffers[patternId];
    


    if (!audioBuffer) {

      return null;
    }

    // Main player connected to the track's output via a local fade gain node
    const mainPlayer = new Tone.GrainPlayer(audioBuffer);
    mainPlayer.grainSize = 0.09;
    mainPlayer.overlap = 0.04;
    mainPlayer.volume.value = 0; // Unity gain on the player

    const mainGain = new Tone.Gain(1);
    mainPlayer.connect(mainGain);
    mainGain.connect(outputNode);

    // BPM Sync time stretching calculation
    const sequencerStore = useSequencerStore.getState();
    const voiceTrack = sequencerStore.tracks.find(t => t.patterns.some(p => Number(p.id) === Number(patternId)));
    const ptnRef = voiceTrack?.patterns.find(p => Number(p.id) === Number(patternId));
    
    let playbackRate = 1.0;
    const clip = ptnRef?.vocalClip;
    const currentMeasureIdx = sequencerStore.currentMeasure || 0;
    const measureBpm = sequencerStore.measureBpms[currentMeasureIdx] || sequencerStore.bpm;

    if (clip) {
      if (clip.bpmSync && clip.baseBpm) {
        playbackRate = measureBpm / clip.baseBpm;
      }
    } else if (ptnRef && ptnRef.vocalBpmSync && ptnRef.vocalBaseBpm) {
      playbackRate = measureBpm / ptnRef.vocalBaseBpm;
    }
    mainPlayer.playbackRate = playbackRate;

    const offsetEnd = clip && clip.offsetEnd !== undefined ? clip.offsetEnd : audioBuffer.duration;
    const remainingDuration = Math.max(0, offsetEnd - elapsedSec);



    if (remainingDuration > 0) {
      mainPlayer.start(time, elapsedSec, remainingDuration);

      // dynamic smooth fades to avoid pops/clicks, secured against lookahead delays
      const mainFadeStart = Math.max(time, Tone.context.currentTime);
      mainGain.gain.setValueAtTime(0, mainFadeStart);
      mainGain.gain.linearRampToValueAtTime(1, mainFadeStart + 0.01); // 10ms fade-in
      mainGain.gain.setValueAtTime(1, mainFadeStart + remainingDuration - 0.03);
      mainGain.gain.linearRampToValueAtTime(0, mainFadeStart + remainingDuration); // 30ms fade-out
    }

    const chorusPlayers: Tone.GrainPlayer[] = [];
    const chorusGains: Tone.Gain[] = [];
    const panners: Tone.Panner[] = [];

    const chorusDensity = isCoroTrack ? store.chorusDensity : 0;
    if (chorusDensity > 0) {
      const panner1 = new Tone.Panner(-0.5);
      const player1 = new Tone.GrainPlayer(audioBuffer);
      player1.grainSize = 0.09;
      player1.overlap = 0.04;
      player1.playbackRate = playbackRate;
      player1.volume.value = 0;

      const chorusGain1 = new Tone.Gain(1);
      player1.connect(chorusGain1);
      chorusGain1.connect(panner1);
      panner1.connect(outputNode);
      player1.detune = -8;

      const remaining1 = Math.max(0, offsetEnd - (elapsedSec + 0.015));
      if (remaining1 > 0) {
        player1.start(time + 0.015, elapsedSec + 0.015, remaining1);

        const c1FadeStart = Math.max(time + 0.015, Tone.context.currentTime);
        chorusGain1.gain.setValueAtTime(0, c1FadeStart);
        chorusGain1.gain.linearRampToValueAtTime(chorusDensity, c1FadeStart + 0.01);
        chorusGain1.gain.setValueAtTime(chorusDensity, c1FadeStart + remaining1 - 0.03);
        chorusGain1.gain.linearRampToValueAtTime(0, c1FadeStart + remaining1);
      }
      chorusPlayers.push(player1);
      chorusGains.push(chorusGain1);
      panners.push(panner1);

      const panner2 = new Tone.Panner(0.5);
      const player2 = new Tone.GrainPlayer(audioBuffer);
      player2.grainSize = 0.09;
      player2.overlap = 0.04;
      player2.playbackRate = playbackRate;
      player2.volume.value = 0;

      const chorusGain2 = new Tone.Gain(1);
      player2.connect(chorusGain2);
      chorusGain2.connect(panner2);
      panner2.connect(outputNode);
      player2.detune = 10;

      const remaining2 = Math.max(0, offsetEnd - (elapsedSec + 0.025));
      if (remaining2 > 0) {
        player2.start(time + 0.025, elapsedSec + 0.025, remaining2);

        const c2FadeStart = Math.max(time + 0.025, Tone.context.currentTime);
        chorusGain2.gain.setValueAtTime(0, c2FadeStart);
        chorusGain2.gain.linearRampToValueAtTime(chorusDensity, c2FadeStart + 0.01);
        chorusGain2.gain.setValueAtTime(chorusDensity, c2FadeStart + remaining2 - 0.03);
        chorusGain2.gain.linearRampToValueAtTime(0, c2FadeStart + remaining2);
      }
      chorusPlayers.push(player2);
      chorusGains.push(chorusGain2);
      panners.push(panner2);
    }

    const handleStop = () => {
      try { mainPlayer.onstop = null; } catch (_) {}
      try { mainPlayer.stop(); mainPlayer.dispose(); } catch (_) {}
      try { mainGain.disconnect(); mainGain.dispose(); } catch (_) {}
      chorusPlayers.forEach(p => { try { p.stop(); p.dispose(); } catch (_) {} });
      chorusGains.forEach(g => { try { g.disconnect(); g.dispose(); } catch (_) {} });
      panners.forEach(pan => { try { pan.disconnect(); pan.dispose(); } catch (_) {} });
    };

    mainPlayer.onstop = () => {
      handleStop();
    };

    return {
      mainPlayer,
      chorusPlayers,
      panners,
      stop: handleStop
    };
  }
};
