/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../db';

export interface UseAudioTrackRecorderOptions {
  patternId: number;
  bpm?: number;
  onRecordingComplete?: (blob: Blob) => void;
  onStartSequencer?: () => void;
}

export type RecorderStatus = 'inactive' | 'arming' | 'countdown' | 'recording' | 'playing';

export function useAudioTrackRecorder({
  patternId,
  bpm = 120,
  onRecordingComplete,
  onStartSequencer,
}: UseAudioTrackRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>('inactive');
  const [countdown, setCountdown] = useState<number>(0); // 1 to 4 during countdown
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const armingTimeoutRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const elapsedIntervalRef = useRef<any>(null);
  const playerRef = useRef<Tone.GrainPlayer | Tone.Player | null>(null);

  // Dynamic durations based on current BPM
  const armingDurationSeconds = 1.0;
  const beatDurationSeconds = 60 / bpm;
  const countdownDurationSeconds = 4 * beatDurationSeconds;
  const totalOffsetSeconds = armingDurationSeconds + countdownDurationSeconds;

  // Load existing recording from DB on mount or patternId change
  useEffect(() => {
    let active = true;
    async function loadExisting() {
      try {
        const blob = await getVocalRecording(patternId);
        if (active) {
          setRecordedBlob(blob);
        }
      } catch (err) {
        console.error("Failed to load existing vocal recording:", err);
      }
    }
    loadExisting();
    return () => {
      active = false;
    };
  }, [patternId]);

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      cleanupTimers();
      cleanupMedia();
      cleanupPlayer();
    };
  }, []);

  const cleanupTimers = () => {
    if (armingTimeoutRef.current) {
      clearTimeout(armingTimeoutRef.current);
      armingTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const cleanupPlayer = () => {
    if (playerRef.current) {
      try {
        playerRef.current.stop();
        playerRef.current.dispose();
      } catch (_) {}
      playerRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    setError(null);
    cleanupPlayer();
    cleanupTimers();
    setStatus('arming');
    setCountdown(0);
    setElapsedSeconds(0);
    chunksRef.current = [];

    try {
      // 1. Open microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // 2. Initialize MediaRecorder (Format audio/webm)
      const mediaRecorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 96000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm',
          });
          setRecordedBlob(blob);
          await saveVocalRecording(patternId, blob);
          if (onRecordingComplete) {
            onRecordingComplete(blob);
          }
        } catch (err: any) {
          console.error("Error saving recording:", err);
          setError("Erreur lors de la sauvegarde : " + err.message);
        } finally {
          setStatus('inactive');
          cleanupMedia();
        }
      };

      // 3. Start MediaRecorder immediately in background (arming phase)
      mediaRecorder.start();

      // 4. Start 1-second Arming Phase Timer
      armingTimeoutRef.current = setTimeout(() => {
        setStatus('countdown');
        let currentBeat = 1;
        setCountdown(currentBeat);

        // 5. Start musical countdown ticking every beat duration
        const beatIntervalMs = (60 / bpm) * 1000;
        countdownIntervalRef.current = setInterval(() => {
          currentBeat++;
          if (currentBeat <= 4) {
            setCountdown(currentBeat);
          } else {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            
            // GO moment: Transition to recording state
            setStatus('recording');
            setCountdown(0);
            
            // Trigger sequencer start
            if (onStartSequencer) {
              onStartSequencer();
            } else {
              try {
                if (Tone.Transport.state !== 'started') {
                  Tone.Transport.start();
                }
              } catch (_) {}
            }

            // Start elapsed seconds counter
            let sec = 0;
            setElapsedSeconds(0);
            elapsedIntervalRef.current = setInterval(() => {
              sec++;
              setElapsedSeconds(sec);
            }, 1000);
          }
        }, beatIntervalMs);
      }, armingDurationSeconds * 1000);

    } catch (err: any) {
      console.error("Failed to start audio recording:", err);
      setError("Accès microphone refusé ou non supporté : " + err.message);
      setStatus('inactive');
      cleanupMedia();
    }
  }, [patternId, bpm, onRecordingComplete, onStartSequencer]);

  const stopRecording = useCallback(() => {
    cleanupTimers();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
        cleanupMedia();
        setStatus('inactive');
      }
    } else {
      cleanupMedia();
      setStatus('inactive');
    }
  }, []);

  const startPlayback = useCallback(async () => {
    if (!recordedBlob) return;
    cleanupPlayer();
    cleanupTimers();
    setStatus('playing');
    setElapsedSeconds(0);

    try {
      await Tone.start();

      // Decode recorded buffer
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);

      // Create player
      const player = new Tone.GrainPlayer(audioBuffer);
      player.grainSize = 0.09;
      player.overlap = 0.04;
      player.toDestination();
      playerRef.current = player;

      player.onstop = () => {
        cleanupTimers();
        setStatus('inactive');
      };

      // Playback offset skips arming + countdown duration
      const offsetSec = totalOffsetSeconds;

      // Start elapsed seconds counter for playback
      let sec = 0;
      elapsedIntervalRef.current = setInterval(() => {
        sec++;
        if (sec > audioBuffer.duration - offsetSec) {
          clearInterval(elapsedIntervalRef.current);
          elapsedIntervalRef.current = null;
        } else {
          setElapsedSeconds(sec);
        }
      }, 1000);

      player.start(Tone.now(), offsetSec);
    } catch (err: any) {
      console.error("Error during track playback:", err);
      setError("Erreur de lecture : " + err.message);
      setStatus('inactive');
    }
  }, [recordedBlob, totalOffsetSeconds]);

  const stopPlayback = useCallback(() => {
    cleanupPlayer();
    cleanupTimers();
    setStatus('inactive');
  }, []);

  const deleteRecording = useCallback(async () => {
    cleanupPlayer();
    cleanupTimers();
    setStatus('inactive');
    try {
      await deleteVocalRecording(patternId);
      setRecordedBlob(null);
    } catch (err: any) {
      console.error("Error deleting recording:", err);
      setError("Erreur lors de la suppression : " + err.message);
    }
  }, [patternId]);

  return {
    status,
    countdown,
    elapsedSeconds,
    recordedBlob,
    error,
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    deleteRecording,
    armingDuration: armingDurationSeconds,
    countdownDuration: countdownDurationSeconds,
    totalOffset: totalOffsetSeconds,
  };
}
