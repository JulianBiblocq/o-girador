/**
 * Visual Tick & Lookahead Ring Buffer for High-Performance Unified VSync Dispatch
 */

export * from './visual-buffer/visualTickTypes';
export * from './visual-buffer/visualTickSubscribers';
export * from './visual-buffer/visualLatencyLock';
export {
  TICK_QUEUE_SIZE,
  HIT_QUEUE_SIZE,
  VISUAL_LOOKAHEAD_SEC,
  setLastAudibleTick,
  getLastAudibleTick,
  getLiveMeasureSeqId,
  getLiveOrStoreMeasure,
  getLiveOrStoreLoopIteration,
  pushVisualTick,
  purgeVisualTickBuffer,
  resetVisualTickBuffer,
  pushVisualHitTrigger,
  flushVisualBuffers,
} from './visual-buffer/visualTickRingBuffer';
export {
  startVisualLoop,
  stopVisualLoop,
  wakeVisualLoop,
  drainVisualLoopAtTime,
} from './visual-buffer/visualLoopProcessor';
export { areAllStudioWindowsHidden } from '../utils/detachedWindowManager';
