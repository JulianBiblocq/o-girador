import { VisualTickEvent, VisualHitTriggerEvent } from './visualTickTypes';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';

export const TICK_QUEUE_SIZE = 512;
export const HIT_QUEUE_SIZE = 512;

export const tickQueue: VisualTickEvent[] = Array.from({ length: TICK_QUEUE_SIZE }, () => ({
  drawTime: 0, step: 0, measure: 0, maxTicks: 96, ratio: 0, visualStep16: 0, visualStep12: 0,
  time: 0, iteration: 1, loopIteration: 1, measureStartTime: 0, measureDuration: 0, targetStartTime: 0,
  isPreRoll: false, preRollMeasureIndex: 0, preRollTotalMeasures: 1, preRollBeat: 0,
}));

export const hitQueue: VisualHitTriggerEvent[] = Array.from({ length: HIT_QUEUE_SIZE }, () => ({
  triggerTime: 0, trackId: 0, stepIdx: 0, strokeCode: 0,
}));

export let tickWriteIdx = 0;
export let tickReadIdx = 0;
export function setTickReadIdx(idx: number) { tickReadIdx = idx; }

export let hitWriteIdx = 0;
export let hitReadIdx = 0;
export function setHitReadIdx(idx: number) { hitReadIdx = idx; }

const lastAudibleTickSnapshot: VisualTickEvent = {
  drawTime: 0, step: 0, measure: 0, maxTicks: 96, ratio: 0, visualStep16: 0, visualStep12: 0,
  time: 0, iteration: 1, loopIteration: 1, measureStartTime: 0, measureDuration: 0, targetStartTime: 0,
  isPreRoll: false, preRollMeasureIndex: 0, preRollTotalMeasures: 1, preRollBeat: 0,
};
let hasLastAudibleTick = false;

function copyTickEvent(dst: VisualTickEvent, src: VisualTickEvent): void {
  dst.drawTime = src.drawTime; dst.step = src.step; dst.measure = src.measure;
  dst.maxTicks = src.maxTicks; dst.ratio = src.ratio; dst.visualStep16 = src.visualStep16;
  dst.visualStep12 = src.visualStep12; dst.time = src.time; dst.iteration = src.iteration;
  dst.loopIteration = src.loopIteration ?? 1; dst.measureStartTime = src.measureStartTime;
  dst.measureDuration = src.measureDuration; dst.targetStartTime = src.targetStartTime;
  dst.isPreRoll = !!src.isPreRoll; dst.preRollMeasureIndex = src.preRollMeasureIndex ?? 0;
  dst.preRollTotalMeasures = src.preRollTotalMeasures ?? 1; dst.preRollBeat = src.preRollBeat ?? 0;
}

export function setLastAudibleTick(val: VisualTickEvent | null): void {
  if (!val) { hasLastAudibleTick = false; return; }
  copyTickEvent(lastAudibleTickSnapshot, val);
  hasLastAudibleTick = true;
}

export function getLastAudibleTick(): VisualTickEvent | null {
  return hasLastAudibleTick ? lastAudibleTickSnapshot : null;
}

export function getLiveOrStoreMeasure(storeMeasure: number): number {
  return (hasLastAudibleTick && useSequencerStore.getState().isPlaying) ? lastAudibleTickSnapshot.measure : storeMeasure;
}

export function getLiveOrStoreLoopIteration(storeIteration: number): number {
  return (hasLastAudibleTick && useSequencerStore.getState().isPlaying) ? (lastAudibleTickSnapshot.loopIteration ?? storeIteration) : storeIteration;
}

export function pushVisualTick(event: VisualTickEvent): void {
  if (typeof document !== 'undefined' && document.hidden) return;
  const nextWriteIdx = (tickWriteIdx + 1) % TICK_QUEUE_SIZE;
  if (nextWriteIdx === tickReadIdx) tickReadIdx = (tickReadIdx + 1) % TICK_QUEUE_SIZE;
  copyTickEvent(tickQueue[tickWriteIdx], event);
  tickWriteIdx = nextWriteIdx;
}

export function purgeVisualTickBuffer(): void {
  tickReadIdx = tickWriteIdx; hitReadIdx = hitWriteIdx; hasLastAudibleTick = false;
}

export function resetVisualTickBuffer(): void {
  tickReadIdx = tickWriteIdx; hitReadIdx = hitWriteIdx; hasLastAudibleTick = false;
}

export function pushVisualHitTrigger(trackId: number, stepIdx: number, strokeCode: number, triggerTime: number): void {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (useSequencerStore.getState().isPreRolling) return;
  const nextWriteIdx = (hitWriteIdx + 1) % HIT_QUEUE_SIZE;
  if (nextWriteIdx === hitReadIdx) hitReadIdx = (hitReadIdx + 1) % HIT_QUEUE_SIZE;
  const slot = hitQueue[hitWriteIdx];
  slot.triggerTime = triggerTime + getBluetoothVisualOffsetSec();
  slot.trackId = trackId; slot.stepIdx = stepIdx; slot.strokeCode = strokeCode;
  hitWriteIdx = nextWriteIdx;
}

export function flushVisualBuffers(): void {
  tickReadIdx = 0; tickWriteIdx = 0; hitReadIdx = 0; hitWriteIdx = 0; hasLastAudibleTick = false;
}
