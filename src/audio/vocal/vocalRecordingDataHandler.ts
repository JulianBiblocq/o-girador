/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function resolveRecordingContext(patternId: number): { trackId: number; measureIdx: number } {
  const seq = useSequencerStore.getState();
  let trackId = 0;
  let targetM: number | null = null;

  for (const t of seq.tracks) {
    const p = t.patterns?.find(x => x.id === patternId);
    if (p) {
      trackId = t.id;
      const idx = p.measureAssignments?.indexOf(true) ?? -1;
      if (idx !== -1) {
        targetM = idx;
        break;
      }
    }
  }

  const measureIdx = targetM ?? seq.activeTimelineCell?.measureIdx ?? seq.currentMeasure ?? 0;
  return { trackId, measureIdx };
}

export class VocalRecordingDataHandler {
  private chunks: BlobPart[] = [];
  private patternId: number;
  private trackId: number;
  private measureIdx: number;

  constructor(patternId: number, trackId: number, measureIdx: number) {
    this.patternId = patternId;
    this.trackId = trackId;
    this.measureIdx = measureIdx;
  }

  public handleDataAvailable(event: BlobEvent): void {
    if (event.data && event.data.size > 0) {
      this.chunks.push(event.data);
    }
  }

  public async handleStop(recorder: MediaRecorder): Promise<void> {
    if (this.chunks.length === 0) return;
    const mimeType = recorder.mimeType || 'audio/webm';
    const blob = new Blob(this.chunks, { type: mimeType });
    this.chunks = [];

    try {
      const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

      useAudioStore.getState().setTempRecording({
        patternId: this.patternId,
        trackId: this.trackId,
        audioBuffer,
        blob,
        isImported: false,
        targetMeasureIdx: this.measureIdx,
      });
    } catch (err) {
      console.error('Erreur décodage enregistrement vocal:', err);
    }
  }
}
