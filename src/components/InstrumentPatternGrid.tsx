/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { Pattern } from '../types';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { Trash2 } from 'lucide-react';
import { isDarkText, instrumentsConfig, NEWTON_NOTE_COLORS } from '../data';

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
    onSelect: (val: string) => void,
    trackId: number
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

interface PercussionStepCellProps {
  i: number;
  val: string | number;
  volume: number;
  decay: number;
  microtiming: number;
  isSelected: boolean;
  isMultiSelected: boolean;
  isFocused: boolean;
  shiftPx: number;
  colorStyle: React.CSSProperties;
  isMultiSelectActive: boolean;
  isSextuplet: boolean;
  isTriplet: boolean;
  indexInGroup: number;
  totalShift: number;
  trackId: number;
  
  onMouseDown: (e: React.MouseEvent<HTMLInputElement>, index: number, value: string | number) => void;
  onMouseEnter: (index: number) => void;
  onTouchStart: (e: React.TouchEvent<HTMLInputElement>, index: number, value: string | number) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
}

const PercussionStepCell = React.memo(({
  i,
  val,
  volume,
  decay,
  microtiming,
  isSelected,
  isMultiSelected,
  isFocused,
  shiftPx,
  colorStyle,
  isMultiSelectActive,
  isSextuplet,
  isTriplet,
  indexInGroup,
  totalShift,
  trackId,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
  onChange,
  onKeyDown
}: PercussionStepCellProps) => {
  return (
    <div key={i} className="flex flex-col items-center select-none" style={{ width: isSextuplet || isTriplet ? 'auto' : '36px', flex: isSextuplet || isTriplet ? '1' : 'none' }}>
      <input
        type="text"
        value={val === 0 ? '' : val}
        readOnly={isMultiSelectActive}
        onMouseDown={(e) => onMouseDown(e, i, val)}
        onMouseEnter={() => onMouseEnter(i)}
        onTouchStart={(e) => onTouchStart(e, i, val)}
        onChange={(e) => onChange(e, i)}
        onKeyDown={(e) => onKeyDown(e, i)}
        className={`text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border z-10 relative transition-all duration-200 ${
          val === 0
            ? 'bg-[#f4ecd8] text-[#1a1a1a] focus:border-[#8b2a1a]'
            : ''
        } ${
          isMultiSelected
            ? '!border-[2px] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
            : isFocused
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
          <div className="h-full bg-green-600 transition-all" style={{ width: `${volume}%` }} />
        </div>
        {/* Decay bar (Amber) */}
        <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${decay}%` }} />
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
}, (prevProps, nextProps) => {
  return (
    prevProps.val === nextProps.val &&
    prevProps.volume === nextProps.volume &&
    prevProps.decay === nextProps.decay &&
    prevProps.microtiming === nextProps.microtiming &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelected === nextProps.isMultiSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.shiftPx === nextProps.shiftPx &&
    prevProps.totalShift === nextProps.totalShift &&
    prevProps.colorStyle.backgroundColor === nextProps.colorStyle.backgroundColor &&
    prevProps.colorStyle.color === nextProps.colorStyle.color &&
    prevProps.isMultiSelectActive === nextProps.isMultiSelectActive &&
    prevProps.isSextuplet === nextProps.isSextuplet &&
    prevProps.isTriplet === nextProps.isTriplet &&
    prevProps.indexInGroup === nextProps.indexInGroup &&
    prevProps.trackId === nextProps.trackId
  );
});

interface VoiceStepCellProps {
  i: number;
  steps: number;
  trackId: number;
  patternId: number;
  state: string | number;
  syl: string;
  note: string;
  isSelected: boolean;
  isMultiSelectActive: boolean;
  manualMicro: number;
  totalShift: number;
  shiftPx: number;
  isLinked: boolean;
  volume: number;
  decay: number;
  isPreRoll?: boolean;
  
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>, index: number) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>, index: number) => void;
  onMouseEnter?: (index: number) => void;
  onVoiceTypeToggle: (trackId: number, patternId: number, index: number) => void;
  onVoiceSylChange: (trackId: number, patternId: number, index: number, value: string) => void;
  onVoiceNoteChange: (trackId: number, patternId: number, index: number, value: string) => void;
  onVoiceNoteBlur: (trackId: number, patternId: number, index: number, value: string) => void;
  onFocusStep: (index: number) => void;
  onNoteSelectorTarget: (target: { patternId: number; stepIdx: number; note: string; element: HTMLInputElement }) => void;
  onVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
}

