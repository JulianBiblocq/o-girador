/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import * as Tone from 'tone';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { X, Scissors } from 'lucide-react';
import { AudioAlignmentEditor } from './AudioAlignmentEditor';
import { useVocalValidationAudio } from './vocal-validation/useVocalValidationAudio';
import { useVocalValidationSave } from './vocal-validation/useVocalValidationSave';

export const VocalValidationModal: React.FC = () => {
  const tempRecording = useAudioStore((state) => state.tempRecording);
  const setTempRecording = useAudioStore((state) => state.setTempRecording);
  const { handleStop } = useAudio();

  const tracks = useSequencerStore((state) => state.tracks);
  const bpm = useSequencerStore((state) => state.bpm);
  const measureBpms = useSequencerStore((state) => state.measureBpms);
  const measureTimeSigs = useSequencerStore((state) => state.measureTimeSigs);

  const voiceTrack = tempRecording
    ? (tempRecording.trackId
        ? tracks.find((t) => String(t.id) === String(tempRecording.trackId))
        : tracks.find((t) => t.patterns?.some((p) => Number(p.id) === Number(tempRecording.patternId))))
    : null;
  const targetPattern = tempRecording && voiceTrack
    ? voiceTrack.patterns?.find((p) => Number(p.id) === Number(tempRecording.patternId))
    : null;

  const {
    loading,
    setLoading,
    audioBuffer,
    initialTrimStartSec,
    initialTrimEndSec,
    initialNudgeMs,
    preRollDurationSec,
  } = useVocalValidationAudio({
    tempRecording,
    targetPattern,
    bpm,
    measureBpms,
    measureTimeSigs,
    handleStop,
  });

  const handleCancel = () => {
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch (_) {}
    handleStop();
    useAudioStore.getState().setTargetPatternId(null);
    setTempRecording(null);
  };

  const { handleSave } = useVocalValidationSave({
    tempRecording,
    voiceTrack,
    tracks,
    handleStop,
    setLoading,
    setTempRecording,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!tempRecording || !targetPattern || !voiceTrack) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#121212]/85 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#ece4d0] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_#1a1a1a] p-6 max-w-4xl w-full flex flex-col gap-5 font-mono rounded-sm max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3">
          <h2 className="font-cactus font-black text-2xl text-[#8b2a1a] tracking-wider uppercase flex items-center gap-2">
            <Scissors className="w-6 h-6" />
            Éditeur Audio Vocal (Cordel Sampler)
          </h2>
          <button
            onClick={handleCancel}
            type="button"
            className="p-1 hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-transparent hover:border-[#1a1a1a] transition-all cursor-pointer rounded-sm"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#e2d8be] border-2 border-[#1a1a1a] rounded-sm">
            <div className="w-10 h-10 border-4 border-[#8b2a1a] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-[#8b2a1a]">Rendu / Décodage en cours...</p>
          </div>
        ) : !audioBuffer ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#e2d8be] border-2 border-[#1a1a1a] rounded-sm p-6 text-center">
            <p className="text-sm font-bold text-[#8b2a1a]">Échec du décodage de l'enregistrement (flux audio vide ou format non supporté).</p>
            <button
              onClick={handleCancel}
              type="button"
              className="px-4 py-2 bg-[#8b2a1a] text-[#fdfaf2] font-cactus font-bold text-sm uppercase rounded-sm border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] hover:bg-[#6e2114]"
            >
              Fermer
            </button>
          </div>
        ) : (
          <AudioAlignmentEditor
            isImported={Boolean(tempRecording.isImported)}
            audioBuffer={audioBuffer}
            pattern={targetPattern}
            bpm={bpm}
            measureBpms={measureBpms}
            measureTimeSigs={measureTimeSigs}
            preRollDurationSec={preRollDurationSec}
            initialTrimStartSec={initialTrimStartSec}
            initialTrimEndSec={initialTrimEndSec}
            initialNudgeMs={initialNudgeMs}
            targetMeasureIdx={tempRecording.targetMeasureIdx ?? useAudioStore.getState().targetMeasureIdx ?? (targetPattern.measureAssignments.indexOf(true) !== -1 ? targetPattern.measureAssignments.indexOf(true) : 0)}
            initialSampleBpm={tempRecording.sampleBpm ?? targetPattern.vocalClip?.sampleBpm ?? targetPattern.vocalClip?.baseBpm}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};