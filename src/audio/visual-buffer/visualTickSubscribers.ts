import { TickCallback, SyncEngineTarget } from './visualTickTypes';

export const tickSubscribers = new Set<TickCallback>();

export function subscribeToTick(callback: TickCallback): void {
  tickSubscribers.add(callback);
}

export function unsubscribeFromTick(callback: TickCallback): void {
  tickSubscribers.delete(callback);
}

export let syncAudioEngine: SyncEngineTarget | null = null;

export function registerAudioEngineSyncTarget(engine: SyncEngineTarget | null): void {
  syncAudioEngine = engine;
}
