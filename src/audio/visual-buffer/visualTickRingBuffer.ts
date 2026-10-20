import { VisualTickEvent, VisualHitTriggerEvent } from './visualTickTypes';
import { useSequencerStore } from '../../stores/useSequencerStore';

export const TICK_QUEUE_SIZE = 512;
export const HIT_QUEUE_SIZE = 512;

export const tickQueue: VisualTickEvent[] = Array.from({ length: TICK_QUEUE_SIZE }, () => ({
  drawTime: 0,
  step: 0,
  measure: 0,
  maxTicks: 96,
  ratio: 0,
  visualStep16: 0,
  visualStep12: 0,
  time: 0,
  iteration: 1,
  measureStartTime: 0,
  measureDuration: 0,
  targetStartTime: 0,
  isPreRoll: false,
  preRollMeasureIndex: 0,
  preRollTotalMeasures: 1,
  preRollBeat: 0,
}));

export const hitQueue: VisualHitTriggerEvent[] = Array.from({ length: HIT_QUEUE_SIZE }, () => ({
  triggerTime: 0,
  trackId: 0,
  stepIdx: 0,
  strokeCode: 0,
}));

export let tickWriteIdx = 0;
export let tickReadIdx = 0;
export function setTickReadIdx(idx: number) { tickReadIdx = idx; }

export let hitWriteIdx = 0;
export let hitReadIdx = 0;
export function setHitReadIdx(idx: number) { hitReadIdx = idx; }

export let lastAudibleTick: VisualTickEvent | null = null;
export function setLastAudibleTick(val: VisualTickEvent | null) { lastAudibleTick = val; }
export function getLastAudibleTick(): VisualTickEvent | null { return lastAudibleTick; }

export function pushVisualTick(event: VisualTickEvent): void {
  if (typeof document !== 'undefined' && document.hidden) return;

  const nextWriteIdx = (tickWriteIdx + 1) % TICK_QUEUE_SIZE;
  if (nextWriteIdx === tickReadIdx) {
    tickReadIdx = (tickReadIdx + 1) % TICK_QUEUE_SIZE;
  }

  const slot = tickQueue[tickWriteIdx];
  slot.drawTime = event.drawTime;
  slot.step = event.step;
  slot.measure = event.measure;
  slot.maxTicks = event.maxTicks;
  slot.ratio = event.ratio;
  slot.visualStep16 = event.visualStep16;
  slot.visualStep12 = event.visualStep12;
  slot.time = event.time;
  slot.iteration = event.iteration;
  slot.measureStartTime = event.measureStartTime;
  slot.measureDuration = event.measureDuration;
  slot.targetStartTime = event.targetStartTime;
  slot.isPreRoll = !!event.isPreRoll;
  slot.preRollMeasureIndex = event.preRollMeasureIndex ?? 0;
  slot.preRollTotalMeasures = event.preRollTotalMeasures ?? 1;
  slot.preRollBeat = event.preRollBeat ?? 0;

  tickWriteIdx = nextWriteIdx;
}

export function purgeVisualTickBuffer(): void {
  tickReadIdx = tickWriteIdx;
  hitReadIdx = hitWriteIdx;
}

export function resetVisualTickBuffer(): void {
  tickReadIdx = tickWriteIdx;
  hitReadIdx = hitWriteIdx;
  lastAudibleTick = null;
}

export function pushVisualHitTrigger(trackId: number, stepIdx: number, strokeCode: number, triggerTime: number): void {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (useSequencerStore.getState().isPreRolling) return;

  const nextWriteIdx = (hitWriteIdx + 1) % HIT_QUEUE_SIZE;
  if (nextWriteIdx === hitReadIdx) {
    hitReadIdx = (hitReadIdx + 1) % HIT_QUEUE_SIZE;
  }

  const slot = hitQueue[hitWriteIdx];
  slot.triggerTime = triggerTime;
  slot.trackId = trackId;
  slot.stepIdx = stepIdx;
  slot.strokeCode = strokeCode;

  hitWriteIdx = nextWriteIdx;
}

export function flushVisualBuffers(): void {
  tickReadIdx = 0;
  tickWriteIdx = 0;
  hitReadIdx = 0;
  hitWriteIdx = 0;
}
