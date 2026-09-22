/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './common.types';
export * from './preset.types';

export interface HitTrigger {
  trackId: number;
  stepIndex: number;
  state: string | number;
}

export class HitTriggerPool {
  public readonly buffer: HitTrigger[];
  public readonly size: number;
  public writeIndex: number = 0;
  public readIndex: number = 0;

  constructor(size: number = 512) {
    this.size = size;
    this.buffer = Array.from({ length: size }, () => ({
      trackId: 0,
      stepIndex: 0,
      state: 0
    }));
  }

  public push(trackId: number, stepIndex: number, state: string | number): void {
    const item = this.buffer[this.writeIndex];
    item.trackId = trackId;
    item.stepIndex = stepIndex;
    item.state = state;

    const nextWrite = (this.writeIndex + 1) % this.size;

    // Si le pointeur d'écriture percute le pointeur de lecture (Buffer Plein)
    if (nextWrite === this.readIndex) {
      // On avance le pointeur de lecture pour abandonner la note la plus ancienne non dessinée
      this.readIndex = (this.readIndex + 1) % this.size;
    }

    this.writeIndex = nextWrite;
  }

  public clear(): void {
    this.writeIndex = 0;
    this.readIndex = 0;
  }
}
