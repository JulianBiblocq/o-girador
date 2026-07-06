/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Pattern } from '../types';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { isDarkText } from '../data';

interface InstrumentPatternGridProps {
  trackId: number;
  pattern: Pattern;
  instrument: {
    id: string;
    type: string;
    colors: Record<string, string>;
    [key: string]: any;
  };
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  isTupletEditMode: boolean;
  isMultiSelectActive: boolean;
  noteSelectorTarget: { patternId: number; stepIdx: number; note: string; element: HTMLElement } | null;

  // React State setters
  setNoteSelectorTarget: React.Dispatch<React.SetStateAction<{ patternId: number; stepIdx: number; note: string; element: HTMLElement } | null>>;
  setSelectedPatternId: React.Dispatch<React.SetStateAction<number>>;
  setSelectedStepIdx: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedVariationId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>>;
  setIsMultiSelectActive: React.Dispatch<React.SetStateAction<boolean>>;

  // Touch and Copy/Paste Props (UI specific)
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  canPaste?: boolean;
}

const getGlobalClipboard = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__oGiradorRelativeClipboard || null;
  }
  return null;
};

const InstrumentPatternGridComponent: React.FC<InstrumentPatternGridProps> = ({
  trackId,
  pattern,
  instrument,
  selectedStepIdx,
  selectedStepIndices,
  selectedVariationId,
  isTupletEditMode,
  isMultiSelectActive,
  noteSelectorTarget,
  setNoteSelectorTarget,
  setSelectedPatternId,
  setSelectedStepIdx,
  setSelectedVariationId,
  setSelectedStepIndices,
  setIsMultiSelectActive,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
}) => {
  const {
    lang,
    isLeftHanded,
    handleTrackStepValueChange,
    handleTrackStepKeyDown,
    handleVoiceTypeToggle,
    handleVoiceSylChange,
    handleVoiceNoteChange,
    handleVoiceNoteBlur,
    handlePatternBeatResolutionChange,
    handleVariationStepValueChange,
  } = useSequencer();

  const { isPlaying, globalSwing, soloPatternPlayIdRef } = useAudio();

  const gridRef = useRef<HTMLDivElement>(null);
  const [hasClipboard, setHasClipboard] = useState(false);

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialTouchIndexRef = useRef<number | null>(null);
  const wasSelectedRef = useRef(false);

  /* Compute global swing offset for a step index */
  const getStepSwingPercent = (stepIdx: number, steps: number, beatResolutions?: number[]) => {
    if (globalSwing?.mode === 'off') return 0;

    let posInGroup = 0;
    if (beatResolutions && beatResolutions.length > 0) {
      let accumulated = 0;
      for (const res of beatResolutions) {
        if (stepIdx >= accumulated && stepIdx < accumulated + res) {
          if (res === 3 || res === 6) return 0;
          posInGroup = stepIdx - accumulated;
          break;
        }
        accumulated += res;
      }
    } else {
      const posInBeat = ((stepIdx / (steps / 4)) % 1) * 4;
      posInGroup = Math.round(posInBeat) % 4;
    }

    if (globalSwing?.mode === 'custom') {
      return globalSwing?.customOffsets?.[posInGroup] || 0;
    }

    // Default 'maracatu' mode
    if (posInGroup === 0) return 0;
    if (posInGroup === 1) return 8;
    if (posInGroup === 2) return -29;
    if (posInGroup === 3) return -58;
    return 0;
  };

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Sync clipboard status
  useEffect(() => {
    setHasClipboard(!!getGlobalClipboard());
    const handleChanged = () => {
      setHasClipboard(!!getGlobalClipboard());
    };
    window.addEventListener('oGiradorClipboardChanged', handleChanged);
    return () => window.removeEventListener('oGiradorClipboardChanged', handleChanged);
  }, []);

  // Listen to CustomEvent 'o-girador-tick' to highlight cells dynamically (Bypass React)
  useEffect(() => {
    if (instrument?.type !== 'voice') return;

    let lastActiveWordEl: HTMLElement | null = null;
    let lastActiveSylEl: HTMLElement | null = null;

    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number }>;
      if (!customEvent.detail || !gridRef.current) return;

      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;

      const storeState = useSequencerStore.getState();
      const trackObj = storeState.tracks.find(t => t.id === trackId);
      if (!trackObj) return;

      const soloPatternPlayId = soloPatternPlayIdRef?.current;

      const isCurrentPlaying = (() => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = trackObj?.patterns?.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return pattern?.id === soloPatternPlayId;
          }
        }
        return pattern?.measureAssignments?.[measure] === true;
      })();

      // 1. Clean up old highlights if we aren't playing this pattern or step is negative
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

      // 3. Vocal Karaoke word highlighting
      if (instrument?.type === 'voice') {
        const targetStep = Math.floor(ratio * (pattern?.steps ?? 16));
        const wordSpans = gridRef.current.querySelectorAll('[data-word-steps]');
        let activeWordSpan: HTMLElement | null = null;
        let activeSylSpan: HTMLElement | null = null;

        wordSpans.forEach(span => {
          const steps = JSON.parse(span.getAttribute('data-word-steps') || '[]');
          if (steps.includes(targetStep)) {
            activeWordSpan = span as HTMLElement;
            const sylSpans = span.querySelectorAll('[data-syl-index]');
            sylSpans.forEach(sylSpan => {
              const sylIdx = Number(sylSpan.getAttribute('data-syl-index'));
              if (sylIdx === targetStep) {
                activeSylSpan = sylSpan as HTMLElement;
              }
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
          if (lastActiveSylEl) {
            lastActiveSylEl.classList.remove('underline', 'decoration-2');
          }
          if (activeSylSpan) {
            (activeSylSpan as HTMLElement).classList.add('underline', 'decoration-2');
            lastActiveSylEl = activeSylSpan;
          } else {
            lastActiveSylEl = null;
          }
        }
      }
    };

    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
      if (lastActiveWordEl) {
        lastActiveWordEl.classList.remove('text-[#8b2a1a]', 'scale-105', 'transform', 'origin-left');
        lastActiveWordEl.classList.add('opacity-85');
      }
      if (lastActiveSylEl) {
        lastActiveSylEl.classList.remove('underline', 'decoration-2');
      }
    };
  }, [trackId, pattern?.id, pattern?.steps, instrument?.type]);

  // Window global listeners for Drag / Touch select releasing
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isMultiSelectActive && isSelectingRef.current) {
        isSelectingRef.current = false;
        if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
          const tappedIdx = initialTouchIndexRef.current;
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            if (wasSelectedRef.current) {
              setSelectedStepIndices(prev => prev.filter(idx => idx !== tappedIdx));
            }
          }
        }
      }
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMultiSelectActive, setSelectedStepIndices]);

  // Global keydown deletions & values entries in multi-select mode
  useEffect(() => {
    if (!isMultiSelectActive || selectedStepIndices.length === 0) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') &&
        !(document.activeElement as HTMLInputElement).readOnly
      ) {
        return;
      }

      const key = e.key;

      if (key === 'Delete' || key === 'Backspace' || key === '0') {
        e.preventDefault();
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern?.id, selectedVariationId, selectedStepIndices, '0');
        } else {
          handleTrackStepValueChange(trackId, pattern?.id, selectedStepIndices, '0');
        }
        setSelectedStepIndices([]);
        return;
      }

      if (key.length === 1 && /^[a-zA-Z0-9]$/.test(key)) {
        e.preventDefault();
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern?.id, selectedVariationId, selectedStepIndices, key);
        } else {
          handleTrackStepValueChange(trackId, pattern?.id, selectedStepIndices, key);
        }
        setSelectedStepIndices([]);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMultiSelectActive, selectedStepIndices, pattern?.id, selectedVariationId, trackId, handleTrackStepValueChange, handleVariationStepValueChange, setSelectedStepIndices]);

  // Keyboard and Copy/Paste listeners specifically related to pattern actions
  useEffect(() => {
    const handleGridShortcut = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      const { key } = customEvent.detail;
      const activePtn = pattern;
      if (!activePtn) return;

      if (key === 'a') {
        setIsMultiSelectActive(true);
        setSelectedStepIndices(Array.from({ length: activePtn.steps }, (_, i) => i));
      } else if (key === 'c') {
        if (selectedStepIndices.length > 0) {
          handleCopyRelative(activePtn);
        } else {
          onCopyPattern && onCopyPattern(activePtn);
        }
      } else if (key === 'x') {
        if (selectedStepIndices.length > 0) {
          handleCopyRelative(activePtn);
          if (selectedVariationId) {
            handleVariationStepValueChange(trackId, activePtn.id, selectedVariationId, selectedStepIndices, '0');
          } else {
            handleTrackStepValueChange(trackId, activePtn.id, selectedStepIndices, '0');
          }
          setSelectedStepIndices([]);
        } else {
          onCopyPattern && onCopyPattern(activePtn);
          const allIndices = Array.from({ length: activePtn.steps }, (_, i) => i);
          if (selectedVariationId) {
            handleVariationStepValueChange(trackId, activePtn.id, selectedVariationId, allIndices, '0');
          } else {
            handleTrackStepValueChange(trackId, activePtn.id, allIndices, '0');
          }
        }
      } else if (key === 'v') {
        if (getGlobalClipboard()) {
          const targetIdx = (isMultiSelectActive && selectedStepIndices.length > 0) ? selectedStepIndices[0] : (selectedStepIdx !== null ? selectedStepIdx : 0);
          handlePasteRelative(activePtn, targetIdx);
        } else {
          if (canPaste && onPastePattern) {
            onPastePattern(activePtn.id);
          }
        }
      }
    };

    window.addEventListener('grid-shortcut', handleGridShortcut);
    return () => window.removeEventListener('grid-shortcut', handleGridShortcut);
  }, [pattern, selectedVariationId, isMultiSelectActive, selectedStepIndices, selectedStepIdx, onCopyPattern, onPastePattern, canPaste, trackId]);

  // Guard Clauses for store state and props
  const trackExists = useSequencerStore(state => state.tracks.some(t => t.id === trackId));
  if (!trackExists || !pattern || !instrument) return null;

  const handleStepTouchStartMulti = (e: React.TouchEvent, index: number) => {
    if (!isMultiSelectActive) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;
  };

  const handleGridTouchMove = (e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current || !touchStartPos.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (Math.abs(dx) > 10) {
        hasDraggedRef.current = true;
      }

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const stepInput = element.closest('[data-track-id][data-step-index]');
        if (stepInput) {
          const trackIdAttr = stepInput.getAttribute('data-track-id');
          const stepIdxAttr = stepInput.getAttribute('data-step-index');

          if (trackIdAttr === String(trackId) && stepIdxAttr !== null) {
            const stepIdx = parseInt(stepIdxAttr, 10);
            setSelectedStepIndices(prev => {
              if (prev.includes(stepIdx)) return prev;
              return [...prev, stepIdx];
            });
          }
        }
      }
    }
  };

  const handleGridTouchEnd = (e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    isSelectingRef.current = false;

    if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
      const tappedIdx = initialTouchIndexRef.current;
      if (selectedStepIndices.includes(tappedIdx) && selectedStepIndices.length > 0) {
        const stepVal = pattern?.activeSteps?.[tappedIdx];
        if (onStepTouchStart) {
          onStepTouchStart(e, pattern.id, tappedIdx, instrument.id, stepVal, (newVal) => {
            if (selectedVariationId) {
              handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, selectedStepIndices, newVal);
            } else {
              handleTrackStepValueChange(trackId, pattern.id, selectedStepIndices, newVal);
            }
            setSelectedStepIndices([]);
          });
        }
      } else {
        setSelectedStepIndices(prev => {
          if (prev.includes(tappedIdx)) {
            return prev.filter(idx => idx !== tappedIdx);
          } else {
            return [...prev, tappedIdx];
          }
        });
      }
    }

    touchStartPos.current = null;
    initialTouchIndexRef.current = null;
  };

  const handleStepMouseDownMulti = (e: React.MouseEvent, index: number) => {
    if (!isMultiSelectActive) return;
    if (e.button !== 0) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;

    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;

    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      if (!wasSel) {
        setSelectedStepIndices(prev => [...prev, index]);
      }
    } else {
      setSelectedStepIndices([index]);
    }
  };

  const handleStepMouseEnterMulti = (index: number) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    hasDraggedRef.current = true;
    setSelectedStepIndices(prev => {
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
  };

  const handleCopyRelative = (ptn: any) => {
    if (selectedStepIndices.length === 0) return;
    const sorted = [...selectedStepIndices].sort((a, b) => a - b);
    const baseIdx = sorted[0];
    const copiedSteps = sorted.map(idx => ({
      offset: idx - baseIdx,
      val: ptn?.activeSteps?.[idx] ?? 0,
      lyric: ptn?.lyrics?.[idx] || '',
      note: ptn?.notes?.[idx] || '',
    }));
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = { steps: copiedSteps };
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
  };

  const handlePasteRelative = (ptn: any, targetIdx: number) => {
    const globalClipboard = getGlobalClipboard();
    if (!globalClipboard) return;
    const destIndices: number[] = [];
    const destValues: string[] = [];
    const destLyrics: string[] = [];
    const destNotes: string[] = [];

    globalClipboard.steps.forEach((item: any) => {
      const destIdx = targetIdx + item.offset;
      if (destIdx >= 0 && destIdx < ptn.steps) {
        destIndices.push(destIdx);
        destValues.push(String(item.val));
        destLyrics.push(item.lyric || '');
        destNotes.push(item.note || '');
      }
    });

    if (destIndices.length > 0) {
      if (selectedVariationId) {
        handleVariationStepValueChange(trackId, ptn.id, selectedVariationId, destIndices, destValues);
      } else {
        handleTrackStepValueChange(trackId, ptn.id, destIndices, destValues, destLyrics, destNotes);
      }
      setSelectedStepIndices([]);
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, currentVal: string | number) => {
    if ('shiftKey' in e && e.shiftKey) return;
    if (onStepTouchStart) {
      onStepTouchStart(e, pattern.id, stepIdx, instrument.id, currentVal, (newVal) => {
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, stepIdx, newVal);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, stepIdx, newVal);
        }
      });
    }
  };

  /* Voice input navigation helper */
  const handleVoiceNav = React.useCallback((el: HTMLInputElement, key: string, type: 'syl' | 'note') => {
    if (key === 'Tab') return;
    const parentContainer = el.closest('.step-boxes');
    if (!parentContainer) return;
    const cards = Array.from(parentContainer.querySelectorAll('.v-card'));
    const currentCard = el.closest('.v-card');
    if (!currentCard) return;
    const idx = cards.indexOf(currentCard);

    if ((key === 'ArrowRight' || key === 'Enter') && idx < cards.length - 1) {
      const nextCard = cards[idx + 1] as HTMLElement;
      const input = nextCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    } else if (key === 'ArrowLeft' && idx > 0) {
      const prevCard = cards[idx - 1] as HTMLElement;
      const input = prevCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    }
  }, []);

  const getDisplayVal = (val: string | number): string => {
    if (val === 0 || val === '0') return '';
    return String(val);
  };

  const renderSelectionToolbar = (ptn: Pattern) => {
    return (
      <div className="flex justify-between items-center bg-[#f4ecd8] border-b border-[#1a1a1a]/20 pb-1.5 mb-2 text-[10px] font-bold w-full select-none">
        <span className="text-[#666] uppercase tracking-wider">
          {lang === 'fr' ? 'Multi-sélection' : 'Multi-selection'}
        </span>
        <div className="flex gap-1.5 items-center">
          {selectedStepIndices.length > 0 && (
            <>
              <button
                onClick={() => handleCopyRelative(ptn)}
                className="px-1.5 py-0.5 bg-[#8b2a1a] text-[#f4ecd8] rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#a63d2d] transition-colors"
              >
                {lang === 'fr' ? 'Copier' : 'Copy'} ({selectedStepIndices.length})
              </button>
              <button
                onClick={() => setSelectedStepIndices([])}
                className="px-1.5 py-0.5 bg-[#8b2a1a] text-[#f4ecd8] rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#a63d2d] transition-colors"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
            </>
          )}
          {hasClipboard && selectedStepIndices.length === 1 && (
            <button
              onClick={() => handlePasteRelative(ptn, selectedStepIndices[0])}
              className="px-1.5 py-0.5 bg-[#1e824c] text-white rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#27ae60] transition-colors"
            >
              {lang === 'fr' ? 'Coller' : 'Paste'}
            </button>
          )}
          <button
            onClick={() => {
              setIsMultiSelectActive(!isMultiSelectActive);
              setSelectedStepIndices([]);
            }}
            className={`px-1.5 py-0.5 rounded border border-[#1a1a1a] text-[9px] cursor-pointer font-bold ${
              isMultiSelectActive ? 'bg-blue-600 text-white' : 'bg-transparent text-[#1a1a1a]'
            }`}
          >
            {isMultiSelectActive 
              ? (lang === 'fr' ? 'Mode Normal' : 'Normal Mode') 
              : (lang === 'fr' ? 'Multi-sél. Off' : 'Multi-sel. Off')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div ref={gridRef} className="w-full flex flex-col gap-2">
      <style>{`
        .live-playhead-highlight {
          background-color: #1a1a1a !important;
          color: #f4ecd8 !important;
          border-color: #8b2a1a !important;
          box-shadow: 0 0 8px rgba(139, 42, 26, 0.6) !important;
          transform: scale(1.1) !important;
          z-index: 20 !important;
        }
        .slider-transparent-track::-webkit-slider-runnable-track {
          background: transparent !important;
        }
        .slider-transparent-track::-moz-range-track {
          background: transparent !important;
        }
      `}</style>
      
      {isTouchDevice && renderSelectionToolbar(pattern)}

      {instrument.type === 'voice' ? (
        /* ──── Voice step grid ──── */
        <div
          className="step-boxes flex flex-wrap gap-y-4 gap-x-6"
          id={`detail-voice-${trackId}-${pattern.id}`}
          onTouchMove={handleGridTouchMove}
          onTouchEnd={handleGridTouchEnd}
        >
          {(() => {
            const groups = [];
            let accumulated = 0;
            const defaultBeats = 4;
            const beatRes = pattern?.beatResolutions || Array(Math.ceil((pattern?.steps ?? 16) / defaultBeats)).fill(defaultBeats);
            for (let b = 0; b < beatRes.length; b++) {
              const res = beatRes[b];
              const group = [];
              for (let i = 0; i < res; i++) {
                if (accumulated + i < (pattern?.steps ?? 16)) {
                  group.push(accumulated + i);
                }
              }
              if (group.length > 0) groups.push(group);
              accumulated += res;
            }
            return groups.map((group, groupIdx) => (
              <div key={groupIdx} className="flex gap-4 p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                {group.map((i) => {
                  const state = pattern?.activeSteps?.[i];
                  const isActive = state !== 0;
                  const isPux = state === 'P';
                  const syl = pattern?.lyrics?.[i] || '';
                  const note = pattern?.notes?.[i] || '';
                  const typeText = isActive ? (isPux ? '🗣️ Pux' : '👥 Coro') : '---';
                  const typeClass = isActive ? 'text-white' : 'bg-transparent text-[#666]';
                  const typeStyle = isActive
                    ? { backgroundColor: isPux ? '#8b2a1a' : '#2980b9', color: '#ffffff' }
                    : {};

                  const isSelected = selectedStepIndices.includes(i);

                  // Calculate total micro-timing shift (manual + global swing)
                  const manualMicro = pattern?.microtimings?.[i] ?? 0;
                  const swingOffset = getStepSwingPercent(i, pattern?.steps ?? 16, pattern?.beatResolutions);
                  const totalShift = Math.max(-100, Math.min(100, manualMicro + swingOffset));
                  const shiftPx = (totalShift / 100) * 8; // Max 8px shift

                  const isLinked = syl && !syl.endsWith(' ') && i < (pattern?.steps ?? 16) - 1 && (pattern?.lyrics?.[i + 1] || '').trim() !== '';

                  return (
                    <div key={i} className="relative" style={{ width: '56px' }}>
                      {/* Axis vertical centerline (0%) behind steps */}
                      <div className="absolute top-[20px] bottom-[10px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />
                      
                      {isLinked && (
                        <div className="absolute top-[48px] -right-[12px] w-[14px] h-[3px] bg-[#8b2a1a]/60 z-20 pointer-events-none rounded-sm" />
                      )}
                      
                      <div
                        className={`v-card flex flex-col bg-[#f4ecd8] cordel-border-sm overflow-hidden z-10 relative transition-all duration-100 ${
                          isSelected
                            ? 'border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f]'
                            : 'border-[#1a1a1a]'
                        }`}
                        style={{
                          width: '56px',
                          transform: `translateX(${shiftPx}px)`,
                        }}
                        data-track-id={trackId}
                        data-step-index={i}
                        data-step-type="voice"
                        onTouchStart={(e) => {
                          if (isMultiSelectActive) {
                            handleStepTouchStartMulti(e, i);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (isMultiSelectActive) {
                            handleStepMouseDownMulti(e, i);
                          }
                        }}
                        onMouseEnter={() => {
                          if (isMultiSelectActive) {
                            handleStepMouseEnterMulti(i);
                          }
                        }}
                      >
                        {/* Step number */}
                        <div className="text-[8px] text-[#999] text-center font-bold bg-[#ece4d0] leading-tight py-0.5">
                          {i + 1}
                        </div>

                        {/* PUX / CORO toggle */}
                        <div
                          onClick={() => {
                            if (!isMultiSelectActive) {
                              handleVoiceTypeToggle(trackId, pattern.id, i);
                            }
                          }}
                          className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                          style={typeStyle}
                        >
                          {typeText}
                        </div>

                        {/* Syllable input */}
                        <input
                          type="text"
                          value={syl}
                          readOnly={isMultiSelectActive}
                          onChange={(e) => handleVoiceSylChange(trackId, pattern.id, i, e.target.value)}
                          placeholder="-"
                          className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-[#1a1a1a] outline-none"
                          onFocus={() => {
                            if (!isMultiSelectActive) {
                              setSelectedStepIdx(i);
                              setSelectedPatternId(pattern.id);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                            } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
                              handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                            }
                          }}
                        />

                        {/* Note input */}
                        <input
                          type="text"
                          value={note}
                          readOnly={isMultiSelectActive}
                          onChange={(e) => handleVoiceNoteChange(trackId, pattern.id, i, e.target.value)}
                          onBlur={(e) => handleVoiceNoteBlur(trackId, pattern.id, i, e.target.value)}
                          placeholder="C4"
                          className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#1a1a1a] uppercase outline-none cursor-pointer hover:bg-black/5"
                          onFocus={(e) => {
                            if (!isMultiSelectActive) {
                              setSelectedStepIdx(i);
                              setSelectedPatternId(pattern.id);
                              setNoteSelectorTarget({ patternId: pattern.id, stepIdx: i, note, element: e.currentTarget });
                            }
                          }}
                          onClick={(e) => {
                            if (!isMultiSelectActive) {
                              setNoteSelectorTarget({ patternId: pattern.id, stepIdx: i, note, element: e.currentTarget });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                            } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
                              handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                            }
                          }}
                        />
                        {/* Sculpting micro-bars */}
                        <div className="w-full flex flex-col gap-[2px] p-[2px] bg-[#ece4d0] border-t border-[#1a1a1a]/20 shrink-0">
                          <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                            <div className="h-[2px] bg-green-600 rounded-none transition-all" style={{ width: `${pattern.volumes?.[i] ?? 100}%` }} />
                          </div>
                          <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                            <div className="h-[2px] bg-amber-500 rounded-none transition-all" style={{ width: `${pattern.decays?.[i] ?? 100}%` }} />
                          </div>
                          <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                            {totalShift !== 0 && (
                              <div
                                className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                style={{
                                  left: totalShift > 0 ? '50%' : 'auto',
                                  right: totalShift < 0 ? '50%' : 'auto',
                                  width: `${Math.min(50, Math.abs(totalShift) / 2)}%`
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
          
          {/* Live Karaoke Preview */}
          {(() => {
            const karaokeWords = [];
            let currentWord = [];
            
            for (let idx = 0; idx < (pattern?.steps ?? 16); idx++) {
              const active = pattern?.activeSteps?.[idx] !== 0;
              const syl = pattern?.lyrics?.[idx] || '';
              if (active && syl) {
                currentWord.push({ text: syl, index: idx });
                if (syl.endsWith(' ') || idx === (pattern?.steps ?? 16) - 1) {
                  karaokeWords.push([...currentWord]);
                  currentWord = [];
                }
              }
            }
            if (currentWord.length > 0) {
              karaokeWords.push(currentWord);
            }

            return (
              <div className="mt-3 p-3 bg-[#ece4d0] border border-[#1a1a1a]/25 cordel-border-sm flex flex-col gap-1 w-full text-[#1a1a1a]">
                <span className="text-[10px] font-bold uppercase opacity-65 tracking-wider">
                  📖 {lang === 'fr' ? 'Paroles (Karaoké en direct)' : 'Letras (Karaokê ao vivo)'}
                </span>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-bold font-cactus leading-relaxed">
                  {karaokeWords.length === 0 ? (
                    <span className="italic text-[#666]">
                      {lang === 'fr' ? 'Saisissez des syllabes dans la grille...' : 'Digite sílabas na grade...'}
                    </span>
                  ) : (
                    karaokeWords.map((word, wIdx) => {
                      return (
                        <span 
                          key={wIdx} 
                          data-word-steps={JSON.stringify(word.map(item => item.index))}
                          className="opacity-85 transition-colors duration-150"
                        >
                          {word.map((item, sIdx) => {
                            return (
                              <span 
                                key={sIdx} 
                                data-syl-index={item.index}
                              >
                                {item.text}
                              </span>
                            );
                          })}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* ──── Instrument step grid ──── */
        <div
          className="step-boxes flex flex-wrap gap-y-4 gap-x-6"
          id={`detail-steps-${trackId}-${pattern.id}`}
          onTouchMove={handleGridTouchMove}
          onTouchEnd={handleGridTouchEnd}
        >
          {(() => {
            const groups = [];
            let accumulated = 0;
            const defaultBeats = 4;
            const beatRes = pattern?.beatResolutions || Array(Math.ceil((pattern?.steps ?? 16) / defaultBeats)).fill(defaultBeats);
            for (let b = 0; b < beatRes.length; b++) {
              const res = beatRes[b];
              const group = [];
              for (let i = 0; i < res; i++) {
                if (accumulated + i < (pattern?.steps ?? 16)) {
                  group.push(accumulated + i);
                }
              }
              if (group.length > 0) groups.push(group);
              accumulated += res;
            }
            return groups.map((group, groupIdx) => {
              const isTriplet = group.length === 3;
              const isSextuplet = group.length === 6;
              
              return (
                <div key={groupIdx} className="flex flex-col gap-1 shrink-0">
                  {isTupletEditMode && (
                    <div className="flex justify-center mb-1">
                      <select 
                        value={group.length}
                        onChange={(e) => handlePatternBeatResolutionChange(pattern.id, groupIdx, parseInt(e.target.value))}
                        className="text-[10px] bg-[#ece4d0] border border-[#1a1a1a]/20 rounded-sm outline-none px-1 py-0.5 font-bold cursor-pointer hover:bg-[#ece4d0]/80 transition-colors"
                      >
                        <option value="3">3 (Triolet)</option>
                        <option value="4">4 (D.Croches)</option>
                        <option value="6">6 (Sextolet)</option>
                      </select>
                    </div>
                  )}
                  <div className={`p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm relative ${isSextuplet ? 'h-[72px]' : isTriplet ? 'flex justify-between' : 'flex gap-4'}`} style={{ width: '204px' }}>
                    {group.map((i, indexInGroup) => {
                      const val = pattern?.activeSteps?.[i];
                      const displayVal = getDisplayVal(val);
                      const isActive = val !== 0 && val !== '';

                      const isSelected = selectedStepIndices.includes(i);
                      const isSingleSelected = selectedStepIdx === i;

                      let colorStyle: React.CSSProperties = {};
                      if (isActive) {
                        const bgColor = instrument?.colors?.[val as string] || '#111';
                        let txtColor = instrument?.colors?.text || '#f4ecd8';
                        if (isDarkText(instrument?.id, val as string)) {
                          txtColor = '#1a1a1a';
                        }
                        colorStyle = {
                          backgroundColor: bgColor,
                          borderColor: (isSelected || isSingleSelected) ? undefined : bgColor,
                          color: txtColor,
                        };
                      }

                      // Calculate total micro-timing shift (manual + global swing)
                      const manualMicro = pattern?.microtimings?.[i] ?? 0;
                      const swingOffset = getStepSwingPercent(i, pattern?.steps ?? 16, pattern?.beatResolutions);
                      const totalShift = Math.max(-100, Math.min(100, manualMicro + swingOffset));
                      const shiftPx = (totalShift / 100) * 8; // Max 8px shift

                      const isMultiSelected = selectedStepIndices.includes(i) && selectedStepIndices.length > 1;

                      let wrapperClasses = "relative flex flex-col items-center";
                      let wrapperStyle: React.CSSProperties = { width: '36px' };
                      
                      if (isSextuplet) {
                        wrapperClasses = "absolute flex flex-col items-center justify-center top-1.5 z-10 hover:z-20";
                        wrapperStyle = { 
                          width: '54.8px', 
                          left: `${6 + indexInGroup * 27.4}px`
                        };
                      } else if (isTriplet) {
                        wrapperStyle = { width: '48px' };
                      }

                      return (
                        <div key={i} className={wrapperClasses} style={wrapperStyle}>
                          {/* Axis vertical centerline (0%) behind steps */}
                          <div className="absolute top-[12px] bottom-[15px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />

                          <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
                          <input
                            type="text"
                            maxLength={['caixa', 'tarol', 'timbal'].includes(instrument?.id) ? 2 : 1}
                            value={displayVal}
                            readOnly={isMultiSelectActive}
                            inputMode={isTouchDevice ? 'none' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                              if (!isTouchDevice) {
                                e.target.select();
                              }
                              setSelectedPatternId(pattern.id);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (e.button !== 0) return;
                              setSelectedPatternId(pattern.id);
                              setSelectedVariationId(null);

                              if (isMultiSelectActive) {
                                handleStepMouseDownMulti(e, i);
                                return;
                              }

                              // 1. Alt Key Paint Editing
                              if (e.altKey) {
                                isMouseDownRef.current = true;
                                const nextVal = getNextStepValue(instrument?.id, instrument?.type, val);
                                paintValueRef.current = nextVal;
                                if (selectedVariationId) {
                                  handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, i, String(nextVal));
                                } else {
                                  handleTrackStepValueChange(trackId, pattern.id, i, String(nextVal));
                                }
                                return;
                              }

                              // 2. Shift + Clic (Selection Range)
                              if (e.shiftKey) {
                                e.preventDefault();
                                if (selectedStepIdx !== null) {
                                  const start = Math.min(selectedStepIdx, i);
                                  const end = Math.max(selectedStepIdx, i);
                                  const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                                  setSelectedStepIndices(rangeIndices);
                                  setSelectedStepIdx(i);
                                }
                                return;
                              }

                              // 3. Regular selection & painting
                              setSelectedStepIdx(i);
                              setSelectedStepIndices([i]);
                              isMouseDownRef.current = true;
                              const nextVal = getNextStepValue(instrument?.id, instrument?.type, val);
                              paintValueRef.current = nextVal;
                              if (selectedVariationId) {
                                handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, i, String(nextVal));
                              } else {
                                handleTrackStepValueChange(trackId, pattern.id, i, String(nextVal));
                              }
                            }}
                            onMouseEnter={() => {
                              if (isMultiSelectActive) {
                                handleStepMouseEnterMulti(i);
                              } else {
                                if (isMouseDownRef.current) {
                                  if (selectedVariationId) {
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, i, String(paintValueRef.current));
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, i, String(paintValueRef.current));
                                  }
                                }
                              }
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setSelectedPatternId(pattern.id);
                              setSelectedVariationId(null);
                              if (isMultiSelectActive) {
                                handleStepTouchStartMulti(e, i);
                              } else {
                                setSelectedStepIdx(i);
                                setSelectedStepIndices([i]);
                                handleStart(e, i, val);
                              }
                            }}
                            onChange={(e) => {
                              if (selectedVariationId) {
                                handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, i, e.target.value);
                              } else {
                                handleTrackStepValueChange(trackId, pattern.id, i, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                              
                              const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                              if (isCtrlOrMeta && e.key.toLowerCase() === 'c') {
                                e.preventDefault();
                                if (selectedStepIndices.length > 0) {
                                  handleCopyRelative(pattern);
                                } else {
                                  onCopyPattern && onCopyPattern(pattern);
                                }
                                return;
                              }
                              if (isCtrlOrMeta && e.key.toLowerCase() === 'v') {
                                e.preventDefault();
                                if (hasClipboard) {
                                  handlePasteRelative(pattern, i);
                                } else {
                                  if (canPaste && onPastePattern) {
                                    onPastePattern(pattern.id);
                                  }
                                }
                                return;
                              }
                              if (e.key === 'Delete' || e.key === 'Backspace' || e.key === ' ') {
                                e.preventDefault();
                                if (selectedStepIndices.length > 1) {
                                  if (selectedVariationId) {
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, selectedStepIndices, '0');
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, selectedStepIndices, '0');
                                  }
                                  setSelectedStepIndices([]);
                                } else {
                                  if (selectedVariationId) {
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, i, '0');
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, i, '0');
                                  }
                                  if (e.key === 'Backspace') {
                                    const inputEl = e.currentTarget as HTMLInputElement;
                                    handleTrackStepKeyDown(trackId, pattern.id, i, e.key, '', inputEl);
                                  }
                                }
                                return;
                              }
                              
                              if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
                                e.preventDefault();
                                if (selectedStepIndices.length > 1) {
                                  if (selectedVariationId) {
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, selectedStepIndices, e.key);
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, selectedStepIndices, e.key);
                                  }
                                  setSelectedStepIndices([]);
                                } else {
                                  if (selectedVariationId) {
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, i, e.key);
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, i, e.key);
                                  }
                                  const inputEl = e.currentTarget as HTMLInputElement;
                                  if (inputEl.parentElement?.nextElementSibling) {
                                    const nextInput = inputEl.parentElement.nextElementSibling.querySelector('input');
                                    if (nextInput) {
                                      nextInput.focus();
                                      nextInput.select();
                                    }
                                  }
                                }
                                return;
                              }

                              const inputEl = e.currentTarget as HTMLInputElement;
                              handleTrackStepKeyDown(trackId, pattern.id, i, e.key, inputEl.value, inputEl);
                            }}
                            className={`text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border z-10 relative transition-all duration-200 ${
                              val === 0
                                ? 'bg-[#f4ecd8] text-[#1a1a1a] focus:border-[#8b2a1a]'
                                : ''
                            } ${
                              isMultiSelected
                                ? '!border-[2px] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                                : (selectedStepIdx === i)
                                  ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                                  : 'outline-none'
                            }`}
                            style={{
                              ...colorStyle,
                              width: isSextuplet || isTriplet ? '100%' : '36px',
                              height: isSextuplet || isTriplet ? '48px' : '36px',
                              transform: `translateX(${shiftPx}px)`,
                              clipPath: isSextuplet 
                                ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
                                : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                              borderStyle: isSextuplet || isTriplet ? 'none' : undefined,
                              borderRadius: isSextuplet || isTriplet ? '0' : undefined
                            }}
                            data-track-id={trackId}
                            data-step-index={i}
                          />
                          {/* Sculpting micro-bars */}
                          <div className="w-full flex flex-col gap-[2px] mt-1 z-10 relative">
                            {/* Volume bar (Green) */}
                            <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                              <div className="h-full bg-green-600 transition-all" style={{ width: `${pattern?.volumes?.[i] ?? 100}%` }} />
                            </div>
                            {/* Decay bar (Amber) */}
                            <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                              <div className="h-full bg-amber-500 transition-all" style={{ width: `${pattern?.decays?.[i] ?? 100}%` }} />
                            </div>
                            {/* Micro-timing bar (Blue bi-directional) */}
                            <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                              {totalShift !== 0 && (
                                <div
                                  className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                  style={{
                                    left: totalShift > 0 ? '50%' : 'auto',
                                    right: totalShift < 0 ? '50%' : 'auto',
                                    width: `${Math.min(50, Math.abs(totalShift) / 2)}%`
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

export const InstrumentPatternGrid = React.memo(InstrumentPatternGridComponent);
