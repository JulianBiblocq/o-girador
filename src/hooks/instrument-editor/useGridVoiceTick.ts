/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';

interface UseGridVoiceTickParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  trackId: number;
  pattern: Pattern;
  instrumentType: string;
  soloPatternPlayIdRef?: React.RefObject<number | null>;
}

export function useGridVoiceTick({
  gridRef,
  trackId,
  pattern,
  instrumentType,
  soloPatternPlayIdRef
}: UseGridVoiceTickParams) {
  useEffect(() => {
    if (instrumentType !== 'voice') return;

    let lastActiveWordEl: HTMLElement | null = null;
    let lastActiveSylEl: HTMLElement | null = null;

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; isPreRoll?: boolean; preRollBeat?: number }) => {
      if (!detail || !gridRef.current) return;
      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;

      const storeState = useSequencerStore.getState();
      const trackObj = storeState.tracks.find(t => t.id === trackId);
      if (!trackObj) return;

      const soloPatternPlayId = soloPatternPlayIdRef?.current;
      const isCurrentPlaying = (() => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = trackObj?.patterns?.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) return pattern?.id === soloPatternPlayId;
        }
        return pattern?.measureAssignments?.[measure] === true;
      })();

      if (!isCurrentPlaying || step < 0) {
        if (lastActiveWordEl) {
          lastActiveWordEl.classList.remove('text-[#8b2a1a]', 'scale-105', 'transform', 'origin-left');
          lastActiveWordEl.classList.add('opacity-85');
          lastActiveWordEl = null;
        }
        if (lastActiveSylEl) {
          lastActiveSylEl.classList.remove('underline', 'decoration-2');
          lastActiveSylEl = null;
        }
        return;
      }

      let targetKey: string;
      if (detail.isPreRoll) {
        const preRollStep = detail.preRollBeat !== undefined ? Math.min(15, detail.preRollBeat * 4 + Math.floor(ratio * 4)) : Math.min(15, Math.floor(ratio * 16));
        targetKey = `pre-${preRollStep}`;
      } else {
        const patternMeasures = (pattern as any)?.measureAssignments || [];
        const isNextMeasureAssigned = detail.measure !== undefined && patternMeasures[detail.measure + 1] === true;
        const isCurrentMeasureAssigned = detail.measure !== undefined && patternMeasures[detail.measure] === true;
        if (isNextMeasureAssigned && !isCurrentMeasureAssigned) {
          targetKey = `pre-${Math.min(15, Math.floor(ratio * 16))}`;
        } else {
          targetKey = `${Math.floor(ratio * (pattern?.steps ?? 16))}`;
        }
      }

      const wordSpans = gridRef.current.querySelectorAll('[data-word-steps]');
      let activeWordSpan: HTMLElement | null = null;
      let activeSylSpan: HTMLElement | null = null;

      wordSpans.forEach(span => {
        const steps: (string | number)[] = JSON.parse(span.getAttribute('data-word-steps') || '[]');
        if (steps.some(s => String(s) === targetKey)) {
          activeWordSpan = span as HTMLElement;
          const sylSpans = span.querySelectorAll('[data-syl-index]');
          sylSpans.forEach(sylSpan => {
            if (sylSpan.getAttribute('data-syl-index') === targetKey) activeSylSpan = sylSpan as HTMLElement;
          });
        }
      });

      if (activeWordSpan !== lastActiveWordEl) {
        if (lastActiveWordEl) {
          lastActiveWordEl.classList.remove('text-[#8b2a1a]', 'scale-105', 'transform', 'origin-left');
          lastActiveWordEl.classList.add('opacity-85');
        }
        if (activeWordSpan) {
          (activeWordSpan as HTMLElement).classList.add('text-[#8b2a1a]', 'scale-105', 'transform', 'origin-left');
          (activeWordSpan as HTMLElement).classList.remove('opacity-85');
          lastActiveWordEl = activeWordSpan;
        } else {
          lastActiveWordEl = null;
        }
      }

      if (activeSylSpan !== lastActiveSylEl) {
        if (lastActiveSylEl) lastActiveSylEl.classList.remove('underline', 'decoration-2');
        if (activeSylSpan) {
          (activeSylSpan as HTMLElement).classList.add('underline', 'decoration-2');
          lastActiveSylEl = activeSylSpan;
        } else {
          lastActiveSylEl = null;
        }
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      if (lastActiveWordEl) {
        lastActiveWordEl.classList.remove('text-[#8b2a1a]', 'scale-105', 'transform', 'origin-left');
        lastActiveWordEl.classList.add('opacity-85');
      }
      if (lastActiveSylEl) lastActiveSylEl.classList.remove('underline', 'decoration-2');
    };
  }, [trackId, pattern?.id, pattern?.steps, instrumentType, soloPatternPlayIdRef, gridRef]);
}
