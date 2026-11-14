/**
 * O Girador - Audio Engine Shuffle-Bag Round-Robin + Exclusion Mutuelle Inter-Pistes +-30 ms (< 90 lignes)
 */
import { StrokeMapping } from '../../data/audioConfig';
import { createShuffleBagState, drawFromShuffleBag, ShuffleBagState } from './shuffleBagHelper';

interface PoolTrigger {
  time: number;
  fileIdx: number;
  trackKey: string;
}

const INTER_TRACK_EXCLUSION_SEC = 0.030;
const TRIGGER_HISTORY_HORIZON_SEC = 0.120;

export class EngineRoundRobin {
  public bagStates = new Map<string, ShuffleBagState>();
  public recentPoolTriggers = new Map<string, PoolTrigger[]>();

  public static getSamplePoolKey(instrumentId: string, stroke: StrokeMapping): string {
    return stroke.files.length > 0 ? stroke.files.join('|') : `${instrumentId}_${stroke.symbol}`;
  }

  public selectFile(
    instrumentId: string,
    stroke: StrokeMapping,
    time: number,
    trackId?: number | string | null
  ): string {
    const numFiles = stroke.files.length;
    if (numFiles <= 1) return stroke.files[0] || '';

    const samplePoolKey = EngineRoundRobin.getSamplePoolKey(instrumentId, stroke);
    const trackKey = `${trackId ?? instrumentId}__${samplePoolKey}`;

    let triggers = this.recentPoolTriggers.get(samplePoolKey);
    if (!triggers) {
      triggers = [];
      this.recentPoolTriggers.set(samplePoolKey, triggers);
    } else if (triggers.length > 32) {
      triggers = triggers.filter((e) => Math.abs(time - e.time) <= TRIGGER_HISTORY_HORIZON_SEC);
      this.recentPoolTriggers.set(samplePoolKey, triggers);
    }

    const forbiddenIndices = new Set<number>();
    for (let i = 0; i < triggers.length; i++) {
      const tr = triggers[i];
      if (tr.trackKey !== trackKey && Math.abs(time - tr.time) <= INTER_TRACK_EXCLUSION_SEC) {
        forbiddenIndices.add(tr.fileIdx);
      }
    }

    let bagState = this.bagStates.get(trackKey);
    if (!bagState) {
      bagState = createShuffleBagState();
      this.bagStates.set(trackKey, bagState);
    }

    const chosenIdx = drawFromShuffleBag(bagState, numFiles, forbiddenIndices);
    triggers.push({ time, fileIdx: chosenIdx, trackKey });

    if (this.bagStates.size > 2000) this.bagStates.clear();
    if (this.recentPoolTriggers.size > 500) this.recentPoolTriggers.clear();

    return stroke.files[chosenIdx];
  }

  public purgeFromTime(fromTimeSec: number): void {
    for (const [key, list] of this.recentPoolTriggers.entries()) {
      const kept = list.filter((e) => e.time < fromTimeSec);
      if (kept.length > 0) this.recentPoolTriggers.set(key, kept);
      else this.recentPoolTriggers.delete(key);
    }
  }

  public clear(): void {
    this.bagStates.clear();
    this.recentPoolTriggers.clear();
  }
}
