import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../db';
import { channels, masterVolumeNode } from './effectsChain';
import { instrumentsConfig } from '../data';
import { playNativeMetroClick } from './nativeSynths';

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
  try {
    getTimerWorker().postMessage({ type: 'clearTimeout', id });
  } catch (_) {}
}

export function workerSetInterval(callback: () => void, delay: number): number {
  const id = nextTimerId++;
  pendingCallbacks.set(id, callback);
  getTimerWorker().postMessage({ type: 'setInterval', id, delay });
  return id;
}

export function workerClearInterval(id: number) {
  pendingCallbacks.delete(id);
  try {
    getTimerWorker().postMessage({ type: 'clearInterval', id });
  } catch (_) {}
}

interface ActiveVocal {
  mainPlayer: Tone.GrainPlayer;
  chorusPlayers: Tone.GrainPlayer[];
  panners: Tone.Panner[];
}

const activeVocals = new Map<number, ActiveVocal>();

let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let armingTimeout: any = null;
let countdownInterval: any = null;
let punchInTimeout: any = null;

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
   * Starts the recording process with micro arming and beat countdown.
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
    console.log(`🎙️ [VOCAL DEBUG] 4. startRecording() invoqué, instanciation du MediaRecorder... patternId: ${numPatternId}`);

    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    const bpm = sequencerStore.bpm;

    // Reset timers
    this.cleanupTimers();

    store.setRecordingStatus(options.immediate ? 'recording' : 'arming');
    store.setTargetPatternId(numPatternId);
    recordedChunks = [];

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: options.deviceId ? {
          deviceId: { exact: options.deviceId },
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
        console.log(`🎙️ [VOCAL DEBUG] mediaRecorder.onstop event fired. numPatternId: ${numPatternId}, recordedChunks count: ${recordedChunks.length}`);
        try {
          const blob = new Blob(recordedChunks, {
            type: mediaRecorder?.mimeType || 'audio/webm',
          });
          console.log(`🎙️ [VOCAL DEBUG] Created Blob. Size: ${blob.size} bytes, Type: ${blob.type}`);

          // Intercept and store temporarily instead of direct save/insert
          console.log(`🎙️ [VOCAL DEBUG] Dispatching setTempRecording to store for patternId: ${numPatternId}`);
          useAudioStore.getState().setTempRecording({ patternId: numPatternId, blob });
          console.log("🎙️ [VOCAL DEBUG] Store updated. tempRecording state is now:", useAudioStore.getState().tempRecording);

          if (options.onRecordingStopped) {
            options.onRecordingStopped(blob);
          }
        } catch (err: any) {
          console.error("🎙️ [VOCAL DEBUG] Error in media recorder stop:", err);
          if (options.onError) options.onError(err);
        } finally {
          this.cleanupMedia();
          store.setRecordingStatus('inactive');
          // Note: targetPatternId is kept to maintain arming state, disarming is handled on confirm/cancel
        }
      };

      // Find pattern to calculate duration of recording and first note offset
      const tracks = sequencerStore.tracks;
      const voiceTrack = tracks.find(t => t.patterns.some(p => Number(p.id) === numPatternId));
      const targetPattern = voiceTrack?.patterns.find(p => Number(p.id) === numPatternId);

      console.log(`🎙️ [VOCAL DEBUG] startRecording - Found voiceTrack: ${voiceTrack ? voiceTrack.id : 'undefined'}, targetPattern: ${targetPattern ? targetPattern.name : 'undefined'}`);

      if (!targetPattern || !voiceTrack) {
        throw new Error("Target pattern or voice track not found");
      }

      const initialMeasureIdx = targetPattern.measureAssignments.indexOf(true) !== -1 
        ? targetPattern.measureAssignments.indexOf(true) 
        : 0;

      // 1 measure pre-roll
      const startMeasureIdx = Math.max(0, initialMeasureIdx - 1);

      let consecutiveMeasures = 0;
      for (let i = initialMeasureIdx; i < sequencerStore.totalMeasures; i++) {
        if (targetPattern.measureAssignments[i]) {
          consecutiveMeasures++;
        } else {
          break;
        }
      }
      consecutiveMeasures = Math.max(1, consecutiveMeasures);

      // 1 measure post-roll
      const endMeasureIdx = initialMeasureIdx + consecutiveMeasures + 1;
      this.recordingDurationMeasures = endMeasureIdx - startMeasureIdx;
      this.recordedMeasuresCount = 0;

      const targetBpm = sequencerStore.measureBpms[startMeasureIdx] || bpm;

      if (options.immediate) {
        if (mediaRecorder && mediaRecorder.state === 'inactive') {
          try {
            mediaRecorder.start();
            console.log("🎙️ [VOCAL DEBUG] mediaRecorder.start() executed successfully (immediate mode). State:", mediaRecorder.state);
            store.setRecordingStatus('recording');
            console.log("🎙️ [VOCAL DEBUG] Punch-in triggered! Status set to recording.");
          } catch (e) {
            console.error("🎙️ [VOCAL DEBUG] Error starting media recorder immediately:", e);
          }
        }
      } else {
        // Smart Punch-in Timing scan: 1 measure pre-roll start time
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

        const punchInTimeSec = getElapsedSeconds(startMeasureIdx);
        const beatDurationMs = (60 / targetBpm) * 1000;
        
        // Sequencer start time is 1000ms of arming + 4 beats of countdown
        const seqStartMs = 1000 + 4 * beatDurationMs;
        // Punch-in is scheduled exactly at the start of startMeasureIdx
        const punchInMs = seqStartMs + (punchInTimeSec * 1000);
        
        const punchInDelayMs = Math.max(0, punchInMs);

        console.log(`🎙️ [VOCAL DEBUG] startRecording - startMeasureIdx: ${startMeasureIdx}, endMeasureIdx: ${endMeasureIdx}`);
        console.log(`🎙️ [VOCAL DEBUG] startRecording - seqStartMs: ${seqStartMs}, punchInMs: ${punchInMs}, punchInDelayMs: ${punchInDelayMs}`);

        // Program the MediaRecorder punch-in
        punchInTimeout = workerSetTimeout(() => {
          console.log("🎙️ [VOCAL DEBUG] punchInTimeout fired. State before start:", mediaRecorder ? mediaRecorder.state : 'null');
          if (mediaRecorder && mediaRecorder.state === 'inactive') {
            try {
              mediaRecorder.start();
              console.log("🎙️ [VOCAL DEBUG] mediaRecorder.start() executed successfully. State:", mediaRecorder.state);
              store.setRecordingStatus('recording');
              console.log("🎙️ [VOCAL DEBUG] Punch-in triggered! Status set to recording.");
            } catch (e) {
              console.error("🎙️ [VOCAL DEBUG] Error starting media recorder inside punchInTimeout:", e);
            }
          }
        }, punchInDelayMs);

        // Arming phase duration: 1.0 second
        armingTimeout = workerSetTimeout(() => {
          console.log("🎙️ [VOCAL DEBUG] armingTimeout completed. Transitioning to countdown.");
          store.setRecordingStatus('countdown');

          let currentBeat = 1;

          countdownInterval = workerSetInterval(() => {
            console.log("🎙️ [VOCAL DEBUG] Countdown beat:", currentBeat);
            currentBeat++;
            if (currentBeat > 4) {
              workerClearInterval(countdownInterval);
              countdownInterval = null;

              console.log("🎙️ [VOCAL DEBUG] Countdown finished. Transitioning status to recording.");
              // Transition to recording status
              store.setRecordingStatus('recording');

              // Trigger sequencer playback
              if (options.onStartSequencer) {
                options.onStartSequencer();
              }
            }
          }, beatDurationMs);

        }, 1000);
      }

    } catch (err: any) {
      console.error("🎙️ [VOCAL DEBUG] Error caught in startRecording try block:", err);
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
    console.log("🎙️ [VOCAL DEBUG] stopRecording() called. mediaRecorder state:", mediaRecorder ? mediaRecorder.state : 'null');
    this.cleanupTimers();
    if (mediaRecorder) {
      if (mediaRecorder.state !== 'inactive') {
        try {
          console.log("🎙️ [VOCAL DEBUG] Calling mediaRecorder.stop()");
          mediaRecorder.stop();
        } catch (err) {
          console.error("🎙️ [VOCAL DEBUG] Error stopping media recorder:", err);
          this.cleanupMedia();
          useAudioStore.getState().setRecordingStatus('inactive');
        }
      } else {
        console.log("🎙️ [VOCAL DEBUG] mediaRecorder state is inactive, cleaning up without stop()");
        // If recording was scheduled/armed but never actually active, clean up
        this.cleanupMedia();
        useAudioStore.getState().setRecordingStatus('inactive');
      }
    } else {
      console.log("🎙️ [VOCAL DEBUG] mediaRecorder is null, cleaning up");
      this.cleanupMedia();
      useAudioStore.getState().setRecordingStatus('inactive');
    }
  },

  cleanupTimers() {
    if (armingTimeout) {
      workerClearTimeout(armingTimeout);
      armingTimeout = null;
    }
    if (countdownInterval) {
      workerClearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (punchInTimeout) {
      workerClearTimeout(punchInTimeout);
      punchInTimeout = null;
    }
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

  /**
   * Deletes a vocal recording from IndexedDB and the store.
   */
  async deleteVocalRecording(patternId: number) {
    try {
      await deleteVocalRecording(patternId);
      useAudioStore.getState().removeVocalBlob(patternId);
      this.stopVocalPattern(patternId);
    } catch (err) {
      console.error(`Failed to delete vocal recording for pattern ${patternId}:`, err);
    }
  },

  /**
   * Plays a vocal pattern with time-stretching and optional chorus ensemble effect.
   */
  async playVocalPattern(patternId: number, time: number, onStop?: () => void) {
    const store = useAudioStore.getState();
    const sequencerStore = useSequencerStore.getState();
    
    // Choke existing playback for this pattern if any
    this.stopVocalPattern(patternId);

    let audioBuffer = store.vocalBuffers[patternId];
    if (!audioBuffer) {
      // Check if we have the blob in memory or in DB
      let blob = store.vocalBlobs[patternId];
      if (!blob) {
        blob = await this.loadVocalRecording(patternId) || undefined;
      }
      if (!blob) return;

      try {
        const arrayBuffer = await blob.arrayBuffer();
        // Decode audio data using raw Web Audio Context (inside Tone)
        const rawCtx = Tone.getContext().rawContext as AudioContext;
        audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
        // Cache the decoded buffer for future plays
        store.addVocalBuffer(patternId, audioBuffer);
      } catch (err) {
        console.error(`🎙️ [VOCAL DEBUG] Error decoding vocal blob for pattern ${patternId}:`, err);
        return;
      }
    }

    try {
      // Find the vocal track in the store to find its output channel (with strict Number comparison to avoid type mismatch)
      const tracks = sequencerStore.tracks;
      const voiceTrack = tracks.find(t => t.patterns.some(p => Number(p.id) === Number(patternId)));

      // Connect to the specific channel if available, or fallback (with strict safety fallback to avoid undefined channels)
      const outputNode = (voiceTrack && channels[voiceTrack.id]) || masterVolumeNode || Tone.Destination;

      // Get track volume
      const trackVolPct = voiceTrack ? (voiceTrack.volumeVal ?? 100) : 100;
      const baseGain = Math.pow(trackVolPct / 100, 2);

      // Main vocal player
      const mainPlayer = new Tone.GrainPlayer(audioBuffer);
      mainPlayer.grainSize = 0.09;
      mainPlayer.overlap = 0.04;
      mainPlayer.volume.value = Tone.gainToDb(baseGain || 0.0001);
      mainPlayer.connect(outputNode as any);

      // Calculate time-stretch playbackRate
      const currentMeasureIdx = sequencerStore.currentMeasure || 0;
      const measureBpm = sequencerStore.measureBpms[currentMeasureIdx] || sequencerStore.bpm;
      
      // Look up target pattern vocal properties (with strict Number comparison)
      let ptnRef = voiceTrack?.patterns.find(p => Number(p.id) === Number(patternId));
      
      let playbackRate = 1.0;
      if (ptnRef && ptnRef.vocalBpmSync && ptnRef.vocalBaseBpm) {
        playbackRate = measureBpm / ptnRef.vocalBaseBpm;
      }
      mainPlayer.playbackRate = playbackRate;

      // Compensate latency Nudge and Trim Start
      const nudgeMs = (ptnRef as any)?.vocalNudge || 0;
      const trimStartMs = (ptnRef as any)?.vocalTrimStart || 0;

      const triggerTime = time + (nudgeMs / 1000) + (trimStartMs / 1000);
      const now = Tone.context.currentTime;

      let startOffset = 0;
      let startPlayTime = triggerTime;

      if (triggerTime < now) {
        startOffset = now - triggerTime;
        startPlayTime = now;
      }

      // Setup active vocal track tracking
      const activeVocalEntry: ActiveVocal = {
        mainPlayer,
        chorusPlayers: [],
        panners: [],
      };

      // Set up main player stop cleanup
      mainPlayer.onstop = () => {
        this.stopVocalPattern(patternId);
        if (onStop) {
          onStop();
        }
      };

      // Start main player
      const playbackDurationSec = audioBuffer.duration;
      
      const remainingDuration = Math.max(0, playbackDurationSec - startOffset);
      
      // Diagnostic logs for in-context vocal playback tracing
      console.log(`🎙️ [VOCAL DEBUG] playVocalPattern - patternId: ${patternId}, voiceTrackId: ${voiceTrack?.id}, baseGain: ${baseGain}, outputNode: ${outputNode === Tone.Destination ? 'Destination' : 'Channel'}, triggerTime: ${triggerTime.toFixed(3)}s, now: ${now.toFixed(3)}s, startOffset: ${startOffset.toFixed(3)}s, startPlayTime: ${startPlayTime.toFixed(3)}s, remainingDuration: ${remainingDuration.toFixed(3)}s, playbackRate: ${playbackRate}`);

      if (remainingDuration > 0) {
        mainPlayer.start(startPlayTime, startOffset, remainingDuration);
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
        // Chorister 1 (Left): delayed +15ms, detune -8 cents, panner -0.5
        const panner1 = new Tone.Panner(-0.5);
        const player1 = new Tone.GrainPlayer(audioBuffer);
        player1.grainSize = 0.09;
        player1.overlap = 0.04;
        player1.playbackRate = playbackRate;
        player1.volume.value = Tone.gainToDb(baseGain * chorusDensity || 0.0001);
        
        player1.connect(panner1);
        panner1.connect(outputNode as any);
        
        player1.detune = -8;
        
        let chorister1Time = triggerTime + 0.015;
        let chorister1Offset = 0;
        if (chorister1Time < now) {
          chorister1Offset = now - chorister1Time;
          chorister1Time = now;
        }
        const remainingChorister1 = Math.max(0, playbackDurationSec - chorister1Offset);
        if (remainingChorister1 > 0) {
          player1.start(chorister1Time, chorister1Offset, remainingChorister1);
        }

        activeVocalEntry.chorusPlayers.push(player1);
        activeVocalEntry.panners.push(panner1);

        // Chorister 2 (Right): delayed +25ms, detune +10 cents, panner 0.5
        const panner2 = new Tone.Panner(0.5);
        const player2 = new Tone.GrainPlayer(audioBuffer);
        player2.grainSize = 0.09;
        player2.overlap = 0.04;
        player2.playbackRate = playbackRate;
        player2.volume.value = Tone.gainToDb(baseGain * chorusDensity || 0.0001);
        
        player2.connect(panner2);
        panner2.connect(outputNode as any);
        
        player2.detune = 10;
        
        let chorister2Time = triggerTime + 0.025;
        let chorister2Offset = 0;
        if (chorister2Time < now) {
          chorister2Offset = now - chorister2Time;
          chorister2Time = now;
        }
        const remainingChorister2 = Math.max(0, playbackDurationSec - chorister2Offset);
        if (remainingChorister2 > 0) {
          player2.start(chorister2Time, chorister2Offset, remainingChorister2);
        }

        activeVocalEntry.chorusPlayers.push(player2);
        activeVocalEntry.panners.push(panner2);
      }

      activeVocals.set(patternId, activeVocalEntry);

    } catch (err) {
      console.error(`Error playing vocal pattern ${patternId}:`, err);
    }
  },

  /**
   * Stops vocal playback for a specific pattern and disposes of all nodes to avoid leaks.
   */
  stopVocalPattern(patternId: number) {
    const entry = activeVocals.get(patternId);
    if (entry) {
      try {
        entry.mainPlayer.onstop = null; // Prevent recursion loop
        entry.mainPlayer.stop();
        entry.mainPlayer.dispose();
      } catch (_) {}

      entry.chorusPlayers.forEach(p => {
        try { p.stop(); p.dispose(); } catch (_) {}
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
  }
};
