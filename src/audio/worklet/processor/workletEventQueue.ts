/**
 * O Girador - File d'Horizon Pré-allouée (`MAX_EVENTS = 4096`, Zéro Allocation / Zéro Closure) (< 135 lignes)
 * Maintient un index trié par `triggerFrame` croissant par recherche dichotomique + `copyWithin`.
 */

import { MAX_WORKLET_EVENTS, WORKLET_EVENT_STRIDE } from '../percussionWorkletTypes';

export class WorkletEventQueue {
  public readonly triggerFrame = new Float64Array(MAX_WORKLET_EVENTS);
  public readonly trackId = new Int32Array(MAX_WORKLET_EVENTS);
  public readonly slot = new Uint8Array(MAX_WORKLET_EVENTS);
  public readonly sampleId = new Uint16Array(MAX_WORKLET_EVENTS);
  public readonly velocity = new Float32Array(MAX_WORKLET_EVENTS);
  public readonly strokeBaseGain = new Float32Array(MAX_WORKLET_EVENTS);
  public readonly stepDecayNorm = new Float32Array(MAX_WORKLET_EVENTS);
  public readonly eventPitchNuance = new Float32Array(MAX_WORKLET_EVENTS);
  public readonly flags = new Uint32Array(MAX_WORKLET_EVENTS);

  private readonly freePool = new Uint16Array(MAX_WORKLET_EVENTS);
  private freeTop = MAX_WORKLET_EVENTS;
  private readonly sortedOrder = new Uint16Array(MAX_WORKLET_EVENTS);
  public activeCount = 0;

  constructor() {
    this.clear();
  }

  public clear(): void {
    for (let i = 0; i < MAX_WORKLET_EVENTS; i++) {
      this.freePool[i] = MAX_WORKLET_EVENTS - 1 - i;
    }
    this.freeTop = MAX_WORKLET_EVENTS;
    this.activeCount = 0;
  }

  private findInsertPos(targetFrame: number): number {
    let low = 0;
    let high = this.activeCount;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const midSlot = this.sortedOrder[mid];
      if (this.triggerFrame[midSlot] <= targetFrame) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  public pushPackedEvents(eventsData: Float64Array, eventCount: number): void {
    const maxReadable = Math.min(eventCount, Math.floor(eventsData.length / WORKLET_EVENT_STRIDE));
    for (let i = 0; i < maxReadable; i++) {
      if (this.freeTop === 0) {
        // Si la file est pleine à 4096 événements, recycle l'événement le plus lointain dans le futur
        this.activeCount--;
        this.freePool[this.freeTop++] = this.sortedOrder[this.activeCount];
      }
      const storageIdx = this.freePool[--this.freeTop];
      const base = i * WORKLET_EVENT_STRIDE;
      const tFrame = eventsData[base];

      this.triggerFrame[storageIdx] = tFrame;
      this.trackId[storageIdx] = eventsData[base + 1] | 0;
      this.slot[storageIdx] = eventsData[base + 2] & 0xFF;
      this.sampleId[storageIdx] = eventsData[base + 3] & 0xFFFF;
      this.velocity[storageIdx] = eventsData[base + 4];
      this.strokeBaseGain[storageIdx] = eventsData[base + 5];
      this.stepDecayNorm[storageIdx] = eventsData[base + 6];
      this.eventPitchNuance[storageIdx] = eventsData[base + 7];
      this.flags[storageIdx] = eventsData[base + 8] >>> 0;

      const insPos = this.findInsertPos(tFrame);
      if (insPos < this.activeCount) {
        this.sortedOrder.copyWithin(insPos + 1, insPos, this.activeCount);
      }
      this.sortedOrder[insPos] = storageIdx;
      this.activeCount++;
    }
  }

  public peekEarliestStorageIdx(): number {
    return this.activeCount > 0 ? this.sortedOrder[0] : -1;
  }

  public popEarliest(): number {
    if (this.activeCount <= 0) return -1;
    const storageIdx = this.sortedOrder[0];
    this.activeCount--;
    if (this.activeCount > 0) {
      this.sortedOrder.copyWithin(0, 1, this.activeCount + 1);
    }
    this.freePool[this.freeTop++] = storageIdx;
    return storageIdx;
  }

  public purgeFromFrame(fromFrame: number, measureSeqId?: number): void {
    let writeIdx = 0;
    for (let r = 0; r < this.activeCount; r++) {
      const sIdx = this.sortedOrder[r];
      const evtSeqId = this.flags[sIdx] >>> 1;
      const shouldDrop =
        this.triggerFrame[sIdx] >= fromFrame &&
        (measureSeqId === undefined || evtSeqId === measureSeqId);
      if (shouldDrop) {
        this.freePool[this.freeTop++] = sIdx;
      } else {
        this.sortedOrder[writeIdx++] = sIdx;
      }
    }
    this.activeCount = writeIdx;
  }

  public purgeTrack(targetTrackId: number): void {
    let writeIdx = 0;
    for (let r = 0; r < this.activeCount; r++) {
      const sIdx = this.sortedOrder[r];
      if (this.trackId[sIdx] === targetTrackId) {
        this.freePool[this.freeTop++] = sIdx;
      } else {
        this.sortedOrder[writeIdx++] = sIdx;
      }
    }
    this.activeCount = writeIdx;
  }
}

