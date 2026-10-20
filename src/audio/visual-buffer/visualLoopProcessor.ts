import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import { tickSubscribers, syncAudioEngine } from './visualTickSubscribers';
import {
  tickQueue,
  hitQueue,
  TICK_QUEUE_SIZE,
  HIT_QUEUE_SIZE,
  tickWriteIdx,
  tickReadIdx,
  setTickReadIdx,
  hitWriteIdx,
  hitReadIdx,
  setHitReadIdx,
  setLastAudibleTick,
  flushVisualBuffers,
} from './visualTickRingBuffer';

let lastDispatchedBeatStep = -1;
let lastDispatchedMeasure = -1;
let rafId: number | null = null;
let audioContextRef: AudioContext | null = null;
let hitTriggersPoolRef: { current: { push: (trackId: number, stepIdx: number, strokeCode: number) => void } } | null = null;

function processVisualLoop(): void {
  if (!audioContextRef) return;
  const currentTime = audioContextRef.currentTime;
  const isUltraEco = usePerformanceStore.getState().disablePlayheadRAF;

  let currentTickRead = tickReadIdx;
  while (currentTickRead !== tickWriteIdx) {
    const evt = tickQueue[currentTickRead];
    if (evt.drawTime > currentTime) break;

    if (syncAudioEngine) {
      syncAudioEngine.currentStep = evt.step;
      syncAudioEngine.currentMeasure = evt.measure;
    }

    if (!evt.isPreRoll && useSequencerStore.getState().isPreRolling) {
      useSequencerStore.getState().setIsPreRolling(false);
    }

    const prevMeasure = useSequencerStore.getState().currentMeasure;
    if (evt.step === 0 || evt.measure !== prevMeasure) {
      useSequencerStore.getState().setCurrentMeasure(evt.measure);
    }

    let shouldDispatch = true;
    if (isUltraEco && evt.step >= 0) {
      const isBeatBoundary = evt.visualStep16 % 4 === 0;
      const isNewBeatStep = evt.visualStep16 !== lastDispatchedBeatStep || evt.measure !== lastDispatchedMeasure;
      shouldDispatch = isBeatBoundary && isNewBeatStep;
      if (shouldDispatch) {
        lastDispatchedBeatStep = evt.visualStep16;
        lastDispatchedMeasure = evt.measure;
      }
    } else if (evt.step < 0) {
      lastDispatchedBeatStep = -1;
      lastDispatchedMeasure = -1;
    }

    if (shouldDispatch) {
      setLastAudibleTick({ ...evt });
      tickSubscribers.forEach((cb) => {
        try {
          cb(evt);
        } catch (err) {
          console.error('Error in tick subscriber callback:', err);
        }
      });
    }

    currentTickRead = (currentTickRead + 1) % TICK_QUEUE_SIZE;
  }
  setTickReadIdx(currentTickRead);

  if (hitTriggersPoolRef?.current) {
    let currentHitRead = hitReadIdx;
    while (currentHitRead !== hitWriteIdx) {
      const hit = hitQueue[currentHitRead];
      if (hit.triggerTime > currentTime) break;
      hitTriggersPoolRef.current.push(hit.trackId, hit.stepIdx, hit.strokeCode);
      currentHitRead = (currentHitRead + 1) % HIT_QUEUE_SIZE;
    }
    setHitReadIdx(currentHitRead);
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
