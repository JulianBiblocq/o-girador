import { TickCallback, SyncEngineTarget } from './visualTickTypes';

export type VisualFrameCallback = (currentTimeSec: number) => void;

export const tickSubscribers = new Set<TickCallback>();
export const lookaheadTickSubscribers = new Set<TickCallback>();
export const visualFrameSubscribers = new Set<VisualFrameCallback>();

export function subscribeToTick(callback: TickCallback): void {
  tickSubscribers.add(callback);
}

export function unsubscribeFromTick(callback: TickCallback): void {
  tickSubscribers.delete(callback);
}

export function subscribeToLookaheadTick(callback: TickCallback): void {
  lookaheadTickSubscribers.add(callback);
}

export function unsubscribeFromLookaheadTick(callback: TickCallback): void {
  lookaheadTickSubscribers.delete(callback);
}

export function subscribeToVisualFrame(callback: VisualFrameCallback): void {
  visualFrameSubscribers.add(callback);
}

export function unsubscribeFromVisualFrame(callback: VisualFrameCallback): void {
  visualFrameSubscribers.delete(callback);
}

export let syncAudioEngine: SyncEngineTarget | null = null;

export function registerAudioEngineSyncTarget(engine: SyncEngineTarget | null): void {
  syncAudioEngine = engine;
}
