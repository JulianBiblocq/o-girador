/**
 * Visual Tick & Hit Trigger Ring Buffer for High-Performance Standalone rAF Dispatch
 * Bypasses Tone.Draw to prevent dropped visual animations on mobile devices (where rAF throttling
 * causes Tone.Draw scheduled events to expire past their 250ms threshold).
 */

import { tickSubscribers, audioEngine } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';

export interface VisualTickEvent {
  drawTime: number;
  step: number;
  measure: number;
  maxTicks: number;
  ratio: number;
  visualStep16: number;
  visualStep12: number;
  time: number;
  iteration: number;
  measureStartTime?: number;
  measureDuration?: number;
}

export interface VisualHitTriggerEvent {
  triggerTime: number;
  trackId: number;
  stepIdx: number;
  strokeCode: number;
}

const TICK_QUEUE_SIZE = 128;
const HIT_QUEUE_SIZE = 256;

// Pre-allocate zero-GC queues
const tickQueue: VisualTickEvent[] = Array.from({ length: TICK_QUEUE_SIZE }, () => ({
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
}));

const hitQueue: VisualHitTriggerEvent[] = Array.from({ length: HIT_QUEUE_SIZE }, () => ({
  triggerTime: 0,
  trackId: 0,
  stepIdx: 0,
  strokeCode: 0,
}));

let tickWriteIdx = 0;
let tickReadIdx = 0;

let hitWriteIdx = 0;
let hitReadIdx = 0;

let rafId: number | null = null;
let audioContextRef: AudioContext | null = null;
let hitTriggersPoolRef: { current: { push: (trackId: number, stepIdx: number, strokeCode: number) => void } } | null = null;

export function pushVisualTick(event: VisualTickEvent): void {
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

  tickWriteIdx = (tickWriteIdx + 1) % TICK_QUEUE_SIZE;
}

export function pushVisualHitTrigger(trackId: number, stepIdx: number, strokeCode: number, triggerTime: number): void {
  const slot = hitQueue[hitWriteIdx];
  slot.triggerTime = triggerTime;
  slot.trackId = trackId;
  slot.stepIdx = stepIdx;
  slot.strokeCode = strokeCode;

  hitWriteIdx = (hitWriteIdx + 1) % HIT_QUEUE_SIZE;
}

function processVisualLoop(): void {
  if (!audioContextRef) return;

  const currentTime = audioContextRef.currentTime;

  // 1. Process pending tick events up to current audio time (never expire/drop)
  while (tickReadIdx !== tickWriteIdx) {
    const evt = tickQueue[tickReadIdx];
    if (evt.drawTime > currentTime) {
      break; // Future event, wait for next frames
    }

    if (audioEngine) {
      audioEngine.currentStep = evt.step;
      audioEngine.currentMeasure = evt.measure;
    }

    const prevMeasure = useSequencerStore.getState().currentMeasure;
    if (evt.step === 0 || evt.measure !== prevMeasure) {
      useSequencerStore.getState().setCurrentMeasure(evt.measure);
    }

    tickSubscribers.forEach((cb) => {
      try {
        cb(evt);
      } catch (err) {
        console.error('Error in tick subscriber callback:', err);
      }
    });

    tickReadIdx = (tickReadIdx + 1) % TICK_QUEUE_SIZE;
  }

  // 2. Process pending hit triggers up to current audio time
  if (hitTriggersPoolRef?.current) {
    while (hitReadIdx !== hitWriteIdx) {
      const hit = hitQueue[hitReadIdx];
      if (hit.triggerTime > currentTime) {
        break; // Future event
      }

      hitTriggersPoolRef.current.push(hit.trackId, hit.stepIdx, hit.strokeCode);

      hitReadIdx = (hitReadIdx + 1) % HIT_QUEUE_SIZE;
    }
  }

  rafId = requestAnimationFrame(processVisualLoop);
}

export function startVisualLoop(
  ctx: AudioContext,
  hitTriggersRef?: { current: { push: (trackId: number, stepIdx: number, strokeCode: number) => void } }
): void {
  audioContextRef = ctx;
  if (hitTriggersRef) {
    hitTriggersPoolRef = hitTriggersRef;
  }

  if (rafId === null) {
    rafId = requestAnimationFrame(processVisualLoop);
  }
}

export function stopVisualLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  flushVisualBuffers();
}

export function flushVisualBuffers(): void {
  tickReadIdx = 0;
  tickWriteIdx = 0;
  hitReadIdx = 0;
  hitWriteIdx = 0;
}
