
import { useEffect, useRef } from 'react';
import { useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { isEditableTarget } from '../../utils/crossRealmDom';
import { subscribeToTick, unsubscribeFromTick } from '../useAudioSync';

export interface UseInstrumentEditorRecordingParams {
  trackId: number;
}

export function useInstrumentEditorRecording({ trackId }: UseInstrumentEditorRecordingParams) {
  const hostWin = useWindow();
  const armedPatternId = useSequencerStore((state) => state.armedPatternId);
  const toggleArmPattern = useSequencerStore((state) => state.toggleArmPattern);
  const disarmAllPatterns = useSequencerStore((state) => state.disarmAllPatterns);
  const isPatternRecording = useSequencerStore((state) => state.isPatternRecording);
  const togglePatternRecording = useSequencerStore((state) => state.togglePatternRecording);

  // Désarmer tous les motifs au démontage de l'éditeur
  useEffect(() => {
    return () => {
      disarmAllPatterns();
    };
  }, [disarmAllPatterns]);

  // Raccourci Clavier 'R' pour basculer l'enregistrement MIDI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || isEditableTarget(hostWin.document.activeElement)) return;
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = useSequencerStore.getState().tracks.find((tr) => tr.id === trackId);
        const c = t ? instrumentsConfig[t.instrumentIdx] : null;
        const isV = Boolean(t?.customName === 'Toada' || t?.customName === 'Puxador' || t?.customName === 'Coro' || c?.type === 'voice' || c?.id === 'puxador' || c?.id === 'coro' || c?.id === 'toada');
        if (!isV) {
          e.preventDefault();
          togglePatternRecording();
        }
      }
    };
    hostWin.addEventListener('keydown', handleKeyDown);
    return () => hostWin.removeEventListener('keydown', handleKeyDown);
  }, [hostWin, togglePatternRecording, trackId]);

  // Mode Live Erase (Effacement direct via Backspace et Delete maintenus)
  const isLiveErasingRef = useRef(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || isEditableTarget(hostWin.document.activeElement)) return;
      if (e.key === 'Backspace' || e.key === 'Delete') isLiveErasingRef.current = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') isLiveErasingRef.current = false;
    };
    hostWin.addEventListener('keydown', onDown);
    hostWin.addEventListener('keyup', onUp);
    return () => {
      hostWin.removeEventListener('keydown', onDown);
      hostWin.removeEventListener('keyup', onUp);
    };
  }, [hostWin]);

  // Mode Live Erase : effacement direct pendant la lecture si Backspace ou Delete est maintenu
  useEffect(() => {
    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      if (!detail || !isLiveErasingRef.current || detail.step < 0) return;
      const storeState = useSequencerStore.getState();
      const { isPatternRecording: isRec, armedPatternId: aPtnId, armedTrackId, updatePatternStep } = storeState;
      if (isRec && aPtnId !== null && armedTrackId !== null) {
        const armedTrack = storeState.tracks.find((t) => t.id === armedTrackId);
        const armedPtn = armedTrack?.patterns.find((p) => p.id === aPtnId);
        if (armedPtn) {
          const stepsCount = armedPtn.steps || 16;
          const currentStep = ((detail.step % stepsCount) + stepsCount) % stepsCount;
          const currentVal = armedPtn.activeSteps?.[currentStep];
          if (currentVal !== 0 && currentVal !== '0' && currentVal !== undefined) {
            updatePatternStep(armedTrackId, aPtnId, currentStep, 0);

            // Flash visuel d'effacement direct via WAAPI (sans re-render React)
            const hostDoc = hostWin?.document || document;
            const cellEl = hostDoc.querySelector<HTMLElement>(
              `[data-pattern-id="${aPtnId}"][data-step-index="${currentStep}"]`
            );
            if (cellEl) {
              cellEl.animate([
                { opacity: 0.2, filter: 'grayscale(1) brightness(0.5)', transform: 'scale(0.85)' },
                { opacity: 1, filter: 'none', transform: 'scale(1)' },
              ], { duration: 180, easing: 'ease-out' });
            }
          }
        }
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
    };
  }, [hostWin]);

  return {
    armedPatternId,
    toggleArmPattern,
    disarmAllPatterns,
    isPatternRecording,
    togglePatternRecording,
    isLiveErasingRef,
  };
}
