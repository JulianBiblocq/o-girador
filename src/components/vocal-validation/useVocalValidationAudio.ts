/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';

interface AudioDecoderParams {
  tempRecording: any;
  targetPattern: any;
  bpm: number;
  measureBpms: number[];
  measureTimeSigs: string[];
  handleStop: () => void;
}

export function useVocalValidationAudio({
  tempRecording,
  targetPattern,
  bpm,
  measureBpms,
  measureTimeSigs,
  handleStop,
}: AudioDecoderParams) {
  const [loading, setLoading] = useState(true);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [initialTrimStartSec, setInitialTrimStartSec] = useState(0);
  const [initialTrimEndSec, setInitialTrimEndSec] = useState(0);
  const [initialNudgeMs, setInitialNudgeMs] = useState(0);
  const [preRollDurationSec, setPreRollDurationSec] = useState(0);

  useEffect(() => {
    if (!tempRecording || !targetPattern) return;

    let active = true;
    setLoading(true);
    setAudioBuffer(null);

    const decode = async () => {
      const storeTargetMeasure = useAudioStore.getState().targetMeasureIdx;
      const initialMeasureIdx = tempRecording.targetMeasureIdx !== undefined && tempRecording.targetMeasureIdx !== null
        ? tempRecording.targetMeasureIdx
        : storeTargetMeasure !== null && storeTargetMeasure !== undefined
        ? storeTargetMeasure
        : targetPattern.measureAssignments.indexOf(true) !== -1 ? targetPattern.measureAssignments.indexOf(true) : 0;
      const targetBpm = measureBpms[initialMeasureIdx % (measureBpms.length || 1)] || bpm;
      const targetSig = measureTimeSigs[initialMeasureIdx % (measureTimeSigs.length || 1)] || '4/4';
      const beatsCount = getBeatsPerMeasure(targetSig);
      const isCompound = (targetSig as string) === '6/8' || (targetSig as string) === '9/8' || (targetSig as string) === '12/8';
      const beatDurationSec = isCompound ? (90 / targetBpm) : (60 / targetBpm);

      const preRollSec = beatsCount * beatDurationSec;
      setPreRollDurationSec(preRollSec);

      const setupBufferAndTrims = (buffer: AudioBuffer) => {
        setAudioBuffer(buffer);
        const existingClip = targetPattern.vocalClip;
        setInitialTrimStartSec(0);
        setInitialTrimEndSec(buffer.duration);
        setInitialNudgeMs(existingClip?.nudgeMs ?? 0);
      };

      if (tempRecording.audioBuffer) {
        if (active) {
          setupBufferAndTrims(tempRecording.audioBuffer);
          setLoading(false);
        }
        return;
      }

      if (!tempRecording.blob || tempRecording.blob.size === 0) {
        console.error("[AUDIO] Blob d'enregistrement vide ou inexistant.");
        if (active) setLoading(false);
        return;
      }

      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      if (rawCtx && rawCtx.state === 'suspended') {
        try {
          await rawCtx.resume();
        } catch (e) {
          console.warn('[AUDIO] Context resume warning:', e);
        }
      }

      try {
        const arrayBuffer = await tempRecording.blob.arrayBuffer();
        const buffer = await rawCtx.decodeAudioData(arrayBuffer);
        if (active) setupBufferAndTrims(buffer);
      } catch (err) {
        console.error('[VOCAL ENGINE] Error decoding temporary recording:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    handleStop();
    decode();

    return () => {
      active = false;
    };
  }, [tempRecording, targetPattern, bpm, measureBpms, measureTimeSigs, handleStop]);

  return {
    loading,
    setLoading,
    audioBuffer,
    initialTrimStartSec,
    initialTrimEndSec,
    initialNudgeMs,
    preRollDurationSec,
  };
}
