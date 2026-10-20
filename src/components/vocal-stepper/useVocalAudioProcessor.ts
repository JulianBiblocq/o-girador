/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { vocalEngineService } from '../../audio/vocalEngineService';

interface UseVocalAudioProcessorParams {
  patternId?: number;
  trackId?: number | string;
  lang: 'fr' | 'pt';
  onAdvanceToStep3: () => void;
}

export function useVocalAudioProcessor({
  patternId,
  trackId,
  lang,
  onAdvanceToStep3,
}: UseVocalAudioProcessorParams) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pattern = useSequencerStore((state) =>
    state.tracks.flatMap((t) => t.patterns).find((p) => p.id === patternId)
  );

  const getTargetInfo = () => {
    const curArmed = useAudioStore.getState().targetMeasureIdx;
    const assigned = (pattern?.measureAssignments && pattern.measureAssignments.indexOf(true) !== -1)
      ? pattern.measureAssignments.indexOf(true)
      : 0;
    const targetMeasure = curArmed !== null ? curArmed : assigned;
    const store = useSequencerStore.getState();
    const bpm = (store.measureBpms && store.measureBpms[targetMeasure] > 0) ? store.measureBpms[targetMeasure] : store.bpm;
    const resTrackId = trackId ?? store.tracks.find((t) => t.patterns.some((p) => p.id === patternId))?.id;
    return { targetMeasure, bpm, resTrackId };
  };

  const processAudioFile = async (file: File) => {
    if (!file || !patternId) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      if (rawCtx?.state === 'suspended') {
        try { await rawCtx.resume(); } catch (_) {}
      }

      const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer.slice(0));
      const blob = new Blob([arrayBuffer], { type: file.type || 'audio/wav' });

      useAudioStore.getState().setSelectedVocalPatternId(patternId);
      useAudioStore.getState().setTargetPatternId(patternId);

      const { targetMeasure, bpm, resTrackId } = getTargetInfo();
      useAudioStore.getState().setTempRecording({
        patternId,
        trackId: resTrackId,
        blob,
        audioBuffer,
        isImported: true,
        targetMeasureIdx: targetMeasure,
        sampleBpm: bpm,
      });

      onAdvanceToStep3();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMessage(lang === 'fr' ? "Erreur lors de l'import : " + err.message : "Erro ao importar: " + err.message);
    }
  };

  const handleOpenCalibration = async () => {
    if (!patternId) return;
    let blob: Blob | undefined = useAudioStore.getState().vocalBlobs[patternId] || useAudioStore.getState().vocalBlobs[String(patternId)];
    if (!blob) blob = await vocalEngineService.loadVocalRecording(patternId) || undefined;
    if (blob) {
      const { targetMeasure, bpm, resTrackId } = getTargetInfo();
      const sampleBpm = pattern?.vocalClip?.sampleBpm || pattern?.vocalClip?.baseBpm || bpm;
      useAudioStore.getState().setTempRecording({
        patternId,
        trackId: resTrackId,
        blob,
        isImported: false,
        targetMeasureIdx: targetMeasure,
        sampleBpm,
      });
      onAdvanceToStep3();
    }
  };

  return {
    errorMessage,
    setErrorMessage,
    isDragging,
    fileInputRef,
    handleFileImport: async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) await processAudioFile(file);
    },
    handleDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
    handleDragLeave: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
    handleDrop: async (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) await processAudioFile(file);
    },
    handleOpenCalibration,
  };
}
