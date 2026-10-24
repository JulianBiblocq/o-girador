
import { useRef, useEffect, useCallback } from 'react';
import { useAudio } from '../../contexts/AudioContext';
import { useTransportStore } from '../../stores/useTransportStore';
import { useShallow } from 'zustand/react/shallow';

export function useInstrumentEditorSoloPlayback() {
  const audio = useAudio();
  const onPlaySoloPattern = audio.handleStartSoloPattern;
  const onStopSoloPattern = audio.handleStopSoloPattern;

  const { soloPatternPlayId, soloPatternVariationId } = useTransportStore(
    useShallow((state) => ({
      soloPatternPlayId: state.soloPatternPlayId,
      soloPatternVariationId: state.soloPatternVariationId,
    }))
  );

  const soloPatternPlayIdRef = useRef(soloPatternPlayId);
  soloPatternPlayIdRef.current = soloPatternPlayId;

  const stopSoloRef = useRef(onStopSoloPattern);
  useEffect(() => {
    stopSoloRef.current = onStopSoloPattern;
  }, [onStopSoloPattern]);

  // Nettoyage au démontage : arrêter proprement la pré-écoute solo si elle était active
  useEffect(() => {
    return () => {
      if (soloPatternPlayIdRef.current !== null && stopSoloRef.current) {
        stopSoloRef.current();
      }
    };
  }, []);

  const isSoloPlaying = useCallback((patternId: number, variationId: string = 'ensemble') => {
    return soloPatternPlayId !== null && soloPatternPlayId !== undefined &&
      String(soloPatternPlayId) === String(patternId) && soloPatternVariationId === variationId;
  }, [soloPatternPlayId, soloPatternVariationId]);

  const toggleSoloPattern = useCallback((patternId: number, variationId: string = 'ensemble') => {
    if (soloPatternPlayId !== null && soloPatternPlayId !== undefined &&
        String(soloPatternPlayId) === String(patternId) && soloPatternVariationId === variationId) {
      if (onStopSoloPattern) onStopSoloPattern();
    } else {
      if (onPlaySoloPattern) onPlaySoloPattern(patternId, variationId);
    }
  }, [soloPatternPlayId, soloPatternVariationId, onPlaySoloPattern, onStopSoloPattern]);

  return {
    onPlaySoloPattern,
    onStopSoloPattern,
    soloPatternPlayId,
    soloPatternVariationId,
    isSoloPlaying,
    toggleSoloPattern,
  };
}