const VoiceStepCellComponent = ({
  i,
  steps,
  trackId,
  patternId,
  state,
  syl,
  note,
  isSelected,
  isMultiSelectActive,
  manualMicro,
  totalShift,
  shiftPx,
  isLinked,
  volume,
  decay,
  isPreRoll,
  onTouchStart,
  onMouseDown,
  onMouseEnter,
  onVoiceTypeToggle,
  onVoiceSylChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  onFocusStep,
  onNoteSelectorTarget,
  onVoiceNav
}: VoiceStepCellProps) => {
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const isActive = state !== 0 && state !== '';
  const isPux = state === 'P';
  const inst = instrumentsConfig.find(c => c.id === (isPux ? 'puxador' : 'coro')) || { color: '#f4ecd8' };
  const cardBg = isActive 
    ? (isPreRoll ? '#999999' : inst.color) 
    : (isPreRoll ? 'rgba(0, 0, 0, 0.08)' : 'transparent');

  const vocalTransposeSteps = useSequencerStore(state => state.vocalTransposeSteps || 0);

  const getTransposedNoteDetails = () => {
    if (!note || note.trim() === '') {
      return { letter: '', octave: '', color: '#1a1a1a' };
    }
    let finalNote = note;
    if (vocalTransposeSteps !== 0) {
      try {
        finalNote = Tone.Frequency(note).transpose(vocalTransposeSteps).toNote();
      } catch (_) {}
    }
    const letter = finalNote.includes('#') ? finalNote.substring(0, 2).toUpperCase() : finalNote.charAt(0).toUpperCase();
    const oct = finalNote.replace(/^[a-gA-G][#b]?/, '');
    const base = finalNote.charAt(0).toUpperCase();
    const color = base ? (NEWTON_NOTE_COLORS[base] || '#1a1a1a') : '#1a1a1a';
    return { letter, octave: oct, color };
  };

  const { letter: noteLetterOnly, octave, color: noteColor } = getTransposedNoteDetails();

  return (
    <div className="relative" style={{ width: '56px' }}>
      {/* Axis vertical centerline (0%) behind steps */}
      <div className="absolute top-[20px] bottom-[10px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />
      
      {isLinked && (
        <div className="absolute top-[48px] -right-[12px] w-[14px] h-[3px] bg-[#8b2a1a]/60 z-20 pointer-events-none rounded-sm" />
      )}
      
      <div
        className={`v-card flex flex-col cordel-border-sm overflow-hidden z-10 relative transition-all duration-100 ${
          isSelected
            ? 'border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f]'
            : 'border-[#1a1a1a]'
        }`}
        style={{
          width: '56px',
          transform: `translateX(${shiftPx}px)`,
          backgroundColor: cardBg,
        }}
        data-track-id={trackId}
        data-step-index={i}
        data-step-type="voice"
        onTouchStart={(e) => onTouchStart?.(e, i)}
        onMouseDown={(e) => onMouseDown?.(e, i)}
        onMouseEnter={() => onMouseEnter?.(i)}
      >
        {/* Step number */}
        <div className="text-[8px] text-[#999] text-center font-bold bg-[#ece4d0] leading-tight py-0.5">
          {i + 1}
        </div>



        {/* Syllable input */}
        <input
          type="text"
          value={syl}
          readOnly={isMultiSelectActive}
          onChange={(e) => onVoiceSylChange(trackId, patternId, i, e.target.value)}
          placeholder="-"
          className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-black outline-none"
          onFocus={() => {
            if (!isMultiSelectActive) {
              onFocusStep(i);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              onVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
            } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
              onVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
            }
          }}
        />

        {/* Note input */}
        <div className="relative w-full h-[24px] flex items-center justify-center cursor-pointer hover:bg-black/5">
          <input
            type="text"
            value={note}
            readOnly={isMultiSelectActive}
            onChange={(e) => onVoiceNoteChange(trackId, patternId, i, e.target.value)}
            onBlur={(e) => {
              onVoiceNoteBlur(trackId, patternId, i, e.target.value);
              setIsNoteFocused(false);
            }}
            placeholder="C4"
            className={`v-note w-full h-full text-center text-[10px] py-1 bg-transparent border-0 uppercase outline-none transition-opacity ${
              isNoteFocused ? 'opacity-100 z-10 text-black font-bold' : 'opacity-0 z-0'
            }`}
            onFocus={(e) => {
              if (!isMultiSelectActive) {
                onFocusStep(i);
                onNoteSelectorTarget({ patternId, stepIdx: i, note, element: e.currentTarget as any });
                setIsNoteFocused(true);
              }
            }}
            onClick={(e) => {
              if (!isMultiSelectActive) {
                onNoteSelectorTarget({ patternId, stepIdx: i, note, element: e.currentTarget as any });
                setIsNoteFocused(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                onVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
              } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
                onVoiceNav(e.target as HTMLInputElement, e.key, 'note');
              }
            }}
          />
          {!isNoteFocused && (
            <span 
              className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-wide pointer-events-none"
              style={{ color: noteColor, textShadow: '0 1px 2px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 0, 0, 0.5)' }}
            >
              {noteLetterOnly || '-'}
              {octave && <span className="text-[7px] align-super opacity-60 ml-0.5">{octave}</span>}
            </span>
          )}
        </div>
        {/* Sculpting micro-bars */}
        <div className="w-full flex flex-col gap-[2px] p-[2px] bg-[#ece4d0] border-t border-[#1a1a1a]/20 shrink-0">
          <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
            <div className="h-[2px] bg-green-600 rounded-none transition-all" style={{ width: `${volume}%` }} />
          </div>
          <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
            <div className="h-[2px] bg-amber-500 rounded-none transition-all" style={{ width: `${decay}%` }} />
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
};

const areVoicePropsEqual = (prev: VoiceStepCellProps, next: VoiceStepCellProps) => {
  return prev.i === next.i &&
         prev.steps === next.steps &&
         prev.trackId === next.trackId &&
         prev.patternId === next.patternId &&
         prev.state === next.state &&
         prev.syl === next.syl &&
         prev.note === next.note &&
         prev.isSelected === next.isSelected &&
         prev.isMultiSelectActive === next.isMultiSelectActive &&
         prev.manualMicro === next.manualMicro &&
         prev.totalShift === next.totalShift &&
         prev.shiftPx === next.shiftPx &&
         prev.isLinked === next.isLinked &&
         prev.volume === next.volume &&
         prev.decay === next.decay;
};

const VoiceStepCell = React.memo(VoiceStepCellComponent, areVoicePropsEqual);

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
    handleVoicePreRollSylChange,
    handleVoicePreRollNoteChange,
    handleVoicePreRollNoteBlur,
    handleTrackStepsChange,
    handleDeletePatternMeasure,
    handlePatternBeatResolutionChange,
    handleVariationStepValueChange,
  } = useSequencer();

  const globalSwing = useTransportStore(state => state.globalSwing);
  const { soloPatternPlayIdRef } = useAudio();

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

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      if (!detail || !gridRef.current) return;

      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;

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

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
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
          }, trackId);
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
      }, trackId);
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
      
      {isTouchDevice && renderSelectionToolbar(pattern)}      {instrument.type === 'voice' ? (
        /* ──── Voice step grid ──── */
        <div className="flex flex-col w-full gap-2">
          {/* Pre-roll (Mesure -1) Section */}
          {(() => {
            const preRollGroups = [
              [0, 1, 2, 3],
              [4, 5, 6, 7],
              [8, 9, 10, 11],
              [12, 13, 14, 15]
            ];

            const getPreRollStepsCount = () => {
              if (!pattern?.preRollActiveSteps) return 0;
              for (let i = 0; i < 16; i++) {
                const stepVal = pattern.preRollActiveSteps[i];
                if (stepVal && stepVal !== 0 && stepVal !== '0') {
                  return 16 - i;
                }
              }
              return 0;
            };

            const preRollStepsCount = getPreRollStepsCount();

            const renderPreRollGroup = (group: number[], groupIdx: number) => (
              <div key={`preroll-group-${groupIdx}`} className="flex gap-4 p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                {group.map((i) => {
                  const state = pattern?.preRollActiveSteps?.[i] ?? 0;
                  const syl = pattern?.preRollLyrics?.[i] || '';
                  const note = pattern?.preRollNotes?.[i] || '';
                  const volume = pattern?.preRollVolumes?.[i] ?? 100;
                  const decay = pattern?.preRollDecays?.[i] ?? 10;
                  return (
                    <VoiceStepCell
                      key={`preroll-cell-${i}`}
                      i={i}
                      steps={16}
                      trackId={trackId}
                      patternId={pattern.id}
                      state={state}
                      syl={syl}
                      note={note}
                      isSelected={false}
                      isMultiSelectActive={false}
                      manualMicro={0}
                      totalShift={0}
                      shiftPx={0}
                      isLinked={false}
                      volume={volume}
                      decay={decay}
                      isPreRoll={true}
                      onVoiceTypeToggle={() => {}}
                      onVoiceSylChange={handleVoicePreRollSylChange}
                      onVoiceNoteChange={handleVoicePreRollNoteChange}
                      onVoiceNoteBlur={handleVoicePreRollNoteBlur}
                      onFocusStep={() => {}}
                      onNoteSelectorTarget={setNoteSelectorTarget}
                      onVoiceNav={handleVoiceNav}
                    />
                  );
                })}
              </div>
            );

            return (
              <div 
                className="pre-roll-section w-full mb-1 p-3.5 rounded border border-dashed border-[#1a1a1a]/30"
                style={{
                  background: 'repeating-linear-gradient(45deg, rgba(200, 200, 200, 0.15), rgba(200, 200, 200, 0.15) 10px, rgba(160, 160, 160, 0.1) 10px, rgba(160, 160, 160, 0.1) 20px)',
                  backgroundColor: 'rgba(0, 0, 0, 0.05)'
                }}
              >
                <div className="text-[11px] font-bold text-[#8b2a1a] mb-2 tracking-wide uppercase select-none flex items-center gap-1.5">
                  <span>🎙️ {lang === 'fr' ? 'Mesure -1 : Anacrouse (Pre-roll)' : 'Compasso -1 : Anacruse (Pre-roll)'}</span>
                  {preRollStepsCount > 0 && (
                    <span className="bg-[#8b2a1a] text-[#f4ecd8] text-[8px] font-bold px-1.5 py-px rounded-full animate-pulse">
                      +{preRollStepsCount} {lang === 'fr' ? 'pas' : 'passos'}
                    </span>
                  )}
                  <span className="text-[9px] text-[#555] font-normal normal-case italic ml-auto">
                    ({lang === 'fr' ? 'La première syllabe détermine la durée' : 'A primeira sílaba determina a duração'})
                  </span>
                </div>
                <div 
                  className="step-boxes flex flex-nowrap gap-x-2 w-full overflow-x-auto justify-between p-1 bg-[#ece4d0]/10 border border-[#1a1a1a]/15 rounded-md"
                  id={`preroll-voice-${trackId}-${pattern.id}`}
                >
                  {preRollGroups.map((group, idx) => renderPreRollGroup(group, idx))}
                </div>
              </div>
            );
          })()}

          {/* Controls bar with [+ Allonger le pattern] Button */}
          <div className="flex justify-between items-center mb-1 mt-3 px-1 select-none">
            <div className="text-[11px] font-bold text-[#1a1a1a]/60 tracking-wide uppercase">
              {lang === 'fr' ? 'Mesure principale' : 'Compasso principal'} ({Math.ceil(pattern.steps / 16)} {lang === 'fr' ? 'Mesure(s)' : 'Compasso(s)'})
            </div>
            <button
              onClick={() => {
                let nextSteps = 16;
                if (pattern.steps === 16) nextSteps = 32;
                else if (pattern.steps === 32) nextSteps = 48;
                else if (pattern.steps === 48) nextSteps = 64;
                else nextSteps = 16;
                
                if (nextSteps < pattern.steps) {
                  const confirmMsg = lang === 'fr' 
                    ? "Réduire la taille du motif va tronquer les notes de la fin. Continuer ?"
                    : "Reduzir o tamanho do padrão cortará as notas no final. Continuar?";
                  if (!confirm(confirmMsg)) return;
                }
                handleTrackStepsChange(trackId, pattern.id, nextSteps);
              }}
              className="px-2.5 py-1 bg-[#8b2a1a]/10 hover:bg-[#8b2a1a]/20 text-[#8b2a1a] border border-[#8b2a1a]/30 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>➕</span>
              <span>
                {lang === 'fr' 
                  ? `Allonger le pattern (${pattern.steps === 16 ? '2 mes.' : pattern.steps === 32 ? '3 mes.' : pattern.steps === 48 ? '4 mes.' : '1 mes.'})` 
                  : `Alongar padrão (${pattern.steps === 16 ? '2 comp.' : pattern.steps === 32 ? '3 comp.' : pattern.steps === 48 ? '4 comp.' : '1 comp.'})`}
              </span>
            </button>
          </div>

          <div
            className="flex flex-col gap-3 w-full"
            id={`detail-voice-${trackId}-${pattern.id}`}
            onTouchMove={handleGridTouchMove}
            onTouchEnd={handleGridTouchEnd}
          >
            {(() => {
              const numMeasures = Math.max(1, Math.ceil((pattern?.steps ?? 16) / 16));
              const rows = [];
              for (let m = 0; m < numMeasures; m++) {
                const startStep = m * 16;
                const measureGroups = [
                  [startStep, startStep + 1, startStep + 2, startStep + 3],
                  [startStep + 4, startStep + 5, startStep + 6, startStep + 7],
                  [startStep + 8, startStep + 9, startStep + 10, startStep + 11],
                  [startStep + 12, startStep + 13, startStep + 14, startStep + 15]
                ];

                const renderMainGroup = (group: number[], groupIdx: number) => (
                  <div key={`group-${m}-${groupIdx}`} className="flex gap-4 p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                    {group.map((i) => {
                      if (i >= (pattern?.steps ?? 16)) return null;
                      const state = pattern?.activeSteps?.[i];
                      const syl = pattern?.lyrics?.[i] || '';
                      const note = pattern?.notes?.[i] || '';
                      const isSelected = selectedStepIndices.includes(i);

                      // Calculate total micro-timing shift (manual + global swing)
                      const manualMicro = pattern?.microtimings?.[i] ?? 0;
                      const swingOffset = getStepSwingPercent(i, pattern?.steps ?? 16, pattern?.beatResolutions);
                      const totalShift = Math.max(-100, Math.min(100, manualMicro + swingOffset));
                      const shiftPx = (totalShift / 100) * 8; // Max 8px shift

                      const isLinked = syl && !syl.endsWith(' ') && i < (pattern?.steps ?? 16) - 1 && (pattern?.lyrics?.[i + 1] || '').trim() !== '';

                      return (
                        <VoiceStepCell
                          key={i}
                          i={i}
                          steps={pattern?.steps ?? 16}
                          trackId={trackId}
                          patternId={pattern.id}
                          state={state}
                          syl={syl}
                          note={note}
                          isSelected={isSelected}
                          isMultiSelectActive={isMultiSelectActive}
                          manualMicro={manualMicro}
                          totalShift={totalShift}
                          shiftPx={shiftPx}
                          isLinked={isLinked}
                          volume={pattern.volumes?.[i] ?? 100}
                          decay={pattern.decays?.[i] ?? 10}
                          onTouchStart={(e) => {
                            if (isMultiSelectActive) {
                              handleStepTouchStartMulti(e as any, i);
                            }
                          }}
                          onMouseDown={(e) => {
                            if (isMultiSelectActive) {
                              handleStepMouseDownMulti(e as any, i);
                            }
                          }}
                          onMouseEnter={(idx) => {
                            if (isMultiSelectActive) {
                              handleStepMouseEnterMulti(idx);
                            }
                          }}
                          onVoiceTypeToggle={handleVoiceTypeToggle}
                          onVoiceSylChange={handleVoiceSylChange}
                          onVoiceNoteChange={handleVoiceNoteChange}
                          onVoiceNoteBlur={handleVoiceNoteBlur}
                          onFocusStep={(idx) => {
                            setSelectedStepIdx(idx);
                            setSelectedPatternId(pattern.id);
                          }}
                          onNoteSelectorTarget={setNoteSelectorTarget}
                          onVoiceNav={handleVoiceNav}
                        />
                      );
                    })}
                  </div>
                );

                rows.push(
                  <div key={`measure-row-${m}`} className="flex flex-col gap-1 w-full">
                    <div className="text-[9px] font-bold text-[#1a1a1a]/40 tracking-wider uppercase pl-1 flex items-center gap-2">
                      <span>{lang === 'fr' ? `Mesure ${m + 1}` : `Compasso ${m + 1}`}</span>
                      {pattern.steps > 16 && (
                        <button
                          onClick={() => {
                            const confirmMsg = lang === 'fr'
                              ? `Supprimer la mesure ${m + 1} du motif ? Cette action est irréversible.`
                              : `Excluir o compasso ${m + 1} do padrão? Esta ação é irreversível.`;
                            if (confirm(confirmMsg)) {
                              handleDeletePatternMeasure(trackId, pattern.id, m);
                            }
                          }}
                          className="text-[#8b2a1a] hover:text-[#a63d2d] transition-colors p-0.5 hover:bg-[#8b2a1a]/10 rounded cursor-pointer"
                          title={lang === 'fr' ? "Supprimer cette mesure" : "Excluir este compasso"}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-nowrap gap-x-2 w-full overflow-x-auto justify-between p-1 bg-[#ece4d0]/10 border border-[#1a1a1a]/15 rounded-md">
                      {measureGroups.map((group, idx) => renderMainGroup(group, idx))}
                    </div>
                  </div>
                );
              }

              return <div className="flex flex-col gap-2.5 w-full">{rows}</div>;
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
                          <PercussionStepCell
                            i={i}
                            val={val}
                            volume={pattern?.volumes?.[i] ?? 100}
                            decay={pattern?.decays?.[i] ?? 100}
                            microtiming={pattern?.microtimings?.[i] ?? 0}
                            isSelected={selectedStepIndices.includes(i)}
                            isMultiSelected={isMultiSelected}
                            isFocused={selectedStepIdx === i}
                            shiftPx={shiftPx}
                            colorStyle={colorStyle}
                            isMultiSelectActive={isMultiSelectActive}
                            isSextuplet={isSextuplet}
                            isTriplet={isTriplet}
                            indexInGroup={indexInGroup}
                            totalShift={totalShift}
                            trackId={trackId}
                            onMouseDown={(e, idx, value) => {
                              e.stopPropagation();
                              if (e.button !== 0) return;
                              setSelectedPatternId(pattern.id);
                              setSelectedVariationId(null);

                              if (isMultiSelectActive) {
                                handleStepMouseDownMulti(e, idx);
                                return;
                              }

                              // 1. Alt Key Paint Editing
                              if (e.altKey) {
                                isMouseDownRef.current = true;
                                const nextVal = getNextStepValue(instrument?.id, instrument?.type, value);
                                paintValueRef.current = nextVal;
                                if (selectedVariationId) {
                                  handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, String(nextVal));
                                } else {
                                  handleTrackStepValueChange(trackId, pattern.id, idx, String(nextVal));
                                }
                                return;
                              }

                              // 2. Shift + Clic (Selection Range)
                              if (e.shiftKey) {
                                e.preventDefault();
                                if (selectedStepIdx !== null) {
                                  const start = Math.min(selectedStepIdx, idx);
                                  const end = Math.max(selectedStepIdx, idx);
                                  const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                                  setSelectedStepIndices(rangeIndices);
                                  setSelectedStepIdx(idx);
                                }
                                return;
                              }

                               // 3. Regular selection & painting
                              setSelectedStepIdx(idx);
                              setSelectedStepIndices([idx]);
                              isMouseDownRef.current = true;
                              if (onStepTouchStart) {
                                handleStart(e, idx, value);
                              } else {
                                const nextVal = getNextStepValue(instrument?.id, instrument?.type, value);
                                paintValueRef.current = nextVal;
                                if (selectedVariationId) {
                                  handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, String(nextVal));
                                } else {
                                  handleTrackStepValueChange(trackId, pattern.id, idx, String(nextVal));
                                }
                              }
                            }}
                            onMouseEnter={(idx) => {
                              if (isMultiSelectActive) {
                                handleStepMouseEnterMulti(idx);
                              } else {
                                if (isMouseDownRef.current) {
                                  if (selectedVariationId) {
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, String(paintValueRef.current));
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, idx, String(paintValueRef.current));
                                  }
                                }
                              }
                            }}
                            onTouchStart={(e, idx, value) => {
                              e.stopPropagation();
                              setSelectedPatternId(pattern.id);
                              setSelectedVariationId(null);
                              if (isMultiSelectActive) {
                                handleStepTouchStartMulti(e, idx);
                              } else {
                                setSelectedStepIdx(idx);
                                setSelectedStepIndices([idx]);
                                handleStart(e, idx, value);
                              }
                            }}
                            onChange={(e, idx) => {
                              if (selectedVariationId) {
                                handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, e.target.value);
                              } else {
                                handleTrackStepValueChange(trackId, pattern.id, idx, e.target.value);
                              }
                            }}
                            onKeyDown={(e, idx) => {
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
                                  handlePasteRelative(pattern, idx);
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
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, '0');
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, idx, '0');
                                  }
                                  if (e.key === 'Backspace') {
                                    const inputEl = e.currentTarget as HTMLInputElement;
                                    handleTrackStepKeyDown(trackId, pattern.id, idx, e.key, '', inputEl);
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
                                    handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, e.key);
                                  } else {
                                    handleTrackStepValueChange(trackId, pattern.id, idx, e.key);
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
                              handleTrackStepKeyDown(trackId, pattern.id, idx, e.key, inputEl.value, inputEl);
                            }}
                          />
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
