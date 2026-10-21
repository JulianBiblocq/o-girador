/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isSequencerVisibleTrack, getEffectiveMuteState } from '../../stores/useSequencerStore';
import { getTone } from '../../ToneLoader';
import { sortTracksByRodaOrder } from './sortTracksByRodaOrder';
import { clearStepAtCanvasCoords } from './clearStepAtCoords';
import { handleStepClickAction } from './handleStepClickAction';
import { findStepUnderPointer } from './findStepUnderPointer';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

export function useCircleTouchInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  stateRef: React.MutableRefObject<any>,
  getLiveActivePatternId: (track: TrackGroup) => number | null,
  onTogglePlay: () => void,
  onStepChange: (trackId: number, patternId: number, stepIdx: number, newState: any, lyric?: string, note?: string) => void,
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
  ) => void,
  langPromptVoiceText: string = '',
  isLoadingAudio: boolean = false
) {
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.button === 2) {
      clearStepAtCanvasCoords(e.clientX, e.clientY, canvasRef.current, stateRef, getLiveActivePatternId, onStepChange);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (1200 / rect.width);
    const mouseY = (e.clientY - rect.top) * (1200 / rect.height);
    const dx = mouseX - 600;
    const dy = mouseY - 600;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 55) {
      const toneInst = safeGetTone();
      if (toneInst && toneInst.context && toneInst.context.state !== 'running') {
        try { toneInst.context.resume(); } catch (_) {}
      }
      if (isLoadingAudio) return;
      onTogglePlay();
      return;
    }

    const isCurrentlyMobile = stateRef.current.isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);
    if (isCurrentlyMobile) return;

    const currentTracks = stateRef.current.tracks;
    const currentRawTracks = stateRef.current.rawTracks;
    const currentRodaOrder = stateRef.current.rodaTrackOrder;
    const sortedCurrentTracks = sortTracksByRodaOrder(currentTracks, currentRodaOrder);

    const activeVisibleTracksToDraw = sortedCurrentTracks.filter(t => {
      if (t.isHidden) return false;
      if (!isSequencerVisibleTrack(t, currentTracks)) return false;
      if (instrumentsConfig[t.instrumentIdx]?.id === 'apito') return false;
      return !getEffectiveMuteState(currentRawTracks, t.id);
    });

    const hit = findStepUnderPointer(dx, dy, distance, activeVisibleTracksToDraw, currentTracks, getLiveActivePatternId);
    if (hit) {
      handleStepClickAction(
        e, hit.ownerTrack, hit.activePattern, hit.stepIdx, hit.inst, hit.activePattern.activeSteps[hit.stepIdx],
        langPromptVoiceText, stateRef.current.isLeftHanded || false, onStepChange, onStepTouchStart
      );
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons === 2) {
      clearStepAtCanvasCoords(e.clientX, e.clientY, canvasRef.current, stateRef, getLiveActivePatternId, onStepChange);
    }
  };

  return { handleCanvasPointerDown, handleCanvasPointerMove };
}
