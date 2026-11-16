import React, { useRef, useCallback } from 'react';
import { PatternVariationsEditorProps } from './variations/variationTypes';
import { usePatternVariationsWheel } from './variations/usePatternVariationsWheel';
import { VariationCard } from './variations/VariationCard';
import { useAudio } from '../../contexts/AudioContext';
import { useGridPaintAndEraseGesture } from '../../hooks/instrument-editor/useGridPaintAndEraseGesture';
import { getComplementaryStroke, getDefaultSplitPair } from '../../utils/instrumentStrokes';

export const PatternVariationsEditor: React.FC<PatternVariationsEditorProps> = (props) => {
  const { trackId, lang, ptn, inst, activeTool, isAlternating, isLeftHanded, onAddPatternVariation } = props;
  const { handleTogglePlay } = useAudio();
  const variationsContainerRef = useRef<HTMLDivElement>(null);

  usePatternVariationsWheel({
    variationsContainerRef, ptn, inst, selectedPatternId: props.selectedPatternId,
    selectedVariationId: props.selectedVariationId, lang, isLeftHanded, trackId,
    selectedSubIndex: props.selectedSubIndex, onVariationStepValueChange: props.onVariationStepValueChange,
    setSelectedPatternId: props.setSelectedPatternId, setSelectedVariationId: props.setSelectedVariationId,
    setSelectedStepIdx: props.setSelectedStepIdx, setSelectedStepIndices: props.setSelectedStepIndices,
    setSelectedSubIndex: props.setSelectedSubIndex, onSelectPattern: props.onSelectPattern,
  });

  const onCommitStep = useCallback((
    idx: number,
    finalVal: string | number | [string, string],
    variationId: string | null,
    options?: { skipUndo?: boolean }
  ) => {
    if (!variationId) return;
    props.onVariationStepValueChange?.(ptn.id, variationId, idx, finalVal, options);
  }, [props.onVariationStepValueChange, ptn.id]);

  const onSelectCell = useCallback((idx: number, sub: 0 | 1 | null, variationId: string | null) => {
    props.onSelectPattern(ptn.id);
    props.setSelectedPatternId(ptn.id);
    props.setSelectedVariationId(variationId);
    props.setSelectedStepIdx(idx);
    props.setSelectedStepIndices([]);
    props.setSelectedSubIndex?.(sub);
  }, [props, ptn.id]);

  const gesture = useGridPaintAndEraseGesture({
    trackId, patternId: ptn.id, instrument: inst, activeTool, isAlternating, lang, isLeftHanded,
    onCommitStep, onSelectCell,
  });

  const handleVariationScissors = useCallback((variationId: string, idx: number, currentVal: any) => {
    let finalVal: string | number | [string, string];
    if (Array.isArray(currentVal)) {
      const first = currentVal[0];
      finalVal = first === '0' || !first ? 0 : first;
      props.setSelectedSubIndex?.(null);
    } else if (!currentVal || currentVal === 0 || String(currentVal).trim() === '0' || String(currentVal).trim() === '') {
      finalVal = getDefaultSplitPair(inst?.id, inst?.type);
      props.setSelectedSubIndex?.(0);
    } else {
      const baseVal = String(currentVal).trim();
      finalVal = [baseVal, getComplementaryStroke(baseVal, inst?.id, inst?.type, isLeftHanded)];
      props.setSelectedSubIndex?.(0);
    }
    props.onSelectPattern(ptn.id);
    props.setSelectedPatternId(ptn.id);
    props.setSelectedVariationId(variationId);
    props.setSelectedStepIdx(idx);
    props.setSelectedStepIndices([]);
    props.onVariationStepValueChange?.(ptn.id, variationId, idx, finalVal);
  }, [inst?.id, inst?.type, isLeftHanded, props, ptn.id]);

  if (inst.type === 'voice' || inst.id === 'apito') return null;

  return (
    <div
      ref={variationsContainerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="flex flex-col gap-3 mt-2 mb-2 pl-2 sm:pl-3 border-l-[3px] border-dashed border-[var(--cordel-border)]"
    >
      {(ptn.variations || []).map((variation) => (
        <VariationCard
          key={variation.id}
          variation={variation}
          {...props}
          handleTogglePlay={handleTogglePlay}
          gesture={gesture}
          handleVariationScissors={handleVariationScissors}
        />
      ))}
      <button
        type="button"
        onClick={() => onAddPatternVariation?.(ptn.id)}
        className="text-xs font-bold text-[var(--cordel-text)] bg-transparent border-2 border-dashed border-[var(--cordel-border)] px-3 py-1.5 self-start hover:border-[var(--cordel-border-strong)] hover:bg-[var(--cordel-surface)] transition-colors cursor-pointer"
      >
        + {lang === 'fr' ? 'Ajouter une variation probabiliste' : 'Adicionar variação probabilística'}
      </button>
    </div>
  );
};
