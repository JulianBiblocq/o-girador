import React from 'react';
import { GLUE_CURSOR } from './gridConstants';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { isStepInRange } from '../../../hooks/instrument-editor/gridStepRangeHelper';
import { SplitHalfZone } from './SplitHalfZone';
import {
  STEP_EMPTY_SELECTED_BG,
  STEP_PASSIVE_CURSOR_SHADOW,
  STEP_SELECTION_BOX_SHADOW,
  STEP_TUPLET_SELECTION_FILTER,
  StepSelectionCornerBadge,
} from './StepSelectionVisuals';

interface PercussionStepSplitVisualProps {
  i: number;
  val: [string, string];
  trackId: number;
  patternId: number;
  isFocused: boolean;
  isMultiSelected: boolean;
  isMultiSelectActive: boolean;
  selectedSubIndex?: 0 | 1 | null;
  activeTool?: string | number;
  shiftPx: number;
  splitLeftColor?: string;
  splitRightColor?: string;
  splitLeftText?: string;
  splitRightText?: string;
  isSextuplet: boolean;
  isTriplet: boolean;
  isOcto: boolean;
  indexInGroup: number;
  onMouseDown: (e: React.MouseEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onMouseEnter: (index: number, e?: React.MouseEvent, subIndex?: 0 | 1) => void;
  onTouchStart: (e: React.TouchEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onTouchMove?: (e: React.TouchEvent<any>) => void;
  onTouchEnd?: (e: React.TouchEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number, value: any, subIndex?: 0 | 1) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onSelectForSculpt?: (index: number, subIndex?: 0 | 1) => void;
}

export const PercussionStepSplitVisual: React.FC<PercussionStepSplitVisualProps> = (props) => {
  const {
    i, val, trackId, patternId, isFocused, isMultiSelected, isMultiSelectActive,
    selectedSubIndex, activeTool, shiftPx, splitLeftColor, splitRightColor,
    splitLeftText, splitRightText, isSextuplet, isTriplet, isOcto, indexInGroup, onContextMenu,
  } = props;
  const lang = useSequencerStore((state) => state.lang);
  const selectedStepRange = useSequencerStore((state) => state.selectedStepRange);
  const isInRange = isStepInRange(selectedStepRange, false, i, 0, patternId);
  const isExplicitSelected = isMultiSelected || isInRange;
  const isWholeFocused = isFocused && !isExplicitSelected && (selectedSubIndex === null || selectedSubIndex === undefined);
  const isTuplet = isSextuplet || isTriplet;
  const isUpwardTuplet = isTriplet || (isSextuplet && indexInGroup % 2 === 0);

  const borderClass = isExplicitSelected
    ? '-translate-y-[2px] z-20 border !border-[var(--cordel-accent)]'
    : isFocused
      ? 'z-20 border !border-[var(--cordel-wood)]'
      : 'z-10 border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]';

  const leftEmpty = !val[0] || val[0] === '0';
  const rightEmpty = !val[1] || val[1] === '0';
  const leftBg = leftEmpty && isExplicitSelected ? STEP_EMPTY_SELECTED_BG : (splitLeftColor || 'var(--cordel-surface-muted)');
  const rightBg = rightEmpty && isExplicitSelected ? STEP_EMPTY_SELECTED_BG : (splitRightColor || 'var(--cordel-surface-muted)');

  return (
    <div
      className={`step-input-cell xilo-wood-stamp relative flex items-center justify-center font-bold outline-none p-0 box-border m-[1px] rounded-none transition-transform duration-150 ${
        isOcto ? 'text-[9px]' : 'text-sm'
      } ${borderClass}`}
      style={{
        width: 'calc(100% - 2px)',
        maxWidth: isTuplet || isOcto ? undefined : '44px',
        height: isTuplet ? '48px' : '38px',
        transform: `translateX(${shiftPx}px)`,
        background: `linear-gradient(135deg, ${leftBg} 48%, var(--cordel-ink-dark) 48%, var(--cordel-ink-dark) 52%, ${rightBg} 52%)`,
        boxShadow: isExplicitSelected
          ? STEP_SELECTION_BOX_SHADOW
          : isWholeFocused
            ? STEP_PASSIVE_CURSOR_SHADOW
            : undefined,
        filter: isExplicitSelected && isTuplet ? STEP_TUPLET_SELECTION_FILTER : undefined,
        clipPath: isSextuplet
          ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
          : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
        borderStyle: isTuplet ? 'none' : undefined,
        borderRadius: isTuplet ? '0' : undefined,
        cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer',
        touchAction: isMultiSelectActive ? 'none' : undefined,
      }}
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-step-index={i}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetEl = e.target as HTMLElement;
        if (!targetEl.hasAttribute('data-sub-index') && !targetEl.closest('[data-sub-index]')) {
          onContextMenu?.(e, i, val);
        }
      }}
      title={activeTool === 'scissors' ? (lang === 'fr' ? '/ Recoller le pas (Fusionner)' : '/ Juntar o passo (Mesclar)') : undefined}
    >
      <div className="xilo-wood-stamp absolute inset-0 pointer-events-none z-0" />
      <SplitHalfZone
        trackId={trackId} patternId={patternId} i={i} subIndex={0} fullVal={val}
        textVal={val[0]} textColor={splitLeftText} activeTool={activeTool} isMultiSelectActive={isMultiSelectActive}
        onMouseDown={props.onMouseDown} onMouseEnter={props.onMouseEnter}
        onTouchStart={props.onTouchStart} onTouchMove={props.onTouchMove}
        onTouchEnd={props.onTouchEnd} onContextMenu={props.onContextMenu}
        onKeyDown={props.onKeyDown} onSelectForSculpt={props.onSelectForSculpt}
      />
      <SplitHalfZone
        trackId={trackId} patternId={patternId} i={i} subIndex={1} fullVal={val}
        textVal={val[1]} textColor={splitRightText} activeTool={activeTool} isMultiSelectActive={isMultiSelectActive}
        onMouseDown={props.onMouseDown} onMouseEnter={props.onMouseEnter}
        onTouchStart={props.onTouchStart} onTouchMove={props.onTouchMove}
        onTouchEnd={props.onTouchEnd} onContextMenu={props.onContextMenu}
        onKeyDown={props.onKeyDown} onSelectForSculpt={props.onSelectForSculpt}
      />
      {!isExplicitSelected && isFocused && (selectedSubIndex === 0 || selectedSubIndex === 1) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points={selectedSubIndex === 0 ? '0,0 100,0 0,100' : '100,0 100,100 0,100'}
            fill="var(--cordel-paper-surface)" fillOpacity="0.2" stroke="var(--cordel-wood)" strokeWidth="6" strokeLinejoin="miter"
          />
        </svg>
      )}
      {isExplicitSelected && <StepSelectionCornerBadge isUpwardTriangle={isUpwardTuplet} />}
    </div>
  );
};
