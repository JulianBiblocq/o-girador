/**
 * O Girador - Audio Engine Round-Robin Selection with Anti-Collision
 */

import { StrokeMapping } from '../../data/audioConfig';

export class EngineRoundRobin {
  public lastPlayedIndices = new Map<string, Map<string, number>>();
  public timeStrokeIndicesUsed = new Map<string, number[]>();

  public selectFile(instrumentId: string, stroke: StrokeMapping, time: number): string {
    const numFiles = stroke.files.length;
    let chosenIdx = 0;

    let instMap = this.lastPlayedIndices.get(instrumentId);
    if (!instMap) {
      instMap = new Map<string, number>();
      this.lastPlayedIndices.set(instrumentId, instMap);
    }

    const timeSlot = Math.round(time * 333);
    const timeKey = `${timeSlot}_${instrumentId}_${stroke.symbol}`;
    if (!this.timeStrokeIndicesUsed.has(timeKey)) {
      if (this.timeStrokeIndicesUsed.size > 2000) {
        this.timeStrokeIndicesUsed.clear();
      }
      this.timeStrokeIndicesUsed.set(timeKey, []);
    }
    const usedIndices = this.timeStrokeIndicesUsed.get(timeKey)!;

    if (numFiles > 1) {
      const lastIdx = instMap.has(stroke.symbol) ? instMap.get(stroke.symbol)! : -1;
      const candidates: number[] = [];
      for (let i = 0; i < numFiles; i++) {
        if (!usedIndices.includes(i) && i !== lastIdx) {
          candidates.push(i);
        }
      }

      if (candidates.length === 0) {
        for (let i = 0; i < numFiles; i++) {
          if (!usedIndices.includes(i)) candidates.push(i);
        }
      }

      if (candidates.length === 0) {
        for (let i = 0; i < numFiles; i++) candidates.push(i);
      }

      const randIdx = Math.floor(Math.random() * candidates.length);
      chosenIdx = candidates[randIdx];
      usedIndices.push(chosenIdx);
      instMap.set(stroke.symbol, chosenIdx);
    } else {
      chosenIdx = 0;
      usedIndices.push(0);
      instMap.set(stroke.symbol, 0);
    }

    return stroke.files[chosenIdx];
  }

  public clear(): void {
    this.lastPlayedIndices.clear();
    this.timeStrokeIndicesUsed.clear();
  }
}
