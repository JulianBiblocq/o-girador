/**
 * O Girador - Vocal Engine Service Orchestrator
 */

import { VocalPresetId } from './vocalPresets';
import { applyVocalPresetLive } from './vocalSynthService';
import { workerSetTimeout, workerClearTimeout } from './vocal/vocalWorkerTimer';
import { ActiveVocal } from './vocal/vocalTypes';
import { resolveVocalOutputNode } from './vocal/vocalOutputNode';
import { VocalPlayerPool } from './vocal/vocalPlayerPool';
import { VocalRecordingService } from './vocal/vocalRecordingService';
import { VocalRehydration } from './vocal/vocalRehydration';
import { VocalOffsetScanner } from './vocal/vocalOffsetScanner';
import { VocalSequencerPlayer } from './vocal/vocalSequencerPlayer';

export { workerSetTimeout, workerClearTimeout, resolveVocalOutputNode };
export type { ActiveVocal };

export const vocalEngineService = {
  get mediaRecorder() { return VocalRecordingService.mediaRecorder; },
  set mediaRecorder(v: MediaRecorder | null) { VocalRecordingService.mediaRecorder = v; },
  get audioStream() { return VocalRecordingService.audioStream; },
  set audioStream(v: MediaStream | null) { VocalRecordingService.audioStream = v; },

  async startRecording(patternId: number): Promise<void> {
    return VocalRecordingService.startRecording(patternId);
  },
  stopRecording(): void {
    VocalRecordingService.stopRecording();
  },
  applyVocalPreset(presetId: VocalPresetId): void {
    applyVocalPresetLive(presetId);
  },
  getRehydratingPromise(): Promise<void> | null {
    return VocalRehydration.getRehydratingPromise();
  },
  async rehydrateVocalBuffers(tracksToScan?: any[]): Promise<void> {
    return VocalRehydration.rehydrateVocalBuffers(tracksToScan);
  },
  getPatternFirstNoteOffset(pattern: any, bpm: number): number {
    return VocalOffsetScanner.getPatternFirstNoteOffset(pattern, bpm);
  },
  async loadVocalRecording(patternId: number): Promise<Blob | null> {
    return VocalRecordingService.loadVocalRecording(patternId);
  },
  async deleteVocalRecording(patternId: number): Promise<void> {
    return VocalRecordingService.deleteRecording(patternId, (id) => this.disposeVocalPlayer(id));
  },
  getOrCreateVocalPlayer(
    vocalKey: string,
    audioBuffer: AudioBuffer,
    outputNode: any,
    isCoroTrack: boolean = false,
    trackId?: string | number,
    useDirectPlayer: boolean = false
  ): ActiveVocal {
    return VocalPlayerPool.getOrCreate(vocalKey, audioBuffer, outputNode, isCoroTrack, trackId, useDirectPlayer);
  },
  disposeVocalPlayer(trackIdOrKey: string | number, patternId?: number): void {
    VocalPlayerPool.disposePlayer(trackIdOrKey, patternId);
  },
  disposeAllVocalPlayers(): void {
    VocalPlayerPool.disposeAll();
  },
  stopVocalPattern(patternId: number | string, trackId?: string | number): void {
    VocalPlayerPool.stopPattern(patternId, trackId);
  },
  stopAllVocalPlayback(): void {
    VocalPlayerPool.stopAll();
  },
  async saveValidatedRecording(patternId: number | string, blob: Blob): Promise<void> {
    return VocalRecordingService.saveValidatedRecording(patternId, blob);
  },
  async playVocalPattern(patternId: number, time: number, onStop?: () => void, trackId?: string | number): Promise<void> {
    return VocalSequencerPlayer.playPreview(patternId, time, onStop, trackId, (id) => this.loadVocalRecording(id));
  },
  playSequencerVocal(
    trackId: string | number,
    patternId: number | string,
    measureStartTime: number,
    currentBpm: number,
    outputNode: any,
    trackVolPct: number,
    isCoroTrack: boolean,
    onStop?: () => void,
    isDirectStep0: boolean = false
  ): any {
    return VocalSequencerPlayer.playSequencerVocal(
      trackId, patternId, measureStartTime, currentBpm, outputNode, trackVolPct, isCoroTrack, onStop, isDirectStep0
    );
  }
};
