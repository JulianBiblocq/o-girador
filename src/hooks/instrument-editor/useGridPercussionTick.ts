import React, { useEffect, useRef } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { Pattern } from '../../types';

interface UseGridPercussionTickParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  trackId: number;
  pattern: Pattern;
  instrumentType: string;
}

export function useGridPercussionTick({
  gridRef,
  trackId,
  pattern,
  instrumentType
}: UseGridPercussionTickParams): void {
  const lastActiveElRef = useRef<HTMLElement | null>(null);
  const lastStepIdxRef = useRef<number>(-1);

  useEffect(() => {
    if (instrumentType === 'voice') return;

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      if (!detail || !gridRef.current) return;
      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;

      const isEco = useSequencerStore.getState().isEcoMode || (window as any).oGiradorVisualEcoMode;
      if (isEco) return;

      const soloPlayId = useTransportStore.getState().soloPatternPlayId;
      const storeState = useSequencerStore.getState();
      const trackObj = storeState.tracks.find(t => t.id === trackId);
      if (!trackObj) return;

      const isCurrentPlaying = (() => {
        if (soloPlayId !== undefined && soloPlayId !== null) {
          if (String(pattern?.id) === String(soloPlayId)) return true;
          const soloTrack = storeState.tracks.find(t => t.patterns?.some(p => String(p.id) === String(soloPlayId)));
          if (!soloTrack) return false;
          const isSameFamily = soloTrack.id === trackId ||
            (trackObj.linkedToTrackId && (String(trackObj.linkedToTrackId) === String(soloTrack.linkedToTrackId) || String(trackObj.linkedToTrackId) === String(soloTrack.id))) ||
            (trackObj.busId && String(trackObj.busId) === String(soloTrack.id)) ||
            (soloTrack.linkedToTrackId && String(soloTrack.linkedToTrackId) === String(trackId)) ||
            (soloTrack.busId && String(soloTrack.busId) === String(trackId));
          if (isSameFamily) {
            const soloPtn = soloTrack.patterns?.find(p => String(p.id) === String(soloPlayId));
            if (soloPtn && pattern?.name?.trim().toLowerCase() === soloPtn.name?.trim().toLowerCase()) return true;
            const sIdx = soloTrack.patterns?.findIndex(p => String(p.id) === String(soloPlayId));
            if (sIdx !== undefined && sIdx >= 0 && trackObj.patterns?.[sIdx]?.id === pattern?.id) return true;
          }
          return false;
        }
        return pattern?.measureAssignments?.[measure] === true;
      })();

      if (!isCurrentPlaying || step < 0) {
        if (lastActiveElRef.current) {
          lastActiveElRef.current.classList.remove('live-playhead-highlight');
          lastActiveElRef.current = null;
        }
        lastStepIdxRef.current = -1;
        return;
      }

      const stepsCount = pattern?.steps ?? 16;
      const activeStepIdx = Math.min(stepsCount - 1, Math.max(0, Math.floor(ratio * stepsCount)));

      if (activeStepIdx !== lastStepIdxRef.current) {
        lastStepIdxRef.current = activeStepIdx;
        if (lastActiveElRef.current) {
          lastActiveElRef.current.classList.remove('live-playhead-highlight');
          lastActiveElRef.current = null;
        }

        const cellEl = gridRef.current.querySelector<HTMLElement>(`[data-step-index="${activeStepIdx}"] .step-input-cell, [data-step-index="${activeStepIdx}"].voice-step-cell`);
        const targetEl = cellEl || gridRef.current.querySelector<HTMLElement>(`[data-step-index="${activeStepIdx}"]`);

        if (targetEl) {
          targetEl.classList.add('live-playhead-highlight');
          lastActiveElRef.current = targetEl;
        }
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      if (lastActiveElRef.current) {
        lastActiveElRef.current.classList.remove('live-playhead-highlight');
        lastActiveElRef.current = null;
      }
      lastStepIdxRef.current = -1;
    };
  }, [trackId, pattern?.id, pattern?.steps, pattern?.name, instrumentType, gridRef]);
}
