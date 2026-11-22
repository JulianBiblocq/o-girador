import React from 'react';
import { isDarkText } from '../../../data';
import { applyCordelInkedPatina } from '../../../utils/colorHelpers';
import { GLUE_CURSOR } from '../grid/gridConstants';
import {
  STEP_EMPTY_SELECTED_BG,
  STEP_PASSIVE_CURSOR_SHADOW,
  STEP_SELECTION_BOX_SHADOW,
  StepSelectionCornerBadge,
} from '../grid/StepSelectionVisuals';

interface VariationSplitCellVisualProps {
  i: number;
  val: [string, string];
  ptnId: number;
  trackId: number;
  variationId: string;
  inst: any;
  activeTool?: string;
  isFocused: boolean;
  isMultiSelected: boolean;
  isMultiSelectActive: boolean;
  selectedSubIndex?: 0 | 1 | null;
  onMouseDown: (e: React.MouseEvent, subIndex?: 0 | 1) => void;
  onMouseEnter: (e: React.MouseEvent, subIndex?: 0 | 1) => void;
  onTouchStart: (e: React.TouchEvent, subIndex?: 0 | 1) => void;
}

function resolveHalfColors(inst: any, rawStroke: string, isSelectedEmptyTint: boolean): { bg: string; text: string } {
  const s = String(rawStroke ?? '0').trim();
  if (!s || s === '0') {
    return {
      bg: isSelectedEmptyTint ? STEP_EMPTY_SELECTED_BG : 'var(--cordel-parchment-panel)',
      text: 'var(--cordel-paper-ink)',
    };
  }
  const lookup = s === 'f' && !inst?.colors?.['f'] ? 'F' : s === 'v' && !inst?.colors?.['v'] ? 'V' : s;
  const rawHex = inst?.colors?.[lookup];
  const bg = rawHex ? applyCordelInkedPatina(rawHex) : 'var(--cordel-ink-dark)';
  const text = rawHex && isDarkText(inst?.id, lookup, bg) ? 'var(--cordel-paper-ink)' : (inst?.colors?.text || 'var(--cordel-paper-surface)');
  return { bg, text };
}

export const VariationSplitCellVisual: React.FC<VariationSplitCellVisualProps> = ({
  i, val, ptnId, trackId, variationId, inst, activeTool, isFocused, isMultiSelected,
  isMultiSelectActive, selectedSubIndex, onMouseDown, onMouseEnter, onTouchStart,
}) => {
  const left = resolveHalfColors(inst, val[0], isMultiSelected);
  const right = resolveHalfColors(inst, val[1], isMultiSelected);
  const isWholeFocused = isFocused && !isMultiSelected && (selectedSubIndex === null || selectedSubIndex === undefined);

  const borderClass = isMultiSelected
    ? '-translate-y-[2px] z-20 border !border-[var(--cordel-accent)]'
    : isFocused
      ? 'z-20 border !border-[var(--cordel-wood)]'
      : 'z-10 border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]';

  return (
    <div
      data-track-id={trackId}
      data-pattern-id={ptnId}
      data-step-index={i}
      data-variation-id={variationId}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className={`step-input-cell xilo-wood-stamp relative flex items-center justify-center font-bold outline-none p-0 box-border m-[1px] rounded-none transition-transform duration-150 ${borderClass}`}
      style={{
        width: '34px',
        height: '34px',
        background: `linear-gradient(135deg, ${left.bg} 48%, var(--cordel-ink-dark) 48%, var(--cordel-ink-dark) 52%, ${right.bg} 52%)`,
        boxShadow: isMultiSelected
          ? STEP_SELECTION_BOX_SHADOW
          : isWholeFocused
            ? STEP_PASSIVE_CURSOR_SHADOW
            : undefined,
        cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer',
        touchAction: isMultiSelectActive ? 'none' : undefined,
      }}
    >
      {([0, 1] as const).map((sub) => (
        <div
          key={sub}
          data-step-index={i}
          data-variation-id={variationId}
          data-sub-index={sub}
          className="absolute inset-0 z-10 select-none outline-none"
          style={{
            clipPath: sub === 0 ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)',
            cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer',
            touchAction: isMultiSelectActive ? 'none' : undefined,
          }}
          onMouseDown={(e) => onMouseDown(e, sub)}
          onMouseEnter={(e) => onMouseEnter(e, sub)}
          onTouchStart={(e) => onTouchStart(e, sub)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <span
            className={`absolute font-bold select-none pointer-events-none text-[9px] leading-none ${
              sub === 0 ? 'top-0.5 left-1' : 'bottom-0.5 right-1'
            }`}
            style={{ color: sub === 0 ? left.text : right.text }}
          >
            {val[sub] === '0' || !val[sub] ? '' : val[sub]}
          </span>
        </div>
      ))}
      {!isMultiSelected && isFocused && (selectedSubIndex === 0 || selectedSubIndex === 1) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points={selectedSubIndex === 0 ? '0,0 100,0 0,100' : '100,0 100,100 0,100'}
            fill="var(--cordel-paper-surface)" fillOpacity="0.2" stroke="var(--cordel-wood)" strokeWidth="6" strokeLinejoin="miter"
          />
        </svg>
      )}
      {isMultiSelected && <StepSelectionCornerBadge />}
    </div>
  );
};
