/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../db';
import { TimeSignature } from '../types';

export interface UseVocalRecorderOptions {
  patternId: number;
  bpm?: number;
  timeSignature?: TimeSignature;
  countInMeasures?: number;
  onRecordingComplete?: (blob: Blob) => void;
}

export function useVocalRecorder({
  patternId,
  bpm = 120,
  timeSignature = '4/4',
  countInMeasures = 1,
  onRecordingComplete,
}: UseVocalRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // References to keep track of active streams/recorders/players
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<any>(null);
  const playerRef = useRef<Tone.GrainPlayer | Tone.Player | null>(null);

  // Calculate beats per measure from time signature
  const getBeatsPerMeasure = useCallback((sig: TimeSignature): number => {
    const parts = sig.split('/');
    return parseInt(parts[0], 10) || 4;
  }, []);

  const beatsPerMeasure = getBeatsPerMeasure(timeSignature);
  const totalCountdownBeats = countInMeasures * beatsPerMeasure;
  const beatDurationSeconds = 60 / bpm;
  const countInDurationSeconds = totalCountdownBeats * beatDurationSeconds;

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
      cleanupMedia();
      cleanupPlayer();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

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

  const playBeep = useCallback((beatIndex: number) => {
    try {
      // Create a short synth click beep
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.08 }
      }).toDestination();

      // High pitch for the last beat before GO, medium pitch for other beats
      const note = beatIndex === 1 ? 'C6' : 'C5';
      synth.triggerAttackRelease(note, '16n');

      // Dispose synth to avoid memory leaks
      setTimeout(() => {
        synth.dispose();
      }, 500);
    } catch (e) {
      console.warn("Failed to play metronome beep:", e);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    cleanupPlayer();
    setIsPlaying(false);
    chunksRef.current = [];

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // 2. Initialize MediaRecorder
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
          setError("Erreur lors de la sauvegarde de l'enregistrement: " + err.message);
        } finally {
          setIsRecording(false);
          setIsCountingIn(false);
          cleanupMedia();
        }
      };

      // 3. Start recording immediately to capture the count-in period
      // This absorbs MediaRecorder startup latency and guarantees the mic is active
      mediaRecorder.start();

      // Ensure Tone.js audio context is running
      await Tone.start();

      // 4. Start the countdown
      if (totalCountdownBeats > 0) {
        setIsCountingIn(true);
        let beatsLeft = totalCountdownBeats;
        setCountdown(beatsLeft);
        playBeep(beatsLeft);

        const beatDurationMs = beatDurationSeconds * 1000;
        countdownIntervalRef.current = setInterval(() => {
          beatsLeft--;
          if (beatsLeft > 0) {
            setCountdown(beatsLeft);
            playBeep(beatsLeft);
          } else {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            setCountdown(0);
            setIsCountingIn(false);
            setIsRecording(true);
          }
        }, beatDurationMs);
      } else {
        // No count-in, start recording immediately
        setIsRecording(true);
      }
    } catch (err: any) {
      console.error("Failed to start vocal recording:", err);
      setError("Accès microphone refusé ou non supporté : " + err.message);
      setIsRecording(false);
      setIsCountingIn(false);
      cleanupMedia();
    }
  }, [patternId, totalCountdownBeats, beatDurationSeconds, playBeep, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
        cleanupMedia();
        setIsRecording(false);
        setIsCountingIn(false);
      }
    } else {
      cleanupMedia();
      setIsRecording(false);
      setIsCountingIn(false);
    }
  }, []);

  const startPlayback = useCallback(async () => {
    if (!recordedBlob) return;
    cleanupPlayer();
    setIsPlaying(true);

    try {
      await Tone.start();

      // Decode audio data for GrainPlayer
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);

      // Create a GrainPlayer (equivalent to what App.tsx uses)
      const player = new Tone.GrainPlayer(audioBuffer);
      player.grainSize = 0.09;
      player.overlap = 0.04;
      player.toDestination();
      playerRef.current = player;

      // When the player finishes naturally, reset state
      player.onstop = () => {
        setIsPlaying(false);
      };

      // Playback offset = duration of count-in
      // This perfectly skips the count-in period and aligns audio with pattern start
      const offsetSec = countInDurationSeconds;
      
      console.log(`🔊 [TEST PLAYBACK] Starting playback. Offset: ${offsetSec}s, Buffer duration: ${audioBuffer.duration}s`);
      player.start(Tone.now(), offsetSec);
    } catch (err: any) {
      console.error("Error during test playback:", err);
      setError("Erreur lors de la lecture audio : " + err.message);
      setIsPlaying(false);
    }
  }, [recordedBlob, countInDurationSeconds]);

  const stopPlayback = useCallback(() => {
    cleanupPlayer();
    setIsPlaying(false);
  }, []);

  const deleteRecording = useCallback(async () => {
    cleanupPlayer();
    setIsPlaying(false);
    try {
      await deleteVocalRecording(patternId);
      setRecordedBlob(null);
    } catch (err: any) {
      console.error("Error deleting recording:", err);
      setError("Erreur lors de la suppression de l'enregistrement : " + err.message);
    }
  }, [patternId]);

  return {
    isRecording,
    isCountingIn,
    isPlaying,
    countdown,
    recordedBlob,
    error,
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    deleteRecording,
    countInDuration: countInDurationSeconds,
  };
}
