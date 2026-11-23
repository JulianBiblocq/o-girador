/**
 * O Girador - Audio Engine Shuffle-Bag Round-Robin + Exclusion Atomique Inter-Pistes & Escouades +-35 ms (< 130 lignes)
 */
import { StrokeMapping } from '../../data/audioConfig';
import { createShuffleBagState, drawFromShuffleBag, ShuffleBagState } from './shuffleBagHelper';

interface PoolTrigger {
  time: number;
  fileIdx: number;
  trackKey: string;
  playerKey: string;
}

const INTER_TRACK_EXCLUSION_SEC = 0.035;
const TRIGGER_HISTORY_HORIZON_SEC = 0.140;

export class EngineRoundRobin {
  public bagStates = new Map<string, ShuffleBagState>();
  public recentPoolTriggers = new Map<string, PoolTrigger[]>();
  public lastFileByPlayerKey = new Map<string, number>();
  private playerTriggerHistory = new Map<string, { time: number; fileIdx: number }[]>();

  public static getSamplePoolKey(instrumentId: string, stroke: StrokeMapping): string {
    return stroke.files.length > 0 ? stroke.files.join('|') : `${instrumentId}_${stroke.symbol}`;
  }

  public selectSquadFileIndices(
    instrumentId: string,
    stroke: StrokeMapping,
    time: number,
    count: number,
    trackId?: number | string | null
  ): number[] {
    const requested = Math.max(1, count | 0);
    const numFiles = stroke.files.length;
    if (numFiles <= 1) return Array(requested).fill(0);

    const samplePoolKey = EngineRoundRobin.getSamplePoolKey(instrumentId, stroke);
    const trackKey = `${trackId ?? instrumentId}__${samplePoolKey}`;

    let triggers = this.recentPoolTriggers.get(samplePoolKey);
    if (!triggers) {
      triggers = [];
      this.recentPoolTriggers.set(samplePoolKey, triggers);
    } else if (triggers.length > 64) {
      triggers = triggers.filter((e) => Math.abs(time - e.time) <= TRIGGER_HISTORY_HORIZON_SEC);
      this.recentPoolTriggers.set(samplePoolKey, triggers);
    }

    const forbiddenIndices = new Set<number>();
    const usageCountInWindow = new Int32Array(numFiles);
    for (let i = 0; i < triggers.length; i++) {
      const tr = triggers[i];
      if (Math.abs(time - tr.time) <= INTER_TRACK_EXCLUSION_SEC && tr.fileIdx >= 0 && tr.fileIdx < numFiles) {
        usageCountInWindow[tr.fileIdx]++;
        forbiddenIndices.add(tr.fileIdx);
      }
    }

    let bagState = this.bagStates.get(trackKey);
    if (!bagState) {
      bagState = createShuffleBagState();
      this.bagStates.set(trackKey, bagState);
    }

    const drawn: number[] = [];
    for (let k = 0; k < requested; k++) {
      const playerKey = `${trackKey}__p${k}`;
      const prevPlayerIdx = this.lastFileByPlayerKey.get(playerKey);
      const playerForbidden = new Set(forbiddenIndices);
      if (prevPlayerIdx !== undefined && numFiles >= 2) {
        playerForbidden.add(prevPlayerIdx);
      }

      let chosenIdx: number;
      if (playerForbidden.size < numFiles) {
        chosenIdx = drawFromShuffleBag(bagState, numFiles, playerForbidden);
      } else {
        let bestIdx = -1;
        let bestCount = Infinity;
        for (let f = 0; f < numFiles; f++) {
          if (numFiles >= 2 && f === prevPlayerIdx) continue;
          if (usageCountInWindow[f] < bestCount) { bestCount = usageCountInWindow[f]; bestIdx = f; }
        }
        chosenIdx = bestIdx >= 0 ? bestIdx : (prevPlayerIdx !== undefined ? (prevPlayerIdx + 1) % numFiles : 0);
      }
      this.lastFileByPlayerKey.set(playerKey, chosenIdx);
      let pHist = this.playerTriggerHistory.get(playerKey);
      if (!pHist) { pHist = []; this.playerTriggerHistory.set(playerKey, pHist); }
      pHist.push({ time, fileIdx: chosenIdx });
      if (pHist.length > 24) pHist.shift();

      forbiddenIndices.add(chosenIdx);
      usageCountInWindow[chosenIdx]++;
      triggers.push({ time, fileIdx: chosenIdx, trackKey, playerKey });
      drawn.push(chosenIdx);
    }

    if (this.bagStates.size > 2000) this.bagStates.clear();
    if (this.recentPoolTriggers.size > 500) this.recentPoolTriggers.clear();
    if (this.lastFileByPlayerKey.size > 4000) { this.lastFileByPlayerKey.clear(); this.playerTriggerHistory.clear(); }

    return drawn;
  }

  public selectFileIndex(instrumentId: string, stroke: StrokeMapping, time: number, trackId?: number | string | null): number {
    return this.selectSquadFileIndices(instrumentId, stroke, time, 1, trackId)[0] ?? 0;
  }

  public selectFile(instrumentId: string, stroke: StrokeMapping, time: number, trackId?: number | string | null): string {
    if (stroke.files.length <= 1) return stroke.files[0] || '';
    return stroke.files[this.selectFileIndex(instrumentId, stroke, time, trackId)] || stroke.files[0] || '';
  }

  public purgeFromTime(fromTimeSec: number): void {
    for (const [key, list] of this.recentPoolTriggers.entries()) {
      const kept = list.filter((e) => e.time < fromTimeSec);
      if (kept.length > 0) this.recentPoolTriggers.set(key, kept);
      else this.recentPoolTriggers.delete(key);
    }
    for (const [pKey, hist] of this.playerTriggerHistory.entries()) {
      while (hist.length > 0 && hist[hist.length - 1].time >= fromTimeSec) hist.pop();
      if (hist.length > 0) this.lastFileByPlayerKey.set(pKey, hist[hist.length - 1].fileIdx);
      else { this.playerTriggerHistory.delete(pKey); this.lastFileByPlayerKey.delete(pKey); }
    }
  }

  public clear(): void {
    this.bagStates.clear(); this.recentPoolTriggers.clear();
    this.lastFileByPlayerKey.clear(); this.playerTriggerHistory.clear();
  }
}
