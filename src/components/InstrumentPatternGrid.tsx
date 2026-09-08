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
import { useBalancoStore } from '../stores/useBalancoStore';
import { computeStepBalancoPercent } from '../utils/balancoUtils';
import { subscribeToTick, unsubscribeFromTick, audioEngine } from '../hooks/useAudioSync';
import { Pattern } from '../types';
import { getNextStepValue, getWheelNuanceState, getNextNuanceState, getAlternatingStroke, getComplementaryStroke, getDefaultSplitPair } from '../utils/instrumentStrokes';
import { Trash2 } from 'lucide-react';
import { isDarkText, instrumentsConfig, NEWTON_NOTE_COLORS } from '../data';
import { useWindow } from '../contexts/WindowContext';

interface InstrumentPatternGridProps {
  trackId: number;
  pattern: Pattern;
  instrument: {
    id: string;
    type: string;
    colors: Record<string, string>;
    [key: string]: any;
  };
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  isTupletEditMode: boolean;
  isMultiSelectActive: boolean;
  noteSelectorTarget: { patternId: number; stepIdx: number; note: string; element: HTMLElement } | null;
  activeTool?: string;
  isAlternating?: boolean;

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
    onSelect: (val: string, merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
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

const SCISSORS_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238b2a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='6' cy='6' r='3'/><circle cx='6' cy='18' r='3'/><line x1='20' y1='4' x2='8.12' y2='15.88'/><line x1='14.47' y1='14.48' x2='20' y2='20'/><line x1='8.12' y1='8.12' x2='12' y2='12'/></svg>") 6 6, crosshair`;

const GLUE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%238b2a1a' stroke='%23f4ecd8' stroke-width='1.5'><path d='M12 2C12 2 5 11 5 16a7 7 0 0 0 14 0c0-5-7-14-7-14z'/><circle cx='10' cy='14' r='1.5' fill='%23f4ecd8'/></svg>") 12 20, pointer`;

interface PercussionStepCellProps {
  i: number;
  val: string | number | [string, string];
  volume: number;
  decay: number;
  microtiming: number;
  isSelected: boolean;
  isMultiSelected: boolean;
  isFocused: boolean;
  selectedSubIndex?: 0 | 1 | null;
  activeTool?: string | number;
  shiftPx: number;
  colorStyle: React.CSSProperties;
  splitLeftColor?: string;
  splitRightColor?: string;
  splitLeftText?: string;
  splitRightText?: string;
  isMultiSelectActive: boolean;
  isSextuplet: boolean;
  isTriplet: boolean;
  isOcto: boolean;
  indexInGroup: number;
  totalShift: number;
  trackId: number;
  
  onMouseDown: (e: React.MouseEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onMouseEnter: (index: number) => void;
  onTouchStart: (e: React.TouchEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onTouchMove?: (e: React.TouchEvent<any>) => void;
  onTouchEnd?: (e: React.TouchEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
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
  selectedSubIndex,
  activeTool,
  shiftPx,
  colorStyle,
  splitLeftColor,
  splitRightColor,
  splitLeftText,
  splitRightText,
  isMultiSelectActive,
  isSextuplet,
  isTriplet,
  isOcto,
  indexInGroup,
  totalShift,
  trackId,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onContextMenu,
  onChange,
  onKeyDown
}: PercussionStepCellProps) => {
  return (
    <div
      key={i}
      className="percussion-step-container flex flex-col items-center select-none relative"
      style={{
        width: isSextuplet || isTriplet || isOcto ? 'auto' : '40px',
        flex: isSextuplet || isTriplet || isOcto ? '1' : 'none',
        cursor: activeTool === 'scissors' ? (Array.isArray(val) ? GLUE_CURSOR : SCISSORS_CURSOR) : undefined
      }}
      onMouseDown={activeTool === 'scissors' ? (e) => onMouseDown(e, i, val) : undefined}
      onTouchStart={activeTool === 'scissors' ? (e) => onTouchStart(e, i, val) : undefined}
      onTouchEnd={activeTool === 'scissors' ? (e) => onTouchEnd?.(e, i, val) : undefined}
      title={activeTool === 'scissors' ? (Array.isArray(val) ? '✂ / 🩹 Recoller le pas (Fusionner)' : '✂ / 🩹 Scinder le pas en triples croches') : undefined}
    >
      {Array.isArray(val) ? (
        <div
          className={`step-input-cell w-full relative flex items-center justify-center font-bold cordel-border outline-none p-0 box-border z-10 transition-all duration-200 overflow-hidden ${
            isOcto ? 'text-[9px]' : 'text-sm'
          } ${
            isMultiSelected
              ? '!border-[2px] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
              : (isFocused && (selectedSubIndex === null || selectedSubIndex === undefined))
                ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                : 'outline-none'
          }`}
          style={{
            width: isSextuplet || isTriplet || isOcto ? '100%' : '40px',
            height: isSextuplet || isTriplet ? '48px' : '40px',
            transform: `translateX(${shiftPx}px)`,
            background: `linear-gradient(135deg, ${splitLeftColor || '#666'} 48%, #1a1a1a 48%, #1a1a1a 52%, ${splitRightColor || '#666'} 52%)`,
            clipPath: isSextuplet 
              ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
              : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
            borderStyle: isSextuplet || isTriplet ? 'none' : undefined,
            borderRadius: isSextuplet || isTriplet ? '0' : undefined,
            cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer'
          }}
          data-track-id={trackId}
          data-step-index={i}
          title={activeTool === 'scissors' ? '✂ / 🩹 Recoller le pas (Fusionner)' : undefined}
        >
          {/* Zone cliquable note 1 (Haut-Gauche) */}
          <div
            className={`absolute inset-0 z-10 select-none outline-none ${activeTool === 'scissors' ? 'pointer-events-none' : ''}`}
            style={{ 
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
              cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer'
            }}
            data-track-id={trackId}
            data-step-index={i}
            data-sub-index="0"
            tabIndex={-1}
            onMouseDown={(e) => onMouseDown(e, i, val, 0)}
            onMouseEnter={() => onMouseEnter(i)}
            onTouchStart={(e) => onTouchStart(e, i, val, 0)}
            onTouchMove={onTouchMove}
            onTouchEnd={(e) => onTouchEnd?.(e, i, val, 0)}
            onContextMenu={(e) => onContextMenu?.(e, i, val, 0)}
            onKeyDown={(e) => onKeyDown(e, i, val, 0)}
          >
            <span
              className="absolute top-0.5 left-1 text-[10px] sm:text-xs font-bold select-none pointer-events-none"
              style={{ color: splitLeftText || '#f4ecd8' }}
            >
              {val[0] === '0' || val[0] === 0 ? '' : val[0]}
            </span>
          </div>

          {/* Zone cliquable note 2 (Bas-Droite) */}
          <div
            className={`absolute inset-0 z-10 select-none outline-none ${activeTool === 'scissors' ? 'pointer-events-none' : ''}`}
            style={{ 
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
              cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer'
            }}
            data-track-id={trackId}
            data-step-index={i}
            data-sub-index="1"
            tabIndex={-1}
            onMouseDown={(e) => onMouseDown(e, i, val, 1)}
            onMouseEnter={() => onMouseEnter(i)}
            onTouchStart={(e) => onTouchStart(e, i, val, 1)}
            onTouchMove={onTouchMove}
            onTouchEnd={(e) => onTouchEnd?.(e, i, val, 1)}
            onContextMenu={(e) => onContextMenu?.(e, i, val, 1)}
            onKeyDown={(e) => onKeyDown(e, i, val, 1)}
          >
            <span
              className="absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-bold select-none pointer-events-none"
              style={{ color: splitRightText || '#f4ecd8' }}
            >
              {val[1] === '0' || val[1] === 0 ? '' : val[1]}
            </span>
          </div>

          {/* Focus triangulaire SVG au clavier / navigation fine */}
          {isFocused && selectedSubIndex === 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="0,0 100,0 0,100" fill="rgba(244, 236, 216, 0.2)" stroke="#8b2a1a" strokeWidth="6" strokeLinejoin="miter" />
            </svg>
          )}
          {isFocused && selectedSubIndex === 1 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="100,0 100,100 0,100" fill="rgba(244, 236, 216, 0.2)" stroke="#8b2a1a" strokeWidth="6" strokeLinejoin="miter" />
            </svg>
          )}
        </div>
      ) : (
        <input
          type="text"
          value={val === 0 ? '' : val}
          readOnly={isMultiSelectActive || activeTool === 'scissors'}
          tabIndex={activeTool === 'scissors' ? -1 : undefined}
          onMouseDown={activeTool === 'scissors' ? undefined : (e) => onMouseDown(e, i, val)}
          onMouseEnter={() => onMouseEnter(i)}
          onTouchStart={activeTool === 'scissors' ? undefined : (e) => onTouchStart(e, i, val)}
          onTouchMove={onTouchMove}
          onTouchEnd={(e) => onTouchEnd?.(e, i, val)}
          onContextMenu={(e) => onContextMenu?.(e, i, val)}
          onChange={(e) => onChange(e, i, val)}
          onKeyDown={(e) => onKeyDown(e, i, val)}
          className={`step-input-cell w-full text-center font-bold cordel-border outline-none p-0 box-border z-10 relative transition-all duration-200 ${
            activeTool === 'scissors' ? 'pointer-events-none cursor-inherit' : ''
          } ${isOcto ? 'text-[9px]' : 'text-sm'} ${
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
            width: isSextuplet || isTriplet || isOcto ? '100%' : '40px',
            height: isSextuplet || isTriplet ? '48px' : '40px',
            transform: `translateX(${shiftPx}px)`,
            cursor: activeTool === 'scissors' ? SCISSORS_CURSOR : undefined,
            pointerEvents: activeTool === 'scissors' ? 'none' : undefined,
            clipPath: isSextuplet 
              ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
              : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
            borderStyle: isSextuplet || isTriplet ? 'none' : undefined,
            borderRadius: isSextuplet || isTriplet ? '0' : undefined
          }}
          data-track-id={trackId}
          data-step-index={i}
          title={activeTool === 'scissors' ? '✂ / 🩹 Scinder le pas en triples croches' : undefined}
        />
      )}
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
  const isValEqual = Array.isArray(prevProps.val) && Array.isArray(nextProps.val)
    ? prevProps.val[0] === nextProps.val[0] && prevProps.val[1] === nextProps.val[1]
    : prevProps.val === nextProps.val;

  return (
    isValEqual &&
    prevProps.volume === nextProps.volume &&
    prevProps.decay === nextProps.decay &&
    prevProps.microtiming === nextProps.microtiming &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelected === nextProps.isMultiSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.selectedSubIndex === nextProps.selectedSubIndex &&
    prevProps.activeTool === nextProps.activeTool &&
    prevProps.shiftPx === nextProps.shiftPx &&
    prevProps.totalShift === nextProps.totalShift &&
    prevProps.splitLeftColor === nextProps.splitLeftColor &&
    prevProps.splitRightColor === nextProps.splitRightColor &&
    prevProps.splitLeftText === nextProps.splitLeftText &&
    prevProps.splitRightText === nextProps.splitRightText &&
    prevProps.colorStyle.backgroundColor === nextProps.colorStyle.backgroundColor &&
    prevProps.colorStyle.color === nextProps.colorStyle.color &&
    prevProps.colorStyle.borderColor === nextProps.colorStyle.borderColor &&
    prevProps.isMultiSelectActive === nextProps.isMultiSelectActive &&
    prevProps.isSextuplet === nextProps.isSextuplet &&
    prevProps.isTriplet === nextProps.isTriplet &&
    prevProps.isOcto === nextProps.isOcto &&
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
  const txtColor = isDarkText(cardBg) ? '#1a1a1a' : '#f4ecd8';

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
          className={`step-input-cell v-syl w-full text-center outline-none border-b border-[#00000020] bg-transparent pb-0.5 ${syl ? 'font-bold' : ''}`}
          style={{ 
            color: isMultiSelectActive && isSelected ? 'transparent' : txtColor,
          }}
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
            className={`step-input-cell v-note w-full text-center font-bold outline-none bg-transparent pt-0.5`}
            style={{
              color: isMultiSelectActive && isSelected ? 'transparent' : txtColor,
            }}
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
  selectedPatternId,
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
  activeTool = 'D',
  isAlternating = false,
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
  const track = useSequencerStore(
    React.useCallback(state => state.tracks.find(t => t.id === trackId), [trackId])
  );
  const balancoPresets = useBalancoStore(state => state.presets);
  const { soloPatternPlayIdRef } = useAudio();
  const currentWindow = useWindow();

  const gridRef = useRef<HTMLDivElement>(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [selectedSubIndex, setSelectedSubIndex] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (selectedStepIdx === null) {
      setSelectedSubIndex(null);
    }
  }, [selectedStepIdx]);

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressFiredRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialTouchIndexRef = useRef<number | null>(null);
  const wasSelectedRef = useRef(false);

  /* Compute balanço offset for a step index */
  const getStepSwingPercent = (stepIdx: number, steps: number, beatResolutions?: number[]) => {
    return computeStepBalancoPercent({
      stepIdx,
      steps,
      beatResolutions,
      track,
      pattern,
      globalSwing
    });
  };

  // Pre-calculate step swing offsets in a memoized array (Zero calculation thrashing)
  const swingOffsets = React.useMemo(() => {
    const stepsCount = pattern?.steps ?? 16;
    const resArr = pattern?.beatResolutions;
    const offsets = new Float32Array(stepsCount);
    for (let i = 0; i < stepsCount; i++) {
      offsets[i] = computeStepBalancoPercent({
        stepIdx: i,
        steps: stepsCount,
        beatResolutions: resArr,
        track,
        pattern,
        globalSwing
      });
    }
    return offsets;
  }, [
    pattern?.steps,
    pattern?.beatResolutions,
    pattern?.balancoPresetId,
    pattern?.balancoAmount,
    pattern?.swingIntensity,
    track?.balancoPresetId,
    track?.balancoAmount,
    track?.swingIntensity,
    globalSwing,
    balancoPresets
  ]);

  const handleStepTouchStartMulti = React.useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (!isMultiSelectActive) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;

    if ('touches' in e && e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;

    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      if (!wasSel) {
        setSelectedStepIndices(prev => [...prev, index]);
      }
    } else {
      setSelectedStepIndices([index]);
    }
  }, [isMultiSelectActive, selectedStepIndices, setSelectedStepIndices]);

  const handleStepMouseDownMulti = React.useCallback((e: React.MouseEvent | React.TouchEvent, index: number, forceActive = false) => {
    if (!isMultiSelectActive && !forceActive) return;
    if ('button' in e && e.button !== 0) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;

    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;

    if (e.shiftKey) {
      if (selectedStepIdx !== null) {
        const start = Math.min(selectedStepIdx, index);
        const end = Math.max(selectedStepIdx, index);
        const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
        
        if (e.ctrlKey || e.metaKey) {
          setSelectedStepIndices(prev => Array.from(new Set([...prev, ...rangeIndices])));
        } else {
          setSelectedStepIndices(rangeIndices);
        }
      } else {
        setSelectedStepIndices([index]);
        setSelectedStepIdx(index);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (wasSel) {
        setSelectedStepIndices(prev => prev.filter(i => i !== index));
      } else {
        setSelectedStepIndices(prev => [...prev, index]);
      }
      setSelectedStepIdx(index);
    } else {
      setSelectedStepIndices([index]);
      setSelectedStepIdx(index);
    }
  }, [isMultiSelectActive, selectedStepIndices, selectedStepIdx, setSelectedStepIndices, setSelectedStepIdx]);

  const handleStepMouseEnterMulti = React.useCallback((index: number) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    hasDraggedRef.current = true;
    setSelectedStepIndices(prev => {
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
  }, [isMultiSelectActive, setSelectedStepIndices]);

  const handleStart = React.useCallback((e: React.MouseEvent | React.TouchEvent, stepIdx: number, currentVal: string | number | [string, string], subIndex?: 0 | 1) => {
    if ('shiftKey' in e && e.shiftKey) return;
    if (onStepTouchStart) {
      let valToEdit = currentVal;
      if (Array.isArray(currentVal)) {
        valToEdit = subIndex !== undefined ? currentVal[subIndex] : currentVal[0];
      }
      
      onStepTouchStart(e, pattern.id, stepIdx, instrument.id, valToEdit as string | number, (newVal, merge?: boolean) => {
        let finalVal: string | [string, string] = Array.isArray(newVal) ? newVal as [string, string] : String(newVal);
        if (merge) {
          finalVal = String(newVal);
        } else if (subIndex !== undefined && Array.isArray(currentVal)) {
          finalVal = [...currentVal] as [string, string];
          finalVal[subIndex] = String(newVal);
        }
        
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, stepIdx, finalVal);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, stepIdx, finalVal);
        }
      }, trackId, Array.isArray(currentVal), subIndex);
    }
  }, [onStepTouchStart, pattern.id, instrument.id, selectedVariationId, trackId, handleVariationStepValueChange, handleTrackStepValueChange]);

  const handleCellMouseDown = React.useCallback((e: React.MouseEvent<any>, idx: number, value: string | number | [string, string], subIndex?: 0 | 1) => {
    // Interception pointerdown / mousedown prioritaire et immédiate pour l'outil Ciseau / Colle
    if (activeTool === 'scissors') {
      e.preventDefault();
      e.stopPropagation();
      if (e.button !== 0) return;

      // Déterminer la valeur actuelle de la case avec priorité absolue
      const currentStep = (value !== undefined && value !== null)
        ? value
        : (pattern?.activeSteps?.[idx] !== undefined && pattern?.activeSteps?.[idx] !== null
            ? pattern.activeSteps[idx]
            : 0);

      let finalVal: string | number | [string, string];

      // A. Clic sur un pas déjà scindé (Array.isArray(val)) : Effet Colle
      // Fusionne instantanément le pas en conservant la première note : val[0]
      if (Array.isArray(currentStep)) {
        const first = currentStep[0];
        finalVal = (first === '0' || first === 0 || !first) ? 0 : first;
        setSelectedSubIndex(null);
      }
      // B. Clic sur un pas vide ('0' ou '' ou 0 ou null) : Pré-remplissage naturel
      // Scinde la case en initialisant directement le binôme fondamental de l'instrument
      else if (
        currentStep === 0 || 
        currentStep === '0' || 
        !currentStep || 
        String(currentStep).trim() === '' || 
        String(currentStep).trim() === '0'
      ) {
        finalVal = getDefaultSplitPair(instrument?.id, instrument?.type);
        setSelectedSubIndex(0);
      }
      // C. Clic sur un pas contenant déjà une note : Déduction de la main opposée
      // Conserve impérativement la note cliquée en première position (val[0]).
      // Déduit automatiquement le second coup complémentaire via getComplementaryStroke(val[0], instId, ...)
      else {
        const baseVal = String(currentStep).trim();
        const compVal = getComplementaryStroke(baseVal, instrument?.id, instrument?.type, isLeftHanded);
        finalVal = [baseVal, compVal];
        setSelectedSubIndex(0);
      }

      setSelectedStepIdx(idx);
      setSelectedStepIndices([idx]);

      if (selectedVariationId) {
        handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
      } else {
        handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
      }

      // Sound preview
      const noteToPreview = Array.isArray(finalVal) ? finalVal[0] : finalVal;
      if (noteToPreview !== 0 && noteToPreview !== '0' && noteToPreview !== '') {
        try {
          if (audioEngine) {
            const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
            const dec = (pattern?.decays?.[idx] ?? 100) / 100;
            audioEngine.playNote(trackId, String(noteToPreview), Tone.now(), vol, dec);
          }
        } catch (_) {}
      }
      return;
    }

    e.stopPropagation();
    if (e.button !== 0) return;
    setSelectedPatternId(pattern.id);
    setSelectedVariationId(null);

    const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;

    if (isModifier) {
      if (!isMultiSelectActive) {
        setIsMultiSelectActive(true);
      }
      handleStepMouseDownMulti(e, idx, true);
      return;
    }

    if (isMultiSelectActive) {
      setIsMultiSelectActive(false);
      setSelectedStepIndices([idx]);
      setSelectedStepIdx(idx);
      setSelectedSubIndex(subIndex ?? null);
      return;
    }

    setSelectedStepIdx(idx);
    setSelectedStepIndices([idx]);
    setSelectedSubIndex(subIndex ?? null);

    isMouseDownRef.current = true;

    // Apply directly the active tool from dock, with parity alternation if active
    let strokeToApply: string | number;
    if (activeTool === '0' || activeTool === 0 || activeTool === '') {
      strokeToApply = 0;
    } else if (isAlternating) {
      strokeToApply = getAlternatingStroke(idx, activeTool, instrument?.id, instrument?.type, lang, isLeftHanded);
    } else {
      strokeToApply = activeTool;
    }

    paintValueRef.current = strokeToApply;

    let finalVal: string | number | [string, string] = strokeToApply;
    if (subIndex !== undefined && Array.isArray(value)) {
      const arr = [...value] as [string, string];
      arr[subIndex] = String(strokeToApply);
      finalVal = arr;
      setSelectedSubIndex(subIndex);
    } else {
      setSelectedSubIndex(null);
    }

    if (selectedVariationId) {
      handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
    } else {
      handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
    }

    // Sound preview
    if (strokeToApply !== 0 && strokeToApply !== '0') {
      try {
        if (audioEngine) {
          const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
          const dec = (pattern?.decays?.[idx] ?? 100) / 100;
          audioEngine.playNote(trackId, String(strokeToApply), Tone.now(), vol, dec);
        }
      } catch (_) {}
    }
  }, [pattern.id, pattern.activeSteps, pattern.volumes, pattern.decays, selectedVariationId, isMultiSelectActive, activeTool, isAlternating, instrument?.id, instrument?.type, lang, isLeftHanded, trackId, handleStepMouseDownMulti, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedPatternId, setSelectedVariationId, setSelectedStepIndices, setSelectedStepIdx, setSelectedSubIndex]);

  const handleCellMouseEnter = React.useCallback((idx: number) => {
    if (activeTool === 'scissors') return; // Glisser/drag désactivé pour l'outil ciseau
    if (isMultiSelectActive) {
      handleStepMouseEnterMulti(idx);
      return;
    }
    if (isMouseDownRef.current) {
      let strokeToApply: string | number;
      if (activeTool === '0' || activeTool === 0 || activeTool === '') {
        strokeToApply = 0;
      } else if (isAlternating) {
        strokeToApply = getAlternatingStroke(idx, activeTool, instrument?.id, instrument?.type, lang, isLeftHanded);
      } else {
        strokeToApply = paintValueRef.current;
      }

      if (selectedVariationId) {
        handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, strokeToApply as any);
      } else {
        handleTrackStepValueChange(trackId, pattern.id, idx, strokeToApply as any);
      }

      if (strokeToApply !== 0 && strokeToApply !== '0') {
        try {
          if (audioEngine) {
            const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
            const dec = (pattern?.decays?.[idx] ?? 100) / 100;
            audioEngine.playNote(trackId, String(strokeToApply), Tone.now(), vol, dec);
          }
        } catch (_) {}
      }
    }
  }, [isMultiSelectActive, handleStepMouseEnterMulti, selectedVariationId, trackId, pattern?.id, pattern?.volumes, pattern?.decays, activeTool, isAlternating, instrument?.id, instrument?.type, lang, isLeftHanded, handleVariationStepValueChange, handleTrackStepValueChange]);

  const handleCellContextMenu = React.useCallback((e: React.MouseEvent<HTMLInputElement>, idx: number, value: string | number | [string, string], subIndex?: 0 | 1) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e, idx, value, subIndex);
  }, [handleStart]);

