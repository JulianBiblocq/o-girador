import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { isStepInRange } from '../../../hooks/instrument-editor/gridStepRangeHelper';
import { SCISSORS_CURSOR } from './gridConstants';
import {
  STEP_EMPTY_SELECTED_BG,
  STEP_PASSIVE_CURSOR_SHADOW,
  STEP_SELECTION_BOX_SHADOW,
  STEP_TUPLET_SELECTION_FILTER,
  StepSelectionCornerBadge,
} from './StepSelectionVisuals';

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
  onMouseEnter: (index: number, e?: React.MouseEvent, subIndex?: 0 | 1) => void;
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
    onContextMenu, onChange, onKeyDown,
  } = props;
  const lang = useSequencerStore((state) => state.lang);
  const selectedStepRange = useSequencerStore((state) => state.selectedStepRange);
  const isInRange = isStepInRange(selectedStepRange, false, i, 0, patternId);
  const isExplicitSelected = isMultiSelected || isInRange;
  const isPassiveCursor = isFocused && !isExplicitSelected;
  const isEmpty = val === 0 || val === '0' || !val;
  const isTuplet = isSextuplet || isTriplet;
  const isUpwardTuplet = isTriplet || (isSextuplet && indexInGroup % 2 === 0);

  const borderClass = isExplicitSelected
    ? 'border !border-[var(--cordel-accent)]'
    : isPassiveCursor
      ? 'border !border-[var(--cordel-wood)]'
      : isEmpty
        ? 'border border-[var(--cordel-ink-dark)]/30 shadow-[1px_1px_0px_var(--cordel-shadow-color)]'
        : 'border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]';

  return (
    <div
      className={`relative flex items-center justify-center m-[1px] transition-transform duration-150 ${
        isExplicitSelected ? '-translate-y-[2px] z-20' : isPassiveCursor ? 'z-20' : 'z-10'
      }`}
      style={{
        width: 'calc(100% - 2px)',
        maxWidth: isTuplet || isOcto ? undefined : '44px',
        height: isTuplet ? '48px' : '38px',
        transform: `translateX(${shiftPx}px)`,
        filter: isExplicitSelected && isTuplet ? STEP_TUPLET_SELECTION_FILTER : undefined,
      }}
    >
      <input
        type="text"
        value={isEmpty ? '' : val}
        readOnly={isMultiSelectActive || activeTool === 'scissors'}
        tabIndex={activeTool === 'scissors' ? -1 : undefined}
        onMouseDown={(e) => onMouseDown(e, i, val)}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => onMouseEnter(i, e)}
        onTouchStart={(e) => onTouchStart(e, i, val)}
        onTouchMove={onTouchMove}
        onTouchEnd={(e) => onTouchEnd?.(e, i, val)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, i, val);
        }}
        onChange={(e) => onChange(e, i, val)}
        onKeyDown={(e) => onKeyDown(e, i, val)}
        className={`step-input-cell w-full h-full m-0 text-center font-bold outline-none p-0 box-border rounded-none ${
          isEmpty ? 'bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)]' : 'xilo-wood-stamp'
        } ${isOcto ? 'text-[9px]' : 'text-sm'} ${borderClass}`}
        style={{
          ...colorStyle,
          backgroundColor: isEmpty
            ? (isExplicitSelected ? STEP_EMPTY_SELECTED_BG : undefined)
            : colorStyle.backgroundColor,
          boxShadow: isExplicitSelected
            ? STEP_SELECTION_BOX_SHADOW
            : isPassiveCursor
              ? STEP_PASSIVE_CURSOR_SHADOW
              : undefined,
          cursor: activeTool === 'scissors' ? SCISSORS_CURSOR : 'pointer',
          touchAction: isMultiSelectActive ? 'none' : undefined,
          clipPath: isSextuplet
            ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
            : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
          borderStyle: isTuplet ? 'none' : undefined,
          borderRadius: isTuplet ? '0' : undefined,
        }}
        data-track-id={trackId}
        data-pattern-id={patternId}
        data-step-index={i}
        title={activeTool === 'scissors' ? (lang === 'fr' ? '/ Scinder le pas en doubles croches' : '/ Dividir o passo em semicolcheias') : undefined}
      />
      {isExplicitSelected && <StepSelectionCornerBadge isUpwardTriangle={isUpwardTuplet} />}
    </div>
  );
};
