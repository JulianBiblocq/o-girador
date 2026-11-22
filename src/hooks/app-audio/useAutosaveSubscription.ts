import { useEffect, useRef, useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { saveAutosave } from '../../db';
import { buildAutosavePayload, computeAutosaveSignature } from './autosavePayloadBuilder';

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

    const unsub = useSequencerStore.subscribe(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => checkAndPerformSave(false), { timeout: 800 });
        } else {
          checkAndPerformSave(false);
        }
      }, 1200);
    });

    const handleForceAutosave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => checkAndPerformSave(true), 60);
    };

    const handlePageHide = () => {
      clearTimeout(timeoutId);
      checkAndPerformSave(true);
    };

    window.addEventListener('force-autosave', handleForceAutosave);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      clearTimeout(timeoutId);
      unsub();
      window.removeEventListener('force-autosave', handleForceAutosave);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
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
