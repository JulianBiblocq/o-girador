import { useSequencerStore } from '../../stores/useSequencerStore';
import { detachedWindowManager } from '../../utils/detachedWindowManager';
import { syncAudibleTickVariationRef } from '../../hooks/audio-sync/liveVariationSnapshotStore';
import {
  lookaheadTickSubscribers,
  syncAudioEngine,
  tickSubscribers,
  visualFrameSubscribers,
} from './visualTickSubscribers';
import {
  flushVisualBuffers,
  lookaheadTickReadIdx,
  setLastAudibleTick,
  setLookaheadTickReadIdx,
  setOnTickPushedWakeHook,
  setTickReadIdx,
  TICK_QUEUE_SIZE,
  tickQueue,
  tickReadIdx,
  tickWriteIdx,
  VISUAL_LOOKAHEAD_SEC,
} from './visualTickRingBuffer';

let rafId: number | null = null;
let rafHostWin: Window | null = null;
let audioContextRef: AudioContext | null = null;

function scheduleNextVisualFrame(): void {
  if (typeof window === 'undefined' || rafId !== null) return;
  const satWin = typeof document !== 'undefined' && document.hidden ? detachedWindowManager.getWindow('satellite') : null;
  const hostWin = (satWin && !satWin.closed && !satWin.document?.hidden ? satWin : null) || window;
  rafHostWin = hostWin;
  rafId = hostWin.requestAnimationFrame(processVisualLoop);
}

export function wakeVisualLoop(): void {
  if (audioContextRef && rafId === null) {
    scheduleNextVisualFrame();
  }
}

setOnTickPushedWakeHook(wakeVisualLoop);

/**
 * Dépile dans un ordre déterministe strict au sein de la même trame VSync :
 * 1) Canal anticipé `85 ms` (`lookaheadTickSubscribers` — Ao Vivo WAAPI GPU `delay`),
 * 2) Canal synchrone `0 ms` (`tickSubscribers` — Roda, Timeline, Karaoké, Conducteur),
 * 3) Rendu unifié post-ticks (`visualFrameSubscribers` — Roda `<canvas>` & Aiguille).
 */
export function drainVisualLoopAtTime(currentTime: number): void {
  const lookaheadHorizon = currentTime + VISUAL_LOOKAHEAD_SEC;
  let curLookahead = lookaheadTickReadIdx;
  while (curLookahead !== tickWriteIdx) {
    const evt = tickQueue[curLookahead];
    if (evt.drawTime > lookaheadHorizon) break;
    if (!evt.isPreRoll && lookaheadTickSubscribers.size > 0) {
      lookaheadTickSubscribers.forEach((cb) => {
        try { cb(evt); } catch (err) { console.error('Error in lookahead tick subscriber:', err); }
      });
    }
    curLookahead = (curLookahead + 1) % TICK_QUEUE_SIZE;
  }
  setLookaheadTickReadIdx(curLookahead);

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
    if (!evt.isPreRoll) {
      syncAudibleTickVariationRef(evt.measureSeqId, evt.measure);
    }
    tickSubscribers.forEach((cb) => {
      try { cb(evt); } catch (err) { console.error('Error in tick subscriber callback:', err); }
    });

    currentTickRead = (currentTickRead + 1) % TICK_QUEUE_SIZE;
  }
  setTickReadIdx(currentTickRead);

  visualFrameSubscribers.forEach((cb) => {
    try { cb(currentTime); } catch (err) { console.error('Error in visual frame subscriber:', err); }
  });
}

function processVisualLoop(): void {
  rafId = null;
  if (!audioContextRef) return;
  const currentTime = audioContextRef.currentTime;
  drainVisualLoopAtTime(currentTime);

  const st = useSequencerStore.getState();
  const hasPendingTicks = tickReadIdx !== tickWriteIdx || lookaheadTickReadIdx !== tickWriteIdx;
  if (st.isPlaying || st.isPreRolling || hasPendingTicks) {
    scheduleNextVisualFrame();
  }
}

export function startVisualLoop(ctx: AudioContext, _hitTriggersRef?: unknown): void {
  audioContextRef = ctx;
  scheduleNextVisualFrame();
}

export function stopVisualLoop(): void {
  if (rafId !== null) {
    try { (rafHostWin || window).cancelAnimationFrame(rafId); } catch {}
    rafId = null;
    rafHostWin = null;
  }
  flushVisualBuffers();
}
