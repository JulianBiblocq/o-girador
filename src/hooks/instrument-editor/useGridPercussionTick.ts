import React, { useEffect, useRef } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../useAudioSync';
import { getActiveVariationIdForTrack } from '../audio-sync/liveVariationLookaheadEngine';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { findConcretePatternOwnerTrack, isSpecificSoloVariationId, resolveTargetedSoloVariation } from '../../utils/soloVariationMatcher';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
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
  instrumentType,
}: UseGridPercussionTickParams): void {
  const lastActiveElRef = useRef<HTMLElement | null>(null);
  const lastHighlightKeyRef = useRef<string>('');

  useEffect(() => {
    if (instrumentType === 'voice') return;

    const clearHighlight = () => {
      if (lastActiveElRef.current) {
        lastActiveElRef.current.classList.remove('live-playhead-highlight');
        lastActiveElRef.current = null;
      }
      lastHighlightKeyRef.current = '';
    };

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; measureSeqId?: number }) => {
      if (!detail || !gridRef.current) return;
      const { step, measure, maxTicks, ratio = step / maxTicks, measureSeqId } = detail;
      const storeState = useSequencerStore.getState();
      if (storeState.isEcoMode) return;

      const { soloPatternPlayId: soloPlayId, soloPatternVariationId: soloVarId } = useTransportStore.getState();
      const tracks = storeState.tracks;
      const trackObj = tracks.find((t) => t.id === trackId);
      if (!trackObj) return;

      const isCurrentPlaying = (() => {
        if (soloPlayId !== undefined && soloPlayId !== null) {
          if (String(pattern?.id) === String(soloPlayId)) return true;
          const soloTrack = findConcretePatternOwnerTrack(tracks, soloPlayId);
          if (!soloTrack) return false;
          const ownerMaster = isSlaveTrack(soloTrack, tracks) ? resolveMasterTrack(soloTrack.id, tracks)?.id : (soloTrack.isLinkMaster ? soloTrack.id : null);
          const myMaster = isSlaveTrack(trackObj, tracks) ? resolveMasterTrack(trackObj.id, tracks)?.id : (trackObj.isLinkMaster ? trackObj.id : null);
          const isSameFamily = soloTrack.id === trackId ||
            (ownerMaster !== null && ownerMaster !== undefined && myMaster !== null && myMaster !== undefined && String(ownerMaster) === String(myMaster)) ||
            (soloTrack.isLinkFolder && (String(trackObj.linkedToTrackId) === String(soloTrack.id) || String(trackObj.busId) === String(soloTrack.id)));
          if (!isSameFamily) return false;
          const soloPtn = soloTrack.patterns?.find((p: any) => String(p.id) === String(soloPlayId));
          if (soloPtn && pattern?.name?.trim().toLowerCase() === soloPtn.name?.trim().toLowerCase()) return true;
          const sIdx = soloTrack.patterns?.findIndex((p: any) => String(p.id) === String(soloPlayId));
          return Boolean(sIdx !== undefined && sIdx >= 0 && trackObj.patterns?.[sIdx]?.id === pattern?.id);
        }
        return pattern?.measureAssignments?.[measure] === true;
      })();

      if (!isCurrentPlaying || step < 0) { clearHighlight(); return; }

      let activeVarId: string | null = null;
      if (soloPlayId !== null && soloPlayId !== undefined && soloVarId === 'base') {
        activeVarId = null;
      } else if (soloPlayId !== null && soloPlayId !== undefined && isSpecificSoloVariationId(soloVarId)) {
        activeVarId = resolveTargetedSoloVariation(pattern, tracks, soloPlayId, soloVarId)?.id ?? null;
      } else {
        const rawVarId = getActiveVariationIdForTrack(measureSeqId, measure, trackId);
        if (rawVarId) {
          const ownMatch = pattern?.variations?.find((v) => String(v.id) === String(rawVarId));
          activeVarId = ownMatch ? ownMatch.id : null;
        }
      }

      const activeVarObj = activeVarId ? pattern?.variations?.find((v) => String(v.id) === String(activeVarId)) : null;
      const stepsCount = activeVarObj?.steps?.length ?? pattern?.steps ?? 16;
      const activeStepIdx = Math.min(stepsCount - 1, Math.max(0, Math.floor(ratio * stepsCount)));
      const nextKey = `${activeVarId ?? 'base'}:${activeStepIdx}`;

      if (nextKey !== lastHighlightKeyRef.current) {
        if (lastActiveElRef.current) {
          lastActiveElRef.current.classList.remove('live-playhead-highlight');
          lastActiveElRef.current = null;
        }
        lastHighlightKeyRef.current = nextKey;

        let targetEl: HTMLElement | null = null;
        if (activeVarId) {
          const cardRoot = gridRef.current.closest<HTMLElement>('[data-pattern-card]') || gridRef.current;
          targetEl =
            cardRoot.querySelector<HTMLElement>(`[data-variation-id="${activeVarId}"][data-step-index="${activeStepIdx}"].step-input-cell`) ||
            cardRoot.querySelector<HTMLElement>(`[data-variation-id="${activeVarId}"][data-step-index="${activeStepIdx}"] .step-input-cell`);
        } else {
          const cellEl = gridRef.current.querySelector<HTMLElement>(`[data-step-index="${activeStepIdx}"] .step-input-cell, [data-step-index="${activeStepIdx}"].voice-step-cell`);
          targetEl = cellEl || gridRef.current.querySelector<HTMLElement>(`[data-step-index="${activeStepIdx}"]`);
        }

        if (targetEl) {
          targetEl.classList.add('live-playhead-highlight');
          lastActiveElRef.current = targetEl;
        }
      }
    };

    subscribeToTick(handleTick);
    return () => { unsubscribeFromTick(handleTick); clearHighlight(); };
  }, [trackId, pattern, instrumentType, gridRef]);
}
