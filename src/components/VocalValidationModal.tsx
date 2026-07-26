import React, { useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useAudio } from '../contexts/AudioContext';
import { X, Scissors } from 'lucide-react';
import { AudioAlignmentEditor } from './AudioAlignmentEditor';
import { VocalClipMeta } from '../types/store.types';
import { calculateVocalClipMeta } from '../utils/audioBufferUtils';

export const VocalValidationModal: React.FC = () => {
  const tempRecording = useAudioStore((state) => state.tempRecording);
  const setTempRecording = useAudioStore((state) => state.setTempRecording);
  const recordingStartTimelineSec = useAudioStore((state) => state.recordingStartTimelineSec);
  const { handleStop } = useAudio();

  const [loading, setLoading] = useState(true);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  // Initial parameters passed to the editor
  const [initialOffsetStart, setInitialOffsetStart] = useState(0);
  const [initialStartTimeDelay, setInitialStartTimeDelay] = useState(0);
  const [initialOffsetEnd, setInitialOffsetEnd] = useState(0);

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

  // Helper to calculate elapsed seconds up to a given measure
  const getElapsedSeconds = useCallback((mCount: number) => {
    let secs = 0;
    for (let i = 0; i < mCount; i++) {
      const mIdx = i % (measureBpms.length || 1);
      const mBpm = measureBpms[mIdx] || bpm;
      const timeSig = measureTimeSigs[mIdx] || '4/4';
      const beats = parseInt(timeSig.split('/')[0]) || 4;
      secs += (beats * 60) / mBpm;
    }
    return secs;
  }, [measureBpms, measureTimeSigs, bpm]);

  // Decode audio data on mount
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
          
          let startTrimSec = 0;
          let initialNudgeSec = 0;
          let endTrimSec = buffer.duration;

          const hasExistingRecording = targetPattern?.vocalMode === 'micro' && targetPattern?.vocalClip !== undefined;
          const recordingStartTimelineSec = useAudioStore.getState().recordingStartTimelineSec;
          const isImportedFile = recordingStartTimelineSec === null;
          
          if (hasExistingRecording && targetPattern.vocalClip) {
            startTrimSec = targetPattern.vocalClip.offsetStart;
            initialNudgeSec = targetPattern.vocalClip.startTimeDelay;
            endTrimSec = targetPattern.vocalClip.offsetEnd ?? buffer.duration;
            console.log(`🎙️ [VOCAL DEBUG] Reopened existing recording. Initializing nudge: ${initialNudgeSec * 1000} ms, trimStart: ${startTrimSec * 1000} ms`);
          } else if (isImportedFile) {
            // IMPORTED FILE -> start flat (no pre-roll timing alignment context)
            startTrimSec = 0;
            initialNudgeSec = 0;
            endTrimSec = buffer.duration;
            console.log(`🎙️ [VOCAL DEBUG] Imported audio file setup: startTrim: 0s, nudge: 0s, duration: ${buffer.duration}s`);
          } else {
            // BRAND NEW RECORDING -> AUTO-SNAP (threshold detection)
            const storeTargetMeasureIdx = useAudioStore.getState().targetMeasureIdx;
            const initialMeasureIdx = storeTargetMeasureIdx !== null
              ? storeTargetMeasureIdx
              : (targetPattern.measureAssignments.indexOf(true) !== -1
                  ? targetPattern.measureAssignments.indexOf(true)
                  : 0);

            const patternBpm = measureBpms[initialMeasureIdx] || bpm;
            const firstNoteOffsetSec = vocalEngineService.getPatternFirstNoteOffset(targetPattern, patternBpm);
            const recordingStartSec = recordingStartTimelineSec ?? getElapsedSeconds(initialMeasureIdx);
            const preRollDurationSec = getElapsedSeconds(initialMeasureIdx) - recordingStartSec;

            const clipMeta = calculateVocalClipMeta(buffer, firstNoteOffsetSec, preRollDurationSec, patternBpm, 0.035);

            startTrimSec = clipMeta.offsetStart;
            initialNudgeSec = 0; // Nudge initial est 0 car clipMeta a déjà calé l'attaque exactement sur firstNoteOffsetSec
            endTrimSec = clipMeta.offsetEnd;

            console.log(`🎙️ [VOCAL AUTO-TRIM & SNAP OK] offsetStart: ${startTrimSec.toFixed(3)}s, firstNoteOffsetSec: ${firstNoteOffsetSec.toFixed(3)}s, startTimeDelay: ${clipMeta.startTimeDelay.toFixed(3)}s`);
          }

          setInitialOffsetStart(startTrimSec);
          setInitialStartTimeDelay(initialNudgeSec);
          setInitialOffsetEnd(endTrimSec);
          setLoading(false);
        }
      } catch (err) {
        console.error('🎙️ [VOCAL DEBUG] Error decoding temporary recording:', err);
        if (active) setLoading(false);
      }
    };

    // Stop current playbacks when modal opens
    handleStop();
    decode();

    return () => {
      active = false;
    };
  }, [tempRecording, handleStop, targetPattern, bpm, measureBpms, getElapsedSeconds]);

  if (!tempRecording || !targetPattern || !voiceTrack) return null;

  const handleCancel = () => {
    handleStop();
    console.log('🎙️ [VOCAL DEBUG] Discarding temporary recording.');
    useAudioStore.getState().setTargetPatternId(null);
    setTempRecording(null);
  };

  const handleSave = async (meta: VocalClipMeta) => {
    if (!audioBuffer) return;
    setLoading(true);
    handleStop();

    console.log(`🎙️ [VOCAL DEBUG] Non-destructive save. Clip alignment metadata:`, meta);

    try {
      // Save permanently the original raw blob to IndexedDB
      await vocalEngineService.saveValidatedRecording(tempRecording.patternId, tempRecording.blob);

      // Cache the full original buffer and blob
      useAudioStore.getState().addVocalBuffer(tempRecording.patternId, audioBuffer);
      useAudioStore.getState().addVocalBlob(tempRecording.patternId, tempRecording.blob);

      // Update state in sequencer store
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
                    // Cleanup old single values to avoid split brain
                    vocalNudge: undefined,
                    vocalTrimStart: undefined,
                    vocalBaseBpm: undefined,
                    vocalBpmSync: undefined
                  };
                }
                return p;
              }),
            };
          }
          return t;
        })
      );

      // Disarm track
      useAudioStore.getState().setTargetPatternId(null);
      setTempRecording(null);
    } catch (err) {
      console.error('🎙️ [VOCAL DEBUG] Error validating and saving clip:', err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#121212]/85 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#ece4d0] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_#1a1a1a] p-6 max-w-4xl w-full flex flex-col gap-6 font-mono rounded-sm max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3">
          <h2 className="font-cactus font-black text-2xl text-[#8b2a1a] tracking-wider uppercase flex items-center gap-2">
            <Scissors className="w-6 h-6" />
            Éditeur Audio Vocal
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-transparent hover:border-[#1a1a1a] transition-all cursor-pointer rounded-sm"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading || !audioBuffer ? (
          /* Loading State */
          <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#e2d8be] border-2 border-[#1a1a1a] rounded-sm">
            <div className="w-10 h-10 border-4 border-[#8b2a1a] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-[#8b2a1a]">Rendu / Décodage en cours...</p>
          </div>
        ) : (
          /* Sub-editor */
          <AudioAlignmentEditor
            audioBuffer={audioBuffer}
            pattern={targetPattern}
            bpm={bpm}
            measureBpms={measureBpms}
            measureTimeSigs={measureTimeSigs}
            initialOffsetStart={initialOffsetStart}
            initialStartTimeDelay={initialStartTimeDelay}
            initialOffsetEnd={initialOffsetEnd}
            isImported={recordingStartTimelineSec === null}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};