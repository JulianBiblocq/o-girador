import { useSequencerStore } from '../../stores/useSequencerStore';
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

let rafId: number | null = null;
let audioContextRef: AudioContext | null = null;
let hitTriggersPoolRef: { current: { push: (trackId: number, stepIdx: number, strokeCode: number) => void } } | null = null;

/**
 * Boucle visuelle unique : distribue 100 % des ticks echus (zero decimation, quel que soit
 * le palier Eco) afin que Roda, Playhead Timeline et karaoke restent synchronises a 60 FPS.
 */
function processVisualLoop(): void {
  if (!audioContextRef) return;
  const currentTime = audioContextRef.currentTime;

  let currentTickRead = tickReadIdx;
  while (currentTickRead !== tickWriteIdx) {
    const evt = tickQueue[currentTickRead];
    if (evt.drawTime > currentTime) break;

    if (syncAudioEngine) {
      syncAudioEngine.currentStep = evt.step;
      syncAudioEngine.currentMeasure = evt.measure;
    }

    const st = useSequencerStore.getState();
    if (!evt.isPreRoll && st.isPreRolling) {
      st.setIsPreRolling(false);
    }

    if (st.queuedMeasure !== null && evt.step === 0 && evt.measure === st.queuedMeasure) {
      st.clearQueuedMeasure(st.queuedMeasureSeq);
    }

    setLastAudibleTick(evt);
    tickSubscribers.forEach((cb) => {
      try {
        cb(evt);
      } catch (err) {
        console.error('Error in tick subscriber callback:', err);
      }
    });

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