  const handleCellTouchStart = React.useCallback((e: React.TouchEvent<HTMLInputElement>, idx: number, value: string | number | [string, string], subIndex?: 0 | 1) => {
    if (activeTool === 'scissors') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    if (isMultiSelectActive) {
      handleStepTouchStartMulti(e as any, idx);
      return;
    }

    isLongPressFiredRef.current = false;
    if (e.touches && e.touches.length > 0) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // Long press (> 450ms) triggers TouchStrokeSelector popup for rare strokes
    longPressTimerRef.current = setTimeout(() => {
      isLongPressFiredRef.current = true;
      handleStart(e, idx, value, subIndex);
    }, 450);
  }, [isMultiSelectActive, handleStepTouchStartMulti, handleStart, activeTool]);

  const handleCellTouchMove = React.useCallback((e: React.TouchEvent<HTMLInputElement>) => {
    if (touchStartPosRef.current && e.touches && e.touches.length > 0) {
      const dx = e.touches[0].clientX - touchStartPosRef.current.x;
      const dy = e.touches[0].clientY - touchStartPosRef.current.y;
      if (dx * dx + dy * dy > 64) { // moved > 8px
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  }, []);

  const handleCellTouchEnd = React.useCallback((e: React.TouchEvent<any>, idx: number, value: string | number | [string, string], subIndex?: 0 | 1) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressFiredRef.current) {
      isLongPressFiredRef.current = false;
      return;
    }

    if (isMultiSelectActive) return;

    // Cas spécifique : Outil Ciseau / Colle (Scissors / Glue) - Outil persistant
    if (activeTool === 'scissors') {
      e.preventDefault();
      e.stopPropagation();

      const currentStep = (value !== undefined && value !== null)
        ? value
        : (pattern?.activeSteps?.[idx] !== undefined && pattern?.activeSteps?.[idx] !== null
            ? pattern.activeSteps[idx]
            : 0);

      let finalVal: string | number | [string, string];

      // A. Clic sur un pas déjà scindé (Array.isArray(val)) : Effet Colle
      // Fusionne instantanément le pas en conservant la première note : val[0]
      if (Array.isArray(currentStep)) {
        const first = currentStep[0];
        finalVal = (first === '0' || first === 0 || !first) ? 0 : first;
        setSelectedSubIndex(null);
      }
      // B. Clic sur un pas vide ('0' ou '' ou 0 ou null) : Pré-remplissage naturel
      // Scinde la case en initialisant directement le binôme fondamental de l'instrument
      else if (
        currentStep === 0 || 
        currentStep === '0' || 
        !currentStep || 
        String(currentStep).trim() === '' || 
        String(currentStep).trim() === '0'
      ) {
        finalVal = getDefaultSplitPair(instrument?.id, instrument?.type);
        setSelectedSubIndex(0);
      }
      // C. Clic sur un pas contenant déjà une note : Déduction de la main opposée
      // Conserve impérativement la note cliquée en première position (val[0]).
      // Déduit automatiquement le second coup complémentaire via getComplementaryStroke(val[0], instId, ...)
      else {
        const baseVal = String(currentStep).trim();
        const compVal = getComplementaryStroke(baseVal, instrument?.id, instrument?.type, isLeftHanded);
        finalVal = [baseVal, compVal];
        setSelectedSubIndex(0);
      }

      setSelectedStepIdx(idx);
      setSelectedStepIndices([idx]);

      if (selectedVariationId) {
        handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
      } else {
        handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
      }

      // Sound preview
      const noteToPreview = Array.isArray(finalVal) ? finalVal[0] : finalVal;
      if (noteToPreview !== 0 && noteToPreview !== '0' && noteToPreview !== '') {
        try {
          if (audioEngine) {
            const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
            const dec = (pattern?.decays?.[idx] ?? 100) / 100;
            audioEngine.playNote(trackId, String(noteToPreview), Tone.now(), vol, dec);
          }
        } catch (_) {}
      }
      return;
    }

    // Instantaneous Tap State Machine without lag:
    // Empty -> Strong -> Weak -> 0
    let currentVal = value;
    if (Array.isArray(value)) {
      currentVal = subIndex !== undefined ? value[subIndex] : value[0];
    }

    const nextVal = getNextNuanceState(
      currentVal,
      activeTool,
      instrument?.id,
      instrument?.type,
      lang,
      isLeftHanded
    );

    let finalVal: string | number | [string, string] = nextVal;
    if (subIndex !== undefined && Array.isArray(value)) {
      const arr = [...value] as [string, string];
      arr[subIndex] = String(nextVal);
      finalVal = arr;
      setSelectedSubIndex(subIndex);
    } else {
      setSelectedSubIndex(null);
    }

    if (selectedVariationId) {
      handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
    } else {
      handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
    }

    setSelectedStepIdx(idx);
    setSelectedStepIndices([idx]);

    if (nextVal !== '0' && nextVal !== 0 && nextVal !== '') {
      try {
        if (audioEngine) {
          const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
          const dec = (pattern?.decays?.[idx] ?? 100) / 100;
          audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
        }
      } catch (_) {}
    }
  }, [isMultiSelectActive, activeTool, instrument?.id, instrument?.type, lang, isLeftHanded, selectedVariationId, trackId, pattern?.id, pattern?.activeSteps, pattern?.volumes, pattern?.decays, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex]);

