import React from 'react';
import { isSequencerVisibleTrack } from '../../stores/useSequencerStore';
import { getTone } from '../../ToneLoader';
import { sortTracksByRodaOrder, orderActiveVisibleRodaTracks, isRodaDrawableTrack } from './sortTracksByRodaOrder';
import { resolveRodaPedagogicalHit } from './resolveRodaPedagogicalHit';
import { LivePlaybackState } from './circleSequencerTypes';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

export function useCircleTouchInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  stateRef: React.MutableRefObject<any>,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>,
  activeVariationsRef: React.MutableRefObject<Record<number, any>> | undefined,
  onTogglePlay: () => void,
  onSelectPedagogyTarget: (target: StrokeInfoPopoverTarget | null) => void,
  isLoadingAudio: boolean = false
) {
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.button === 2) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const mouseX = (e.clientX - rect.left) * (1200 / rect.width);
    const mouseY = (e.clientY - rect.top) * (1200 / rect.height);
    const dx = mouseX - 600;
    const dy = mouseY - 600;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 55) {
      onSelectPedagogyTarget(null);
      const toneInst = safeGetTone();
      if (toneInst && toneInst.context && toneInst.context.state !== 'running') {
        try { toneInst.context.resume(); } catch (_) {}
      }
      if (isLoadingAudio) return;
      onTogglePlay();
      return;
    }

    const currentTracks = stateRef.current.tracks || [];
    const currentRawTracks = stateRef.current.rawTracks || currentTracks;
    const currentRodaOrder = stateRef.current.rodaTrackOrder;
    const sortedCurrentTracks = sortTracksByRodaOrder(currentTracks, currentRodaOrder);

    const activeVisibleTracksToDraw = orderActiveVisibleRodaTracks(
      sortedCurrentTracks.filter((t) => isRodaDrawableTrack(t) && isSequencerVisibleTrack(t, currentTracks)),
      currentRawTracks
    );

    const hitTarget = resolveRodaPedagogicalHit({
      clientX: e.clientX,
      clientY: e.clientY,
      mouseX,
      mouseY,
      distance,
      visibleTracks: activeVisibleTracksToDraw,
      allTracks: currentRawTracks,
      livePlaybackRef,
      activeVariationsRef,
      stateRef,
    });

    onSelectPedagogyTarget(hitTarget);
  };

  return { handleCanvasPointerDown };
}
