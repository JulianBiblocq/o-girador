/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useAudio } from '../contexts/AudioContext';
import { X, Scissors } from 'lucide-react';
import { AudioAlignmentEditor } from './AudioAlignmentEditor';
import { VocalClipMeta } from '../types/store.types';

export const VocalValidationModal: React.FC = () => {
  const tempRecording = useAudioStore((state) => state.tempRecording);
  const setTempRecording = useAudioStore((state) => state.setTempRecording);
  const { handleStop } = useAudio();

  const [loading, setLoading] = useState(true);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const [initialTrimStartSec, setInitialTrimStartSec] = useState(0);
  const [initialTrimEndSec, setInitialTrimEndSec] = useState(0);
  const [initialNudgeMs, setInitialNudgeMs] = useState(0);
  const [preRollDurationSec, setPreRollDurationSec] = useState(0);

  const tracks = useSequencerStore((state) => state.tracks);
  const bpm = useSequencerStore((state) => state.bpm);
  const measureBpms = useSequencerStore((state) => state.measureBpms);
  const measureTimeSigs = useSequencerStore((state) => state.measureTimeSigs);

  const voiceTrack = tempRecording
    ? tracks.find((t) => t.patterns.some((p) => Number(p.id) === Number(tempRecording.patternId)))
    : null;
  const targetPattern = tempRecording && voiceTrack
    ? voiceTrack.patterns.find((p) => Number(p.id) === Number(tempRecording.patternId))
    : null;

  // Decode temporary recording audio data on mount
  useEffect(() => {
    if (!tempRecording || !targetPattern) return;

    let active = true;
    setLoading(true);
    setAudioBuffer(null);

    const decode = async () => {
      try {
        const arrayBuffer = await tempRecording.blob.arrayBuffer();
        const rawCtx = Tone.getContext().rawContext as AudioContext;
        const buffer = await rawCtx.decodeAudioData(arrayBuffer);

        if (active) {
          setAudioBuffer(buffer);

          // Find measure BPM
          const initialMeasureIdx = targetPattern.measureAssignments.indexOf(true) !== -1
            ? targetPattern.measureAssignments.indexOf(true)
            : 0;
          const targetBpm = measureBpms[initialMeasureIdx % (measureBpms.length || 1)] || bpm;
          
          // Pure Transport count-in duration (4 beats)
          const preRollSec = (4 * 60) / targetBpm;
          setPreRollDurationSec(preRollSec);

          const existingClip = targetPattern.vocalClip;
          if (existingClip) {
            setInitialTrimStartSec(existingClip.trimStartSec ?? preRollSec);
            setInitialTrimEndSec(existingClip.trimEndSec ?? buffer.duration);
            setInitialNudgeMs(existingClip.nudgeMs ?? 0);
          } else {
            // Default deterministic anchor: Temps 1 starts exactly at preRollSec
            setInitialTrimStartSec(preRollSec);
            setInitialTrimEndSec(buffer.duration);
            setInitialNudgeMs(0);
          }

          setLoading(false);
        }
      } catch (err) {
        console.error('🎙️ [VOCAL ENGINE] Error decoding temporary recording:', err);
        if (active) setLoading(false);
      }
    };

    handleStop();
    decode();

    return () => {
      active = false;
    };
  }, [tempRecording, targetPattern, bpm, measureBpms, handleStop]);

  if (!tempRecording || !targetPattern || !voiceTrack) return null;

  const handleCancel = () => {
    handleStop();
    useAudioStore.getState().setTargetPatternId(null);
    setTempRecording(null);
  };

  const handleSave = async (cleanBuffer: AudioBuffer, wavBlob: Blob, meta: VocalClipMeta) => {
    setLoading(true);
    handleStop();

    try {
      // 1. Asynchronously persist clean WAV in IndexedDB
      await vocalEngineService.saveValidatedRecording(tempRecording.patternId, wavBlob);

      // 2. Immediately cache clean AudioBuffer in RAM for zero-latency playback
      useAudioStore.getState().setVocalBuffer(tempRecording.patternId, cleanBuffer);
      useAudioStore.getState().addVocalBlob(tempRecording.patternId, wavBlob);

      // 3. Update sequencer store pattern metadata
      useSequencerStore.getState().setTracks(
        tracks.map((t) => {
          if (t.id === voiceTrack.id) {
            return {
              ...t,
              patterns: t.patterns.map((p) => {
                if (Number(p.id) === Number(tempRecording.patternId)) {
                  return {
                    ...p,
                    vocalMode: 'micro',
                    vocalClip: meta,
                    // Clean legacy single fields
                    vocalNudge: undefined,
                    vocalTrimStart: undefined,
                    vocalBaseBpm: undefined,
                    vocalBpmSync: undefined,
                  };
                }
                return p;
              }),
            };
          }
          return t;
        })
      );

      // 4. Disarm track and close modal
      useAudioStore.getState().setTargetPatternId(null);
      setTempRecording(null);
    } catch (err) {
      console.error('🎙️ [VOCAL ENGINE] Error validating and saving vocal sample:', err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#121212]/85 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#ece4d0] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_#1a1a1a] p-6 max-w-4xl w-full flex flex-col gap-5 font-mono rounded-sm max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3">
          <h2 className="font-cactus font-black text-2xl text-[#8b2a1a] tracking-wider uppercase flex items-center gap-2">
            <Scissors className="w-6 h-6" />
            Éditeur Audio Vocal (Cordel Sampler)
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-transparent hover:border-[#1a1a1a] transition-all cursor-pointer rounded-sm"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading || !audioBuffer ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#e2d8be] border-2 border-[#1a1a1a] rounded-sm">
            <div className="w-10 h-10 border-4 border-[#8b2a1a] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-[#8b2a1a]">Rendu / Décodage en cours...</p>
          </div>
        ) : (
          <AudioAlignmentEditor
            audioBuffer={audioBuffer}
            pattern={targetPattern}
            bpm={bpm}
            measureBpms={measureBpms}
            measureTimeSigs={measureTimeSigs}
            preRollDurationSec={preRollDurationSec}
            initialTrimStartSec={initialTrimStartSec}
            initialTrimEndSec={initialTrimEndSec}
            initialNudgeMs={initialNudgeMs}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};