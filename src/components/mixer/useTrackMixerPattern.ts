import React, { useMemo } from 'react';
import { instrumentsConfig, getVisualStrokeSymbol } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import type { TrackGroup as Track } from '../../types';
import { useAudioStore } from '../../stores/useAudioStore';
import { getNextStepValue } from '../../utils/instrumentStrokes';
import { useSequencer } from '../../contexts/SequencerContext';
import { useTrackMixerTickPreview } from './useTrackMixerTickPreview';

export interface UseTrackMixerPatternProps {
  track: Track;
  tracks: Track[];
  isMobile: boolean;
  isTracksCollapsed: boolean;
  isLeftHanded: boolean;
  currentMeasure: number;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId?: number
  ) => void;
}

function getToadaChildTrack(tracks: Track[], currentMeasure: number): Track | null {
  const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const selId = useAudioStore.getState().selectedVocalPatternId;
  if (selId) {
    if (pux?.patterns.some(p => p.id === selId)) return pux;
    if (coro?.patterns.some(p => p.id === selId)) return coro;
  }
  return coro?.patterns?.find(p => p.measureAssignments?.[currentMeasure]) ? coro :
         pux?.patterns?.find(p => p.measureAssignments?.[currentMeasure]) ? pux : (coro || pux || null);
}

export function useTrackMixerPattern({
  track,
  tracks,
  isMobile,
  isTracksCollapsed,
  isLeftHanded,
  currentMeasure,
  onStepTouchStart,
}: UseTrackMixerPatternProps) {
  const { handleTrackStepValueChange } = useSequencer();
  const isToada = isToadaBus(track);

  const activeChildTrack = useMemo(() => {
    return isToada ? getToadaChildTrack(tracks, currentMeasure) : null;
  }, [isToada, tracks, currentMeasure]);

  const effectiveTrack = isToada ? (activeChildTrack || track) : track;
  const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : null;

  const activePattern = useMemo(() => {
    if (!effectiveTrack) return null;
    const override = effectiveTrack.patternOverrides?.[currentMeasure];
    if (override === null) return null;
    if (override !== undefined) {
      return effectiveTrack.patterns?.find(p => p.id === override) || null;
    }
    return effectiveTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || effectiveTrack.patterns?.[0] || null;
  }, [effectiveTrack, currentMeasure]);

  const { registerStepRef } = useTrackMixerTickPreview(isTracksCollapsed, isMobile, activePattern);

  const handleStepClick = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, val: string | number | [string, string]) => {
    e.stopPropagation();
    if (!activePattern || !inst || !track) return;
    const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
    const primaryVisualVal = Array.isArray(visualVal) ? visualVal[0] : visualVal;

    if (onStepTouchStart) {
      onStepTouchStart(
        e,
        activePattern.id,
        stepIdx,
        inst.id,
        primaryVisualVal,
        (newVal) => {
          handleTrackStepValueChange(track.id, activePattern.id, stepIdx, newVal);
        },
        track.id
      );
    } else {
      const nextVisualVal = getNextStepValue(inst.id, inst.type, primaryVisualVal);
      const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, isLeftHanded, inst.id);
      const nextSemanticStr = Array.isArray(nextSemanticVal) ? nextSemanticVal[0] : nextSemanticVal;
      handleTrackStepValueChange(track.id, activePattern.id, stepIdx, String(nextSemanticStr));
    }
  };

  return {
    isToada,
    inst,
    activePattern,
    registerStepRef,
    handleStepClick,
  };
}
