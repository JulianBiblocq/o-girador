/**
 * O Girador - Pont PCM Main Thread ↔ AudioWorklet (`MAX_WORKLET_SAMPLES = 2048`) (< 120 lignes)
 * - File d'attente asynchrone : les `AudioBuffer` enregistrés avant `addModule` sont
 *   automatiquement transmis dès `attachPort(port)`.
 * - Clonage `new Float32Array(audioBuffer.getChannelData(c))` avant transfert :
 *   0 détachement des `AudioBuffer` du Main Thread, support mono (`ch1 = null`) et stéréo.
 */

import { LoadSampleMessage, MAX_WORKLET_SAMPLES } from './percussionWorkletTypes';

export interface WorkletMessagePortLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

export class PercussionWorkletSampleBridge {
  private readonly pathToSampleId = new Map<string, number>();
  private readonly registeredBuffers = new Map<number, AudioBuffer>();
  private readonly sentToCurrentPort = new Set<number>();
  private nextSampleId = 0;
  private port: WorkletMessagePortLike | null = null;

  public attachPort(port: WorkletMessagePortLike | null): void {
    this.port = port;
    this.sentToCurrentPort.clear();
    if (!port) return;

    for (const [sampleId, audioBuffer] of this.registeredBuffers.entries()) {
      this.postSampleToWorklet(sampleId, audioBuffer);
    }
  }

  public registerSampleBuffer(path: string, audioBuffer: AudioBuffer): number {
    if (!path || !audioBuffer || typeof audioBuffer.getChannelData !== 'function') {
      return -1;
    }

    let sampleId = this.pathToSampleId.get(path);
    if (sampleId === undefined) {
      if (this.nextSampleId >= MAX_WORKLET_SAMPLES) {
        return -1;
      }
      sampleId = this.nextSampleId++;
      this.pathToSampleId.set(path, sampleId);
    }

    const prevBuffer = this.registeredBuffers.get(sampleId);
    if (prevBuffer !== audioBuffer) {
      this.registeredBuffers.set(sampleId, audioBuffer);
      this.sentToCurrentPort.delete(sampleId);
    }

    if (this.port && !this.sentToCurrentPort.has(sampleId)) {
      this.postSampleToWorklet(sampleId, audioBuffer);
    }

    return sampleId;
  }

  private postSampleToWorklet(sampleId: number, audioBuffer: AudioBuffer): void {
    if (!this.port || audioBuffer.numberOfChannels < 1) return;

    const ch0 = new Float32Array(audioBuffer.getChannelData(0));
    const ch1 =
      audioBuffer.numberOfChannels > 1
        ? new Float32Array(audioBuffer.getChannelData(1))
        : null;

    const msg: LoadSampleMessage = {
      type: 'LOAD_SAMPLE',
      sampleId,
      ch0,
      ch1,
      sampleRate: audioBuffer.sampleRate > 0 ? audioBuffer.sampleRate : 48000,
    };

    const transfers: Transferable[] = ch1 ? [ch0.buffer, ch1.buffer] : [ch0.buffer];
    try {
      this.port.postMessage(msg, transfers);
      this.sentToCurrentPort.add(sampleId);
    } catch (_) {}
  }

  public getSampleId(path: string): number {
    const id = this.pathToSampleId.get(path);
    return id !== undefined ? id : -1;
  }

  public isSampleReadyInWorklet(path: string): boolean {
    const id = this.pathToSampleId.get(path);
    return id !== undefined && this.sentToCurrentPort.has(id);
  }

  public dispose(): void {
    this.port = null;
    this.sentToCurrentPort.clear();
    this.registeredBuffers.clear();
    this.pathToSampleId.clear();
    this.nextSampleId = 0;
  }
}

