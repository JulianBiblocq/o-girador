/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { SCISSORS_CURSOR } from './gridConstants';

interface PercussionStepSingleInputProps {
  i: number;
  val: string | number;
  trackId: number;
  patternId: number;
  shiftPx: number;
  colorStyle: React.CSSProperties;
  activeTool?: string | number;
  isFocused: boolean;
  isMultiSelected: boolean;
  isMultiSelectActive: boolean;
  isSextuplet: boolean;
  isTriplet: boolean;
  isOcto: boolean;
  indexInGroup: number;
  onMouseDown: (e: React.MouseEvent<any>, index: number, value: any) => void;
  onMouseEnter: (index: number, e?: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent<any>, index: number, value: any) => void;
  onTouchMove?: (e: React.TouchEvent<any>) => void;
  onTouchEnd?: (e: React.TouchEvent<any>, index: number, value: any) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number, value: any) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, index: number, value: any) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, index: number, value: any) => void;
  onSelectForSculpt?: (index: number) => void;
}

export const PercussionStepSingleInput: React.FC<PercussionStepSingleInputProps> = (props) => {
  const {
    i, val, trackId, patternId, shiftPx, colorStyle, activeTool,
    isFocused, isMultiSelected, isMultiSelectActive,
    isSextuplet, isTriplet, isOcto, indexInGroup,
    onMouseDown, onMouseEnter, onTouchStart, onTouchMove, onTouchEnd,
    onContextMenu, onChange, onKeyDown, onSelectForSculpt
  } = props;
  const lang = useSequencerStore(state => state.lang);
  const isEmpty = val === 0 || val === '0' || !val;

  const borderClass = isMultiSelected
    ? '!border-[2px] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20 m-[1px] rounded-none'
    : isFocused
      ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20 m-[1px] rounded-none'
      : isEmpty
        ? 'bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a]/30 shadow-[1px_1px_0px_rgba(26,26,26,0.3)] rounded-none m-[1px]'
        : 'border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded-none m-[1px]';

  return (
    <input
      type="text"
      value={isEmpty ? '' : val}
      readOnly={isMultiSelectActive || activeTool === 'scissors'}
      tabIndex={activeTool === 'scissors' ? -1 : undefined}
      onMouseDown={(e) => onMouseDown(e, i, val)}
      onFocus={() => onSelectForSculpt?.(i)}
      onClick={() => onSelectForSculpt?.(i)}
      onMouseEnter={(e) => onMouseEnter(i, e)}
      onTouchStart={(e) => onTouchStart(e, i, val)}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => onTouchEnd?.(e, i, val)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, i, val);
      }}
      onChange={(e) => onChange(e, i, val)}
      onKeyDown={(e) => onKeyDown(e, i, val)}
      className={`step-input-cell text-center font-bold outline-none p-0 box-border z-10 relative transition-all duration-200 ${
        isOcto ? 'text-[9px]' : 'text-sm'
      } ${borderClass}`}
      style={{
        ...colorStyle,
        width: 'calc(100% - 2px)',
        maxWidth: isSextuplet || isTriplet || isOcto ? undefined : '44px',
        height: isSextuplet || isTriplet ? '48px' : '38px',
        transform: `translateX(${shiftPx}px)`,
        cursor: activeTool === 'scissors' ? SCISSORS_CURSOR : undefined,
        clipPath: isSextuplet 
          ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
          : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
        borderStyle: isSextuplet || isTriplet ? 'none' : undefined,
        borderRadius: isSextuplet || isTriplet ? '0' : undefined
      }}
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-step-index={i}
      title={activeTool === 'scissors' ? (lang === 'fr' ? '✂ / 🩹 Scinder le pas en doubles croches' : '✂ / 🩹 Dividir o passo em semicolcheias') : undefined}
    />
  );
};