  const handleCellChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>, idx: number, value: string | number | [string, string], subIndex?: 0 | 1) => {
    if (activeTool === 'scissors') {
      e.preventDefault();
      return;
    }
    const newVal = e.target.value;
    let finalVal: string | [string, string] = String(newVal);
    if (subIndex !== undefined && Array.isArray(value)) {
      finalVal = [...value] as [string, string];
      finalVal[subIndex] = String(newVal);
    }
    if (selectedVariationId) {
      handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal);
    } else {
      handleTrackStepValueChange(trackId, pattern.id, idx, finalVal);
    }
  }, [activeTool, selectedVariationId, trackId, pattern.id, handleVariationStepValueChange, handleTrackStepValueChange]);

  const focusCell = React.useCallback((stepIdx: number, subIndex?: 0 | 1 | null) => {
    if (!gridRef.current) return;
    if (subIndex !== undefined && subIndex !== null) {
      const el = gridRef.current.querySelector(
        `[data-step-index="${stepIdx}"][data-sub-index="${subIndex}"]`
      ) as HTMLElement | null;
      if (el) el.focus();
    } else {
      const el = gridRef.current.querySelector(
        `input[data-step-index="${stepIdx}"]`
      ) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, []);

  const handleCellKeyDown = React.useCallback((
    e: React.KeyboardEvent<any>,
    idx: number,
    value: string | number | [string, string],
    subIndex?: 0 | 1
  ) => {
    if (activeTool === 'scissors') {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    const totalSteps = pattern?.steps || 16;

    // Navigation ArrowRight / Tab
    if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      if (Array.isArray(value) && subIndex === 0) {
        setSelectedSubIndex(1);
        focusCell(idx, 1);
        return;
      }
      if (idx < totalSteps - 1) {
        const nextIdx = idx + 1;
        const nextVal = pattern?.activeSteps?.[nextIdx];
        setSelectedStepIdx(nextIdx);
        setSelectedStepIndices([nextIdx]);
        if (Array.isArray(nextVal)) {
          setSelectedSubIndex(0);
          focusCell(nextIdx, 0);
        } else {
          setSelectedSubIndex(null);
          focusCell(nextIdx);
        }
      }
      return;
    }

    // Navigation ArrowLeft
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (Array.isArray(value) && subIndex === 1) {
        setSelectedSubIndex(0);
        focusCell(idx, 0);
        return;
      }
      if (idx > 0) {
        const prevIdx = idx - 1;
        const prevVal = pattern?.activeSteps?.[prevIdx];
        setSelectedStepIdx(prevIdx);
        setSelectedStepIndices([prevIdx]);
        if (Array.isArray(prevVal)) {
          setSelectedSubIndex(1);
          focusCell(prevIdx, 1);
        } else {
          setSelectedSubIndex(null);
          focusCell(prevIdx);
        }
      }
      return;
    }

    // ArrowUp / ArrowDown -> getWheelNuanceState ('up' = strong, 'down' = weak)
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      (e.nativeEvent as any)?.stopImmediatePropagation?.();
      const dir = e.key === 'ArrowUp' ? 'up' : 'down';
      let valToCycle = value;
      const sub = subIndex !== undefined ? subIndex : (selectedSubIndex ?? 0);
      if (Array.isArray(value)) {
        valToCycle = value[sub];
      }
      const nextVal = getWheelNuanceState(
        valToCycle as string | number,
        dir,
        instrument?.id,
        instrument?.type,
        lang,
        isLeftHanded
      );

      let finalVal: string | number | [string, string] = nextVal;
      if (Array.isArray(value)) {
        const arr = [...value] as [string, string];
        arr[sub] = String(nextVal);
        finalVal = arr;
      }

      if (selectedVariationId) {
        handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
      } else {
        handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
      }

      if (nextVal !== 0 && nextVal !== '0') {
        try {
          if (audioEngine) {
            const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
            const dec = (pattern?.decays?.[idx] ?? 100) / 100;
            audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
          }
        } catch (_) {}
      }
      return;
    }

    // Backspace: effacement précis sans saut de curseur
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (Array.isArray(value)) {
        const sub = subIndex ?? 0;
        const arr = [...value] as [string, string];
        if (sub === 1) {
          if (arr[1] !== '0' && arr[1] !== '' && arr[1] !== 0) {
            arr[1] = '0';
            const finalVal = arr;
            if (selectedVariationId) {
              handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
            } else {
              handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
            }
          } else {
            // Recollement en conservant la note restante val[0]
            const finalVal = (arr[0] === '0' || arr[0] === 0 || !arr[0]) ? 0 : arr[0];
            if (selectedVariationId) {
              handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
            } else {
              handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
            }
          }
          setSelectedSubIndex(0);
          focusCell(idx, 0);
        } else {
          // subIndex === 0
          if (arr[0] !== '0' && arr[0] !== '' && arr[0] !== 0) {
            arr[0] = '0';
            const finalVal = arr;
            if (selectedVariationId) {
              handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
            } else {
              handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
            }
          } else {
            const finalVal = (arr[1] === '0' || arr[1] === 0 || !arr[1]) ? 0 : arr[1];
            if (selectedVariationId) {
              handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
            } else {
              handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
            }
          }
          if (idx > 0) {
            const prevIdx = idx - 1;
            const prevVal = pattern?.activeSteps?.[prevIdx];
            setSelectedStepIdx(prevIdx);
            setSelectedStepIndices([prevIdx]);
            if (Array.isArray(prevVal)) {
              setSelectedSubIndex(1);
              focusCell(prevIdx, 1);
            } else {
              setSelectedSubIndex(null);
              focusCell(prevIdx);
            }
          }
        }
      } else {
        // Simple step
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, 0 as any);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, idx, 0 as any);
        }
        if (idx > 0) {
          const prevIdx = idx - 1;
          const prevVal = pattern?.activeSteps?.[prevIdx];
          setSelectedStepIdx(prevIdx);
          setSelectedStepIndices([prevIdx]);
          if (Array.isArray(prevVal)) {
            setSelectedSubIndex(1);
            focusCell(prevIdx, 1);
          } else {
            setSelectedSubIndex(null);
            focusCell(prevIdx);
          }
        }
      }
      return;
    }

    // Delete ou 0: vide la cellule sur place sans reculer
    if (e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      if (Array.isArray(value)) {
        const sub = subIndex ?? 0;
        const arr = [...value] as [string, string];
        arr[sub] = '0';
        const finalVal = (arr[0] === '0' && arr[1] === '0') ? 0 : arr;
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
        }
        if (finalVal === 0) {
          setSelectedSubIndex(null);
          focusCell(idx);
        }
      } else {
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, 0 as any);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, idx, 0 as any);
        }
      }
      return;
    }

    // Saisie d'une frappe au clavier (touches de lettres)
    if (subIndex !== undefined && Array.isArray(value)) {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const arr = [...value] as [string, string];
        arr[subIndex] = e.key;
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, arr as any);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, idx, arr as any);
        }
        try {
          if (audioEngine && e.key !== '0') {
            const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
            const dec = (pattern?.decays?.[idx] ?? 100) / 100;
            audioEngine.playNote(trackId, e.key, Tone.now(), vol, dec);
          }
        } catch (_) {}

        if (subIndex === 0) {
          setSelectedSubIndex(1);
          focusCell(idx, 1);
        } else if (idx < totalSteps - 1) {
          const nextIdx = idx + 1;
          const nextVal = pattern?.activeSteps?.[nextIdx];
          setSelectedStepIdx(nextIdx);
          setSelectedStepIndices([nextIdx]);
          if (Array.isArray(nextVal)) {
            setSelectedSubIndex(0);
            focusCell(nextIdx, 0);
          } else {
            setSelectedSubIndex(null);
            focusCell(nextIdx);
          }
        }
      }
    } else {
      const inputEl = e.currentTarget as HTMLInputElement;
      if (inputEl && ['d', 'D', 'p', 'P', 't', 'T', 'g', 'G', 'a', 'A', 'r', 'R', 'e', 'E', 'x', 'X', 'f', 'F', 'i', 'I', 's', 'S', 'c', 'C', 'w', 'W'].includes(e.key)) {
        setTimeout(() => {
          if (idx < totalSteps - 1) {
            const nextIdx = idx + 1;
            const nextVal = pattern?.activeSteps?.[nextIdx];
            setSelectedStepIdx(nextIdx);
            setSelectedStepIndices([nextIdx]);
            if (Array.isArray(nextVal)) {
              setSelectedSubIndex(0);
              focusCell(nextIdx, 0);
            } else {
              setSelectedSubIndex(null);
              focusCell(nextIdx);
            }
          }
        }, 10);
      }
      handleTrackStepKeyDown(trackId, pattern.id, idx, e.key, inputEl?.value || '', inputEl);
    }
  }, [activeTool, trackId, pattern?.id, pattern?.steps, pattern?.activeSteps, pattern?.volumes, pattern?.decays, selectedVariationId, instrument?.id, instrument?.type, lang, isLeftHanded, handleVariationStepValueChange, handleTrackStepValueChange, handleTrackStepKeyDown, focusCell, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex]);

  const handleVoiceTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>, idx: number) => {
    if (isMultiSelectActive) {
      handleStepTouchStartMulti(e as any, idx);
    }
  }, [isMultiSelectActive, handleStepTouchStartMulti]);

  const handleVoiceMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    if (isMultiSelectActive) {
      handleStepMouseDownMulti(e as any, idx);
    }
  }, [isMultiSelectActive, handleStepMouseDownMulti]);

  const handleVoiceMouseEnter = React.useCallback((idx: number) => {
    if (isMultiSelectActive) {
      handleStepMouseEnterMulti(idx);
    }
  }, [isMultiSelectActive, handleStepMouseEnterMulti]);

  const handleVoiceFocusStep = React.useCallback((idx: number) => {
    setSelectedStepIdx(idx);
    setSelectedPatternId(pattern.id);
  }, [setSelectedStepIdx, setSelectedPatternId, pattern.id]);

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

  // Native wheel listener on grid with { passive: false } and e.preventDefault() to block modal vertical scroll
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const stepInput = target.closest('[data-track-id][data-step-index]') as HTMLElement | null;
      if (!stepInput) return;

      const targetTrackId = stepInput.getAttribute('data-track-id');
      const stepIdxAttr = stepInput.getAttribute('data-step-index');
      if (targetTrackId !== String(trackId) || stepIdxAttr === null) return;

      // Neutralize modal vertical scrolling
      e.preventDefault();
      e.stopPropagation();

      const idx = parseInt(stepIdxAttr, 10);
      const direction = e.deltaY < 0 ? 'up' : 'down';

      const currentVal = pattern?.activeSteps?.[idx] ?? 0;
      let valToNuance = currentVal;
      const subIdxAttr = stepInput.getAttribute('data-sub-index');
      if (Array.isArray(currentVal) && subIdxAttr !== null) {
        const subIdx = parseInt(subIdxAttr, 10);
        valToNuance = currentVal[subIdx];
      }

      const nextVal = getWheelNuanceState(
        valToNuance as string | number,
        direction,
        instrument?.id,
        instrument?.type,
        lang,
        isLeftHanded
      );

      let finalVal: string | number | [string, string] = nextVal;
      if (Array.isArray(currentVal) && subIdxAttr !== null) {
        const subIdx = parseInt(subIdxAttr, 10);
        const arr = [...currentVal] as [string, string];
        arr[subIdx] = String(nextVal);
        finalVal = arr;
      }

      if (nextVal !== valToNuance) {
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
        }

        setSelectedStepIdx(idx);
        setSelectedStepIndices([idx]);
        if (subIdxAttr !== null) {
          setSelectedSubIndex(parseInt(subIdxAttr, 10) as 0 | 1);
        } else {
          setSelectedSubIndex(null);
        }

        if (nextVal !== 0 && nextVal !== '0') {
          try {
            if (audioEngine) {
              const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
              const dec = (pattern?.decays?.[idx] ?? 100) / 100;
              audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
            }
          } catch (_) {}
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [trackId, pattern, instrument?.id, instrument?.type, lang, isLeftHanded, selectedVariationId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex]);

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
    currentWindow.addEventListener('mouseup', handleGlobalMouseUp);
    return () => currentWindow.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMultiSelectActive, setSelectedStepIndices, currentWindow]);

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

      if (e.ctrlKey || e.metaKey) return;

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

    currentWindow.addEventListener('keydown', handleGlobalKeyDown);
    return () => currentWindow.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMultiSelectActive, selectedStepIndices, pattern?.id, selectedVariationId, trackId, handleTrackStepValueChange, handleVariationStepValueChange, setSelectedStepIndices, currentWindow]);

  // Keyboard and Copy/Paste listeners specifically related to pattern actions
  useEffect(() => {
    const handleGridShortcut = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      const { key } = customEvent.detail;
      const activePtn = pattern;
      if (!activePtn) return;
      if (activePtn.id !== selectedPatternId) return;

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
  }, [pattern, selectedPatternId, selectedVariationId, isMultiSelectActive, selectedStepIndices, selectedStepIdx, onCopyPattern, onPastePattern, canPaste, trackId]);

  // Priorité absolue des flèches ↑ / ↓ sur le pas actif (Miroir de la molette)
  useEffect(() => {
    if (selectedStepIdx === null) return;

    const handleGridVerticalArrows = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const idx = selectedStepIdx;
        const currentVal = pattern?.activeSteps?.[idx] ?? 0;
        const dir = e.key === 'ArrowUp' ? 'up' : 'down';

        let valToCycle = currentVal;
        const sub = selectedSubIndex !== null && selectedSubIndex !== undefined ? selectedSubIndex : 0;
        if (Array.isArray(currentVal)) {
          valToCycle = currentVal[sub];
        }

        const nextVal = getWheelNuanceState(
          valToCycle as string | number,
          dir,
          instrument?.id,
          instrument?.type,
          lang,
          isLeftHanded
        );

        let finalVal: string | number | [string, string] = nextVal;
        if (Array.isArray(currentVal)) {
          const arr = [...currentVal] as [string, string];
          arr[sub] = String(nextVal);
          finalVal = arr;
        }

        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
        }

        if (nextVal !== 0 && nextVal !== '0') {
          try {
            if (audioEngine) {
              const vol = (pattern?.volumes?.[idx] ?? 100) / 100;
              const dec = (pattern?.decays?.[idx] ?? 100) / 100;
              audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
            }
          } catch (_) {}
        }
      }
    };

    window.addEventListener('keydown', handleGridVerticalArrows, { capture: true });
    return () => window.removeEventListener('keydown', handleGridVerticalArrows, { capture: true });
  }, [selectedStepIdx, selectedSubIndex, pattern?.id, pattern?.activeSteps, pattern?.volumes, pattern?.decays, selectedVariationId, instrument?.id, instrument?.type, lang, isLeftHanded, trackId, handleVariationStepValueChange, handleTrackStepValueChange]);

  // Guard Clauses for store state and props
  const trackExists = useSequencerStore(state => state.tracks.some(t => t.id === trackId));
  if (!trackExists || !pattern || !instrument) return null;

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
          onStepTouchStart(e, pattern.id, tappedIdx, instrument.id, stepVal as string | number, (newVal, merge?: boolean) => {
            let finalVal = newVal;
            if (merge) {
              finalVal = String(newVal);
            }
            if (selectedVariationId) {
              handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, selectedStepIndices, finalVal);
            } else {
              handleTrackStepValueChange(trackId, pattern.id, selectedStepIndices, finalVal);
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
        ${activeTool === 'scissors' ? `
          .percussion-step-container input {
            pointer-events: none !important;
            cursor: inherit !important;
            user-select: none !important;
          }
        ` : ''}
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

                      // Calculate total micro-timing shift (manual + pre-calculated global swing)
                      const manualMicro = pattern?.microtimings?.[i] ?? 0;
                      const swingOffset = swingOffsets[i] || 0;
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
                          onTouchStart={handleVoiceTouchStart}
                          onMouseDown={handleVoiceMouseDown}
                          onMouseEnter={handleVoiceMouseEnter}
                          onVoiceTypeToggle={handleVoiceTypeToggle}
                          onVoiceSylChange={handleVoiceSylChange}
                          onVoiceNoteChange={handleVoiceNoteChange}
                          onVoiceNoteBlur={handleVoiceNoteBlur}
                          onFocusStep={handleVoiceFocusStep}
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
          className="step-boxes flex flex-wrap gap-y-4 gap-x-5 lg:gap-x-7"
          id={`detail-steps-${trackId}-${pattern.id}`}
          onTouchMove={handleGridTouchMove}
          onTouchEnd={handleGridTouchEnd}
        >
          {(() => {
            const groups = [];
            let accumulated = 0;
            const defaultBeats = 4;
            const beatRes = pattern?.beatResolutions || Array(defaultBeats).fill(4);
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
              const isOcto = group.length === 8;
              
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
                        <option value="8">8 (Fusas)</option>
                      </select>
                    </div>
                  )}
                  <div className={`p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm relative ${isSextuplet ? 'h-[72px]' : isTriplet ? 'flex justify-between' : isOcto ? 'flex gap-1' : 'flex gap-4'}`} style={{ width: '220px' }}>
                    {group.map((i, indexInGroup) => {
                      const val = pattern?.activeSteps?.[i];
                      const displayVal = getDisplayVal(val);
                      const isActive = val !== 0 && val !== '';

                      const isSelected = selectedStepIndices.includes(i);
                      const isSingleSelected = selectedStepIdx === i;

                      let colorStyle: React.CSSProperties = {};
                      let splitLeftColor: string | undefined = undefined;
                      let splitRightColor: string | undefined = undefined;
                      let splitLeftText: string | undefined = undefined;
                      let splitRightText: string | undefined = undefined;

                      if (Array.isArray(val)) {
                        const s0 = String(val[0] ?? '0');
                        const s1 = String(val[1] ?? '0');
                        const lookup0 = (s0 === 'f' && !instrument?.colors?.['f']) ? 'F' : (s0 === 'v' && !instrument?.colors?.['v']) ? 'V' : s0;
                        const lookup1 = (s1 === 'f' && !instrument?.colors?.['f']) ? 'F' : (s1 === 'v' && !instrument?.colors?.['v']) ? 'V' : s1;

                        splitLeftColor = instrument?.colors?.[lookup0] || '#666';
                        splitRightColor = instrument?.colors?.[lookup1] || '#666';

                        splitLeftText = isDarkText(instrument?.id, lookup0) ? '#1a1a1a' : (instrument?.colors?.text || '#f4ecd8');
                        splitRightText = isDarkText(instrument?.id, lookup1) ? '#1a1a1a' : (instrument?.colors?.text || '#f4ecd8');
                      } else if (isActive) {
                        const s = String(val);
                        const lookup = (s === 'f' && !instrument?.colors?.['f']) ? 'F' : (s === 'v' && !instrument?.colors?.['v']) ? 'V' : s;
                        const bgColor = instrument?.colors?.[lookup] || '#111';
                        let txtColor = instrument?.colors?.text || '#f4ecd8';
                        if (isDarkText(instrument?.id, lookup)) {
                          txtColor = '#1a1a1a';
                        }
                        colorStyle = {
                          backgroundColor: bgColor,
                          borderColor: (isSelected || isSingleSelected) ? undefined : bgColor,
                          color: txtColor,
                        };
                      }

                      // Calculate total micro-timing shift (manual + pre-calculated global swing)
                      const manualMicro = pattern?.microtimings?.[i] ?? 0;
                      const swingOffset = swingOffsets[i] || 0;
                      const totalShift = Math.max(-100, Math.min(100, manualMicro + swingOffset));
                      const shiftPx = (totalShift / 100) * 8; // Max 8px shift

                      const isMultiSelected = selectedStepIndices.includes(i) && selectedStepIndices.length > 1;

                      let wrapperClasses = "relative flex flex-col items-center";
                      let wrapperStyle: React.CSSProperties = { width: '40px' };
                      
                      if (isSextuplet) {
                        wrapperClasses = "absolute flex flex-col items-center justify-center top-1.5 z-10 hover:z-20";
                        wrapperStyle = { 
                          width: '54.8px', 
                          left: `${6 + indexInGroup * 27.4}px`
                        };
                      } else if (isTriplet) {
                        wrapperStyle = { width: '48px' };
                      } else if (isOcto) {
                        wrapperStyle = { width: '18px' };
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
                            selectedSubIndex={selectedStepIdx === i ? selectedSubIndex : null}
                            activeTool={activeTool}
                            shiftPx={shiftPx}
                            colorStyle={colorStyle}
                            splitLeftColor={splitLeftColor}
                            splitRightColor={splitRightColor}
                            splitLeftText={splitLeftText}
                            splitRightText={splitRightText}
                            isMultiSelectActive={isMultiSelectActive}
                            isSextuplet={isSextuplet}
                            isTriplet={isTriplet}
                            isOcto={isOcto}
                            indexInGroup={indexInGroup}
                            totalShift={totalShift}
                            trackId={trackId}
                            onMouseDown={handleCellMouseDown}
                            onMouseEnter={handleCellMouseEnter}
                            onTouchStart={handleCellTouchStart}
                            onTouchMove={handleCellTouchMove}
                            onTouchEnd={handleCellTouchEnd}
                            onContextMenu={handleCellContextMenu}
                            onChange={handleCellChange}
                            onKeyDown={handleCellKeyDown}
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
