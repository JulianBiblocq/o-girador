
import React, { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { PatternVariationsEditorProps } from './variations/variationTypes';
import { usePatternVariationsWheel } from './variations/usePatternVariationsWheel';
import { VariationCard } from './variations/VariationCard';
import { audioEngine } from '../../hooks/useAudioSync';
import { useAudio } from '../../contexts/AudioContext';
import { getAlternatingStroke, getNextNuanceState } from '../../utils/instrumentStrokes';

export const PatternVariationsEditor: React.FC<PatternVariationsEditorProps> = (props) => {
  const { trackId, lang, ptn, inst, activeTool, isAlternating, isLeftHanded, onAddPatternVariation } = props;
  const { handleTogglePlay } = useAudio();
  const variationsContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    const onMouseUp = () => { isMouseDownRef.current = false; };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  usePatternVariationsWheel({
    variationsContainerRef, ptn, inst, selectedPatternId: props.selectedPatternId,
    selectedVariationId: props.selectedVariationId, lang, isLeftHanded, trackId,
    selectedSubIndex: props.selectedSubIndex, onVariationStepValueChange: props.onVariationStepValueChange,
    setSelectedPatternId: props.setSelectedPatternId, setSelectedVariationId: props.setSelectedVariationId,
    setSelectedStepIdx: props.setSelectedStepIdx, setSelectedStepIndices: props.setSelectedStepIndices,
    setSelectedSubIndex: props.setSelectedSubIndex, onSelectPattern: props.onSelectPattern,
  });

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const isAlternatingRef = useRef(isAlternating);
  isAlternatingRef.current = isAlternating;

  const applyStrokeToVariationStep = useCallback((
    variationId: string, stepIdx: number, currentVal: string | number | [string, string], subIndex?: 0 | 1
  ) => {
    const tool = activeToolRef.current;
    if (tool === 'scissors') return;
    let strokeToApply: string | number;
    if (!tool || tool === '0' || tool === '') {
      strokeToApply = 0;
    } else {
      const cur = Array.isArray(currentVal)
        ? (subIndex !== undefined ? currentVal[subIndex] : currentVal[0])
        : currentVal;
      const normCur = String(cur ?? '0').trim();
      const isAlternationEligible = (tool === 'D' || tool === 'E') && isAlternatingRef.current;
      if (isAlternationEligible) {
        strokeToApply = getAlternatingStroke(stepIdx, tool, inst.id, inst.type, lang, isLeftHanded);
      } else if (normCur === tool) {
        strokeToApply = 0;
      } else {
        strokeToApply = tool;
      }
    }

    let finalVal: string | number | [string, string] = strokeToApply === '0' ? 0 : strokeToApply;
    if (Array.isArray(currentVal)) {
      const arr = [...currentVal] as [string, string];
      const targetSub = subIndex !== undefined ? subIndex : 0;
      arr[targetSub] = String(strokeToApply);
      finalVal = arr;
    }
    props.onVariationStepValueChange?.(ptn.id, variationId, stepIdx, finalVal as any);

    if (strokeToApply !== 0 && strokeToApply !== '0' && audioEngine) {
      try {
        const variation = ptn.variations?.find((v) => v.id === variationId);
        const rawVol = variation?.volumes?.[stepIdx];
        const vol = ((Array.isArray(rawVol) ? rawVol[0] : (rawVol ?? 80)) as number) / 100;
        const rawDec = variation?.decays?.[stepIdx];
        const dec = ((Array.isArray(rawDec) ? rawDec[0] : (rawDec ?? 100)) as number) / 100;
        audioEngine.playNote(trackId, String(strokeToApply), Tone.now(), vol, dec);
      } catch (_) {}
    }
  }, [inst.id, inst.type, lang, isLeftHanded, props, ptn.id, ptn.variations, trackId]);

  if (inst.type === 'voice' || inst.id === 'apito') return null;

  return (
    <div ref={variationsContainerRef} className="flex flex-col gap-3 mt-2 mb-2 pl-2 sm:pl-3 border-l-[3px] border-dashed border-[#1a1a1a]/20">
      {(ptn.variations || []).map((variation) => (
        <VariationCard
          key={variation.id} variation={variation} {...props}
          handleTogglePlay={handleTogglePlay} applyStrokeToVariationStep={applyStrokeToVariationStep}
          isMouseDownRef={isMouseDownRef}
        />
      ))}
      <button
        onClick={() => onAddPatternVariation?.(ptn.id)}
        className="text-xs font-bold text-[#1a1a1a] bg-transparent border-2 border-dashed border-[#1a1a1a]/40 px-3 py-1.5 self-start hover:border-[#1a1a1a] hover:bg-[#1a1a1a]/5 transition-colors"
      >
        + {lang === 'fr' ? 'Ajouter une variation probabiliste' : 'Adicionar variação probabilística'}
      </button>
    </div>
  );
};
