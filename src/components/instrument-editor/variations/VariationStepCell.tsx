import React from 'react';
import { VariationStepSculptBars } from './VariationStepSculptBars';
import { VariationSplitCellVisual } from './VariationSplitCellVisual';
import { VariationSingleStepInput } from './VariationSingleStepInput';
import { useVariationStepPointerHandlers } from './useVariationStepPointerHandlers';
import { areVariationStepPropsEqual, VariationSelectionSnapshot, VariationStepCellProps } from './variationStepCellComparator';

export type { VariationStepCellProps };

export const VariationStepCell: React.FC<VariationStepCellProps> = React.memo((props) => {
  const {
    i, val, variation, ptn, inst, lang, activeTool, isLeftHanded, trackId,
    isSelected, isVarActive, selectedStepIdx, selectedSubIndex,
    isTouchDevice, isMultiSelectActive, selectedStepIndices, getStepSwingPercent,
    onSelectPattern, setSelectedPatternId, setSelectedVariationId, setSelectedStepIdx,
    setSelectedStepIndices, setSelectedSubIndex, onVariationStepValueChange, handleTogglePlay,
  } = props;

  const isMultiSelected = isVarActive && selectedStepIndices.includes(i);
  const isFocused = isVarActive && selectedStepIdx === i;
  const isPassiveCursor = isFocused && !isMultiSelected;
  const pointer = useVariationStepPointerHandlers({ ...props, setSelectedStepIndices: (arr) => setSelectedStepIndices(arr) });

  return (
    <div
      data-track-id={trackId}
      data-pattern-id={ptn.id}
      data-step-index={i}
      data-variation-id={variation.id}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className={`relative flex flex-col items-center ${isMultiSelected ? 'z-20' : ''}`}
      style={{ width: '36px' }}
    >
      <div className="text-[8px] text-[var(--cordel-text-muted)] font-bold mb-0.5 z-10 relative">{i + 1}</div>
      {Array.isArray(val) ? (
        <VariationSplitCellVisual
          i={i} val={val} ptnId={ptn.id} trackId={trackId} variationId={variation.id} inst={inst} activeTool={activeTool}
          isFocused={isFocused} isMultiSelected={isMultiSelected}
          isMultiSelectActive={isMultiSelectActive} selectedSubIndex={selectedSubIndex}
          onMouseDown={pointer.handleMouseDown} onMouseEnter={pointer.handleMouseEnter}
          onTouchStart={pointer.handleTouchStart}
        />
      ) : (
        <VariationSingleStepInput
          i={i} val={val} variation={variation} ptn={ptn} inst={inst} lang={lang}
          activeTool={activeTool} isLeftHanded={isLeftHanded} trackId={trackId}
          isVarActive={isVarActive} isTouchDevice={isTouchDevice} isMultiSelectActive={isMultiSelectActive}
          isMultiSelected={isMultiSelected} isPassiveCursor={isPassiveCursor}
          onSelectPattern={onSelectPattern} setSelectedPatternId={setSelectedPatternId}
          setSelectedVariationId={setSelectedVariationId} setSelectedStepIdx={setSelectedStepIdx}
          setSelectedStepIndices={(arr) => setSelectedStepIndices(arr)}
          onVariationStepValueChange={onVariationStepValueChange} handleTogglePlay={handleTogglePlay}
          onMouseDown={(e) => pointer.handleMouseDown(e)}
          onMouseEnter={(e) => pointer.handleMouseEnter(e)}
          onTouchStart={(e) => pointer.handleTouchStart(e)}
        />
      )}
      <div
        className={`w-full mt-1.5 z-10 relative select-none min-h-[18px] py-0.5 cursor-pointer rounded-xs transition-colors p-[1px] ${
          isSelected ? 'bg-[var(--cordel-wood)]/15 ring-1 ring-[var(--cordel-wood)]' : 'hover:bg-[var(--cordel-ink-dark)]/10'
        }`}
        style={{ touchAction: 'manipulation' }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPattern(ptn.id); setSelectedPatternId(ptn.id); setSelectedVariationId(variation.id);
          setSelectedStepIdx(i); setSelectedStepIndices([]); setSelectedSubIndex?.(null);
        }}
        title={lang === 'fr' ? 'Régler le volume, decay et micro-timing (Escultor)' : 'Ajustar volume, decay e micro-timing (Escultor)'}
      >
        <VariationStepSculptBars
          val={val} stepIdx={i} variation={variation} isSelected={isSelected}
          selectedSubIndex={selectedSubIndex} getStepSwingPercent={getStepSwingPercent}
          beatResolutions={ptn.beatResolutions} onSelectSubIndex={(sub) => setSelectedSubIndex?.(sub)}
        />
      </div>
    </div>
  );
}, areVariationStepPropsEqual);

VariationStepCell.displayName = 'VariationStepCell';
