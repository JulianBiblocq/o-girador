/**
 * useAutosaveSubscription.ts — Persistance IndexedDB différée hors lecture (`isPlaying === true`) (< 120 lignes).
 * - `0` `JSON.stringify` / `postMessage` pendant la lecture ; flush immédiat sur transition `isPlaying -> false`
 *   (Pause / Stop), sur `visibilitychange === 'hidden'` et sur `pagehide` / `beforeunload`.
 */
import { useEffect, useRef, useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { saveAutosave } from '../../db';
import { buildAutosavePayload, computeAutosaveSignature } from './autosavePayloadBuilder';

export interface PlaybackAutosaveGate {
  onStoreChange: (isPlaying: boolean, wasPlaying: boolean) => 'defer' | 'flush_now' | 'debounce';
  onForceSave: (isPlaying: boolean) => 'defer' | 'flush_soon';
  onVisibilityOrPageHide: () => boolean;
  hasPending: () => boolean;
}

export function createPlaybackAutosaveGate(): PlaybackAutosaveGate {
  let pendingWhilePlaying = false;
  return {
    onStoreChange(isPlaying: boolean, wasPlaying: boolean) {
      if (isPlaying) {
        pendingWhilePlaying = true;
        return 'defer';
      }
      if (wasPlaying && pendingWhilePlaying) {
        pendingWhilePlaying = false;
        return 'flush_now';
      }
      return 'debounce';
    },
    onForceSave(isPlaying: boolean) {
      if (isPlaying) {
        pendingWhilePlaying = true;
        return 'defer';
      }
      pendingWhilePlaying = false;
      return 'flush_soon';
    },
    onVisibilityOrPageHide() {
      pendingWhilePlaying = false;
      return true;
    },
    hasPending: () => pendingWhilePlaying,
  };
}

export function useAutosaveSubscription(audio: any, audioRef: React.MutableRefObject<any>) {
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const lastNotesSignatureRef = useRef<string>('');

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/dbWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data?.type === 'SAVE_SUCCESS') setIsSavedIndicatorVisible(true);
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (audio.isLoading) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const gate = createPlaybackAutosaveGate();

    const checkAndPerformSave = (useDirectSave = false) => {
      const state = useSequencerStore.getState();
      const currentSig = computeAutosaveSignature(state);
      if (currentSig === lastNotesSignatureRef.current) return;
      const dataToSave = buildAutosavePayload(audioRef.current, currentSig);
      if (!dataToSave) return;
      lastNotesSignatureRef.current = currentSig;
      if (useDirectSave || !workerRef.current) {
        saveAutosave(dataToSave).catch(() => {});
      } else {
        workerRef.current.postMessage({ type: 'SAVE_AUTOSAVE', payload: dataToSave });
      }
    };

    const unsub = useSequencerStore.subscribe((state, prevState) => {
      clearTimeout(timeoutId);
      const action = gate.onStoreChange(Boolean(state.isPlaying), Boolean(prevState?.isPlaying));
      if (action === 'defer') return;
      if (action === 'flush_now') {
        checkAndPerformSave(false);
        return;
      }
      timeoutId = setTimeout(() => {
        if (useSequencerStore.getState().isPlaying) { gate.onStoreChange(true, true); return; }
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            if (!useSequencerStore.getState().isPlaying) checkAndPerformSave(false);
            else gate.onStoreChange(true, true);
          }, { timeout: 800 });
        } else {
          checkAndPerformSave(false);
        }
      }, 1200);
    });

    const handleForceAutosave = () => {
      clearTimeout(timeoutId);
      if (gate.onForceSave(Boolean(useSequencerStore.getState().isPlaying)) === 'flush_soon') {
        timeoutId = setTimeout(() => checkAndPerformSave(true), 60);
      }
    };

    const handlePageHide = () => {
      clearTimeout(timeoutId);
      gate.onVisibilityOrPageHide();
      checkAndPerformSave(true);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') handlePageHide();
    };

    window.addEventListener('force-autosave', handleForceAutosave);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      unsub();
      window.removeEventListener('force-autosave', handleForceAutosave);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audio.isLoading, audioRef]);

  useEffect(() => {
    if (isSavedIndicatorVisible) {
      const timer = setTimeout(() => setIsSavedIndicatorVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSavedIndicatorVisible]);

  return { isSavedIndicatorVisible };
}
