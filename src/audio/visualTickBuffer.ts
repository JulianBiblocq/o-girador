/**
 * Visual Tick & Hit Trigger Ring Buffer for High-Performance Standalone rAF Dispatch
 * Bypasses Tone.Draw to prevent dropped visual animations on mobile devices.
 */

export * from './visual-buffer/visualTickTypes';
export * from './visual-buffer/visualTickSubscribers';
export {
  TICK_QUEUE_SIZE,
  HIT_QUEUE_SIZE,
  getLastAudibleTick,
  pushVisualTick,
  purgeVisualTickBuffer,
  resetVisualTickBuffer,
  pushVisualHitTrigger,
  flushVisualBuffers,
} from './visual-buffer/visualTickRingBuffer';
export {
  startVisualLoop,
  stopVisualLoop,
} from './visual-buffer/visualLoopProcessor';
