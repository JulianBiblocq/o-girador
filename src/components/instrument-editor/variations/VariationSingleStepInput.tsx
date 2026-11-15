import React from 'react';
import { isDarkText } from '../../../data';
import { applyCordelInkedPatina } from '../../../utils/colorHelpers';
import { SCISSORS_CURSOR } from '../grid/gridConstants';
import {
  STEP_EMPTY_SELECTED_BG,
  STEP_PASSIVE_CURSOR_SHADOW,
  STEP_SELECTION_BOX_SHADOW,
  StepSelectionCornerBadge,
} from '../grid/StepSelectionVisuals';
import { handleVariationStepKeyDown } from './useVariationStepKeyHandler';

interface VariationSingleStepInputProps {
  i: number;
  val: string | number;
  variation: any;
  ptn: any;
  inst: any;
  lang: any;
  activeTool: string;
  isLeftHanded: boolean;
  trackId: number;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  isMultiSelected: boolean;
  isPassiveCursor: boolean;
  onSelectPattern: (id: number) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  onVariationStepValueChange?: (ptnId: number, varId: string, idx: any, val: any, opts?: { skipUndo?: boolean }) => void;
  handleTogglePlay: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

export const VariationSingleStepInput: React.FC<VariationSingleStepInputProps> = (props) => {
  const {
    i, val, variation, ptn, inst, lang, activeTool, isLeftHanded, trackId,
    isTouchDevice, isMultiSelectActive, isMultiSelected, isPassiveCursor,
    onSelectPattern, setSelectedPatternId, setSelectedStepIdx, setSelectedStepIndices,
    onVariationStepValueChange, handleTogglePlay, onMouseDown, onMouseEnter, onTouchStart,
  } = props;

  const displayVal = val === 0 || val === '0' || !val ? '' : String(val);
  const isActive = val !== 0 && val !== '0' && val !== '';
  let colorStyle: React.CSSProperties = {};
  if (isActive) {
    const stroke = String(val);
    const lookup = stroke === 'f' && !inst?.colors?.['f'] ? 'F' : stroke === 'v' && !inst?.colors?.['v'] ? 'V' : stroke;
    const rawHex = inst?.colors?.[lookup];
    const bgColor = rawHex ? applyCordelInkedPatina(rawHex) : 'var(--cordel-ink-dark)';
    const txtColor = rawHex && isDarkText(inst?.id, lookup, bgColor)
      ? 'var(--cordel-paper-ink)'
      : (inst?.colors?.text || 'var(--cordel-paper-surface)');
    colorStyle = { backgroundColor: bgColor, color: txtColor };
  }

  const borderClass = isMultiSelected
    ? 'border !border-[var(--cordel-accent)]'
    : isPassiveCursor
      ? 'border !border-[var(--cordel-wood)]'
      : !isActive
        ? 'border border-[var(--cordel-ink-dark)]/30 shadow-[1px_1px_0px_var(--cordel-shadow-color)]'
        : 'border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]';

  return (
    <div
      className={`relative flex items-center justify-center m-[1px] transition-transform duration-150 ${
        isMultiSelected ? '-translate-y-[2px] z-20' : isPassiveCursor ? 'z-20' : 'z-10'
      }`}
      style={{ width: '34px', height: '34px' }}
    >
      <input
        data-step-index={i}
        data-variation-id={variation.id}
        type="text"
        maxLength={['caixa', 'tarol', 'timbal'].includes(inst.id) ? 3 : 1}
        value={displayVal}
        readOnly={isMultiSelectActive || activeTool === 'scissors'}
        inputMode={isTouchDevice ? 'none' : undefined}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          if (!isTouchDevice) e.target.select();
          onSelectPattern(ptn.id);
          setSelectedPatternId(ptn.id);
        }}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onTouchStart={onTouchStart}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onChange={(e) => onVariationStepValueChange?.(ptn.id, variation.id, i, e.target.value)}
        onKeyDown={(e) => handleVariationStepKeyDown({
          e, stepIdx: i, val, ptnId: ptn.id, variationId: variation.id,
          volumes: variation.volumes, decays: variation.decays, inst, lang,
          isLeftHanded, trackId, onVariationStepValueChange, setSelectedStepIdx,
          setSelectedStepIndices, handleTogglePlay,
        })}
        className={`step-input-cell w-full h-full m-0 text-center text-sm font-bold outline-none p-0 box-border rounded-none cursor-pointer ${
          isActive ? 'xilo-wood-stamp' : 'bg-[var(--cordel-parchment-panel)] text-[var(--cordel-paper-ink)]'
        } ${borderClass}`}
        style={{
          ...colorStyle,
          backgroundColor: !isActive
            ? (isMultiSelected ? STEP_EMPTY_SELECTED_BG : undefined)
            : colorStyle.backgroundColor,
          boxShadow: isMultiSelected
            ? STEP_SELECTION_BOX_SHADOW
            : isPassiveCursor
              ? STEP_PASSIVE_CURSOR_SHADOW
              : undefined,
          cursor: activeTool === 'scissors' ? SCISSORS_CURSOR : 'pointer',
          touchAction: isMultiSelectActive ? 'none' : undefined,
        }}
      />
      {isMultiSelected && <StepSelectionCornerBadge />}
    </div>
  );
};
