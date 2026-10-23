/**
 * O Girador - Vocal Recording Service & IndexedDB Persistence
 */

import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { saveVocalRecording, getVocalRecording, deleteVocalRecording } from '../../db';
import { scheduleAudioContextAutoSuspend } from '../audioContextSuspendManager';

import { base64ToBlob } from '../../contexts/audio/audioVocalBase64';
export { base64ToBlob };

export class VocalRecordingService {
  public static mediaRecorder: MediaRecorder | null = null;
  public static audioStream: MediaStream | null = null;

  public static async startRecording(patternId: number): Promise<void> {
    const store = useAudioStore.getState() as any;
    store.setTargetPatternId?.(patternId);
    store.setRecordingStatus?.('recording');
    store.setIsFocusRecordingMode?.(true);

    const seq = useSequencerStore.getState();
    let targetM: number | null = null;
    for (const t of seq.tracks) {
      const p = t.patterns?.find(x => x.id === patternId);
      const idx = p?.measureAssignments?.indexOf(true) ?? -1;
      if (idx !== -1) { targetM = idx; break; }
    }
    const resolvedM = targetM ?? seq.activeTimelineCell?.measureIdx ?? seq.currentMeasure ?? 0;
    store.setTargetMeasureIdx?.(resolvedM);

    let stream: MediaStream | null = null;
    try {
      if (this.audioStream) {
        try { this.audioStream.getTracks().forEach(t => t.stop()); } catch (_) {}
        this.audioStream = null;
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioStream = stream;
      const rec = new MediaRecorder(stream);
      this.mediaRecorder = rec;
      rec.start();
    } catch (err) {
      if (stream) {
        try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      }
      this.audioStream = null;
      this.mediaRecorder = null;
      store.setRecordingStatus?.('inactive');
      store.setIsFocusRecordingMode?.(false);
      store.setTargetMeasureIdx?.(null);
      console.error('Erreur démarrage enregistrement vocal:', err);
    }
  }

  public static stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (_) {}
    }
    this.mediaRecorder = null;
    if (this.audioStream) {
      try { this.audioStream.getTracks().forEach(t => t.stop()); } catch (_) {}
      this.audioStream = null;
    }
    const store = useAudioStore.getState() as any;
    store.setRecordingStatus?.('inactive');
    store.setIsFocusRecordingMode?.(false);
    store.setTargetMeasureIdx?.(null);
    try { Tone.Transport.stop(); } catch (_) {}
    scheduleAudioContextAutoSuspend(500);
  }


  public static async loadVocalRecording(patternId: number): Promise<Blob | null> {
    try {
      const blob = await getVocalRecording(patternId);
      if (blob) {
        useAudioStore.getState().addVocalBlob(patternId, blob);
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
          const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);
          useAudioStore.getState().setVocalBuffer(patternId, audioBuffer);
        } catch (_) {}
        return blob;
      }
    } catch (_) {}
    return null;
  }

  public static async deleteRecording(patternId: number, disposeFn: (id: number) => void): Promise<void> {
    try {
      await deleteVocalRecording(patternId);
      useAudioStore.getState().removeVocalBlob(patternId);
      useAudioStore.getState().removeVocalBuffer(patternId);
      disposeFn(patternId);

      const sequencerStore = useSequencerStore.getState();
      const newTracks = sequencerStore.tracks.map((t) => {
        const hasPattern = t.patterns.some((p) => Number(p.id) === Number(patternId));
        if (!hasPattern) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (Number(p.id) !== Number(patternId)) return p;
            return {
              ...p, vocalMode: 'synth', vocalClip: undefined, vocalNudge: 0,
              vocalTrimStart: 0, vocalBaseBpm: undefined, vocalBpmSync: undefined
            } as any;
          })
        };
      });
      sequencerStore.setTracks(newTracks);
    } catch (_) {}
  }

  public static async saveValidatedRecording(patternId: number | string, blob: Blob): Promise<void> {
    const numId = Number(patternId);
    const strId = String(patternId);

    await saveVocalRecording(patternId, blob);
    if (strId !== patternId) await saveVocalRecording(strId, blob);
    if (!isNaN(numId) && numId !== patternId) await saveVocalRecording(numId, blob);

    useAudioStore.getState().addVocalBlob(patternId, blob);
    if (strId !== patternId) useAudioStore.getState().addVocalBlob(strId, blob);
    if (!isNaN(numId) && numId !== patternId) useAudioStore.getState().addVocalBlob(numId, blob);
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    VocalRecordingService.stopRecording();
  });
}
