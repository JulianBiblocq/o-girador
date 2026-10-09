import React, { useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { Play, Square } from 'lucide-react';
import { Language, Pattern } from '../../types';
import { isDarkText } from '../../data';
import { audioEngine } from '../../hooks/useAudioSync';
import { useAudio } from '../../contexts/AudioContext';
import { getAlternatingStroke, getNextNuanceState, getWheelNuanceState } from '../../utils/instrumentStrokes';

interface PatternVariationsEditorProps {
  trackId: number;
  lang: Language;
  ptn: Pattern;
  inst: any;
  activeTool: string;
  isAlternating: boolean;
  isLeftHanded: boolean;
  selectedPatternId: number;
  onSelectPattern: (id: number) => void;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedVariationId: string | null;
  selectedStepIndices: number[];
  selectedSubIndex?: 0 | 1 | null;
  setSelectedSubIndex?: (subIndex: 0 | 1 | null) => void;
  onStopSoloPattern?: () => void;
  onPlaySoloPattern?: (patternId: number, variationId?: string) => void;
  onTogglePatternVariationFirstTimeOnly?: (patternId: number, variationId: string, val: boolean) => void;
  onUpdatePatternVariationProbability?: (patternId: number, variationId: string, probability: number) => void;
  onDeletePatternVariation?: (patternId: number, variationId: string) => void;
  onVariationStepValueChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setIsMultiSelectActive: (val: boolean) => void;
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  onAddPatternVariation?: (patternId: number) => void;
}

export const PatternVariationsEditor: React.FC<PatternVariationsEditorProps> = ({
  trackId,
  lang,
  ptn,
  inst,
  activeTool,
  isAlternating,
  isLeftHanded,
  selectedPatternId,
  onSelectPattern,
  soloPatternPlayId,
  soloPatternVariationId,
  isTouchDevice,
  isMultiSelectActive,
  selectedStepIdx,
  selectedVariationId,
  selectedStepIndices,
  selectedSubIndex,
  setSelectedSubIndex,
  onStopSoloPattern,
  onPlaySoloPattern,
  onTogglePatternVariationFirstTimeOnly,
  onUpdatePatternVariationProbability,
  onDeletePatternVariation,
  onVariationStepValueChange,
  onStepTouchStart,
  setSelectedPatternId,
  setSelectedStepIdx,
  setSelectedVariationId,
  setSelectedStepIndices,
  setIsMultiSelectActive,
  getStepSwingPercent,
  onAddPatternVariation,
}) => {
  const { handleTogglePlay } = useAudio();
  const variationsContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);

  // Synchronisation des références pour l'écouteur d'événements natif (évite les fermetures obsolètes)
  const ptnRef = useRef(ptn);
  ptnRef.current = ptn;
  const instRef = useRef(inst);
  instRef.current = inst;
  const selectedPatternIdRef = useRef(selectedPatternId);
  selectedPatternIdRef.current = selectedPatternId;
  const selectedVariationIdRef = useRef(selectedVariationId);
  selectedVariationIdRef.current = selectedVariationId;
  const langRef = useRef(lang);
  langRef.current = lang;
  const isLeftHandedRef = useRef(isLeftHanded);
  isLeftHandedRef.current = isLeftHanded;
  const trackIdRef = useRef(trackId);
  trackIdRef.current = trackId;
  const selectedSubIndexRef = useRef(selectedSubIndex);
  selectedSubIndexRef.current = selectedSubIndex;
  const onVariationStepValueChangeRef = useRef(onVariationStepValueChange);
  onVariationStepValueChangeRef.current = onVariationStepValueChange;
  const setSelectedPatternIdRef = useRef(setSelectedPatternId);
  setSelectedPatternIdRef.current = setSelectedPatternId;
  const setSelectedVariationIdRef = useRef(setSelectedVariationId);
  setSelectedVariationIdRef.current = setSelectedVariationId;
  const setSelectedStepIdxRef = useRef(setSelectedStepIdx);
  setSelectedStepIdxRef.current = setSelectedStepIdx;
  const setSelectedStepIndicesRef = useRef(setSelectedStepIndices);
  setSelectedStepIndicesRef.current = setSelectedStepIndices;
  const setSelectedSubIndexRef = useRef(setSelectedSubIndex);
  setSelectedSubIndexRef.current = setSelectedSubIndex;
  const onSelectPatternRef = useRef(onSelectPattern);
  onSelectPatternRef.current = onSelectPattern;

  useEffect(() => {
    const onMouseUp = () => {
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  // Écouteur natif non-passif sur le conteneur des variations :
  // Neutralise impérativement le défilement vertical (e.preventDefault()) lors du survol d'un pas
  useEffect(() => {
    const el = variationsContainerRef.current;
    if (!el) return;

    const handleVariationWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const stepTarget = target.closest('[data-step-index][data-variation-id]') as HTMLElement | null;
      if (!stepTarget) return;

      const stepIdxAttr = stepTarget.getAttribute('data-step-index');
      const varId = stepTarget.getAttribute('data-variation-id');
      if (stepIdxAttr === null || !varId) return;

      const currentPtn = ptnRef.current;
      const currentSelectedPatternId = selectedPatternIdRef.current;
      const currentSelectedVariationId = selectedVariationIdRef.current;

      // Condition de focus : le motif parent ou la variation doit être sélectionné(e)
      const isContextSelected =
        currentPtn?.id === currentSelectedPatternId ||
        currentSelectedVariationId === varId;

      if (!isContextSelected) return;

      // Interception et blocage strict du défilement vertical de la page
      e.preventDefault();
      e.stopPropagation();

      const stepIdx = parseInt(stepIdxAttr, 10);
      const direction = e.deltaY < 0 ? 'up' : 'down';

      const variation = currentPtn?.variations?.find(v => v.id === varId);
      if (!variation) return;

      const currentVal = variation.steps[stepIdx] ?? 0;
      let valToNuance = currentVal;
      const subIdx = selectedSubIndexRef.current;
      if (Array.isArray(currentVal)) {
        valToNuance = currentVal[subIdx === 1 ? 1 : 0];
      }

      const nextVal = getWheelNuanceState(
        valToNuance as string | number,
        direction,
        instRef.current?.id,
        instRef.current?.type,
        langRef.current,
        isLeftHandedRef.current
      );

      let finalVal: string | number | [string, string] = nextVal;
      if (Array.isArray(currentVal)) {
        const arr = [...currentVal] as [string, string];
        const targetSub = subIdx === 1 ? 1 : 0;
        arr[targetSub] = String(nextVal);
        finalVal = arr;
      }

      if (nextVal !== valToNuance) {
        onVariationStepValueChangeRef.current?.(
          currentPtn.id,
          varId,
          stepIdx,
          Array.isArray(finalVal) ? (finalVal as any) : String(finalVal)
        );

        onSelectPatternRef.current?.(currentPtn.id);
        setSelectedPatternIdRef.current?.(currentPtn.id);
        setSelectedVariationIdRef.current?.(varId);
        setSelectedStepIdxRef.current?.(stepIdx);
        setSelectedStepIndicesRef.current?.([stepIdx]);
        if (!Array.isArray(currentVal)) {
          setSelectedSubIndexRef.current?.(null);
        }

        if (nextVal !== 0 && nextVal !== '0' && audioEngine) {
          try {
            const rawVol = variation.volumes?.[stepIdx];
            const vol = ((Array.isArray(rawVol) ? (subIdx === 1 ? rawVol[1] : rawVol[0]) : (rawVol ?? 80)) as number) / 100;
            const rawDec = variation.decays?.[stepIdx];
            const dec = ((Array.isArray(rawDec) ? (subIdx === 1 ? rawDec[1] : rawDec[0]) : (rawDec ?? 100)) as number) / 100;
            audioEngine.playNote(trackIdRef.current, String(nextVal), Tone.now(), vol, dec);
          } catch (_) {}
        }
      }
    };

    el.addEventListener('wheel', handleVariationWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleVariationWheel);
    };
  }, []);

  const applyStrokeToVariationStep = React.useCallback((
    variationId: string,
    stepIdx: number,
    currentVal: string | number | [string, string],
    isInitialClick = false
  ) => {
    if (activeTool === 'scissors') return;

    let strokeToApply: string | number;
    if (activeTool === '0' || activeTool === '' || activeTool === undefined) {
      strokeToApply = 0;
    } else if (isAlternating) {
      strokeToApply = getAlternatingStroke(stepIdx, activeTool, inst.id, inst.type, lang, isLeftHanded);
    } else if (isInitialClick) {
      const currentSubVal = Array.isArray(currentVal) ? currentVal[0] : currentVal;
      strokeToApply = getNextNuanceState(currentSubVal as string | number, activeTool, inst.id, inst.type, lang, isLeftHanded);
    } else {
      strokeToApply = activeTool;
    }

    let finalVal: string | [string, string] = String(strokeToApply);
    if (Array.isArray(currentVal)) {
      const arr = [...currentVal] as [string, string];
      arr[0] = String(strokeToApply);
      finalVal = arr;
    }

    onVariationStepValueChange && onVariationStepValueChange(ptn.id, variationId, stepIdx, finalVal as any);

    // Pré-écoute sonore
    if (strokeToApply !== 0 && strokeToApply !== '0' && audioEngine) {
      try {
        const variation = ptn.variations?.find(v => v.id === variationId);
        const rawVol = variation?.volumes?.[stepIdx];
        const vol = ((Array.isArray(rawVol) ? rawVol[0] : (rawVol ?? 80)) as number) / 100;
        const rawDec = variation?.decays?.[stepIdx];
        const dec = ((Array.isArray(rawDec) ? rawDec[0] : (rawDec ?? 100)) as number) / 100;
        audioEngine.playNote(trackId, String(strokeToApply), Tone.now(), vol, dec);
      } catch (_) {}
    }
  }, [activeTool, isAlternating, inst.id, inst.type, lang, isLeftHanded, onVariationStepValueChange, ptn.id, ptn.variations, trackId]);

  const getDisplayVal = (val: string | number | [string, string]): string => {
    if (val === 0 || val === '0' || !val) return '';
    if (Array.isArray(val)) return `${val[0]}/${val[1]}`;
    return String(val);
  };

  if (inst.type === 'voice' || inst.id === 'apito') return null;

  return (
    <div ref={variationsContainerRef} className="flex flex-col gap-3 mt-2 mb-2 pl-4 border-l-[3px] border-dashed border-[#1a1a1a]/20">
      {(ptn.variations || []).map((variation, vIdx) => {
        return (
          <div key={variation.id} className="flex flex-col gap-1.5 p-2 bg-[#ece4d0]/60 cordel-border-sm border-dashed">
            <div className="flex items-center gap-3">
              <span className="text-sm font-cactus font-bold text-[#1a1a1a]">{variation.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id) {
                    onStopSoloPattern && onStopSoloPattern();
                  } else {
                    onPlaySoloPattern && onPlaySoloPattern(ptn.id, variation.id);
                  }
                }}
                className={`p-1 rounded-sm transition-colors ml-2 ${
                  soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id
                    ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                    : 'text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                }`}
                title={soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar leitura') : (lang === 'fr' ? 'Écouter cette variation en solo' : 'Ouvir esta variação em solo')}
              >
                {soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              </button>
              <div className="flex items-center gap-1 ml-4">
                <label className="flex items-center gap-1 mr-3 cursor-pointer" title={lang === 'fr' ? 'Forcer cette variation à jouer uniquement la première fois (levée d\'entrée)' : 'Forçar esta variação a tocar apenas na primeira vez'}>
                  <input 
                    type="checkbox"
                    checked={!!variation.playFirstTimeOnly}
                    onChange={(e) => onTogglePatternVariationFirstTimeOnly && onTogglePatternVariationFirstTimeOnly(ptn.id, variation.id, e.target.checked)}
                    className="accent-[#8b2a1a] cursor-pointer"
                  />
                  <span className="text-[10px] uppercase font-bold text-[#666]">{lang === 'fr' ? '1ère fois' : '1ª vez'}</span>
                </label>

                {!variation.playFirstTimeOnly ? (
                  <div
                    className="h-6 px-2 py-0.5 rounded-[2px] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] inline-flex items-center font-cactus font-bold text-[11px] uppercase tracking-wider tabular-nums select-none shrink-0 bg-[#f4ecd8] text-[#1a1a1a]"
                    title={lang === 'fr' ? 'Probabilité de la variation' : 'Probabilidade da variação'}
                  >
                    <span>{lang === 'fr' ? 'PROBA' : 'PROB'} :&nbsp;</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={variation.probability}
                      onChange={(e) => onUpdatePatternVariationProbability && onUpdatePatternVariationProbability(ptn.id, variation.id, parseInt(e.target.value) || 0)}
                      className="bg-transparent border-0 outline-none p-0 text-center font-cactus font-bold text-[11px] w-7 text-[#1a1a1a]"
                    />
                    <span>%</span>
                  </div>
                ) : (
                  <span
                    className="h-6 px-2 py-0.5 rounded-[2px] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] inline-flex items-center font-cactus font-bold text-[11px] uppercase tracking-wider tabular-nums select-none shrink-0 bg-[#8b2a1a]/10 text-[#8b2a1a]"
                    title={lang === 'fr' ? "Variation d'amorce (joue au 1er passage)" : 'Variação de levada (toca na 1ª vez)'}
                  >
                    {lang === 'fr' ? '1ÈRE FOIS' : '1ª VEZ'} : 100%
                  </span>
                )}
              </div>
              <button
                onClick={() => onDeletePatternVariation && onDeletePatternVariation(ptn.id, variation.id)}
                className="text-[#8b2a1a] text-[10px] font-bold hover:underline cursor-pointer ml-auto"
              >
                ✕ {lang === 'fr' ? 'Supprimer' : 'Excluir'}
              </button>
            </div>
            
            {/* Variation Grid */}
            <div className="step-boxes flex flex-wrap gap-y-2 gap-x-4 scale-[0.9] origin-top-left mt-1">
              {(() => {
                const groups: number[][] = [];
                for (let g = 0; g < variation.steps.length; g += 4) {
                  groups.push(Array.from({ length: Math.min(4, variation.steps.length - g) }, (_, idx) => g + idx));
                }
                return groups.map((group, groupIdx) => (
                  <div key={groupIdx} className="flex gap-4 p-1 bg-[#f4ecd8]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                    {group.map((i) => {
                      const val = variation.steps[i];
                      const displayVal = getDisplayVal(val);
                      const isActive = val !== 0 && val !== '0' && val !== '';
                      
                      const isSelected = selectedStepIdx === i && selectedVariationId === variation.id;
                      
                      let colorStyle: React.CSSProperties = {};
                      if (isActive) {
                        const bgColor = inst.colors[val as string] || '#111';
                        let txtColor = inst.colors.text || '#f4ecd8';
                        if (isDarkText(inst.id, val as string)) {
                          txtColor = '#1a1a1a';
                        }
                        colorStyle = {
                          backgroundColor: bgColor,
                          color: txtColor,
                        };
                      }
                      
                      return (
                        <div
                          key={i}
                          data-step-index={i}
                          data-variation-id={variation.id}
                          className="relative flex flex-col items-center"
                          style={{ width: '36px' }}
                        >
                          <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
                          <input
                            data-step-index={i}
                            data-variation-id={variation.id}
                            type="text"
                            maxLength={['caixa', 'tarol', 'timbal'].includes(inst.id) ? 3 : 1}
                            value={displayVal}
                            readOnly={false}
                            inputMode={isTouchDevice ? 'none' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                              if (!isTouchDevice) {
                                e.target.select();
                              }
                              onSelectPattern(ptn.id);
                              setSelectedPatternId(ptn.id);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (e.button !== 0) return;

                              onSelectPattern(ptn.id);
                              setSelectedPatternId(ptn.id);
                              setSelectedVariationId(variation.id);

                              const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
                              
                              if (isModifier) {
                                if (!isMultiSelectActive) {
                                  setIsMultiSelectActive(true);
                                }
                                if (e.shiftKey) {
                                  if (selectedStepIdx !== null) {
                                    const start = Math.min(selectedStepIdx, i);
                                    const end = Math.max(selectedStepIdx, i);
                                    const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                                    if (e.ctrlKey || e.metaKey) {
                                      setSelectedStepIndices(Array.from(new Set([...selectedStepIndices, ...rangeIndices])));
                                    } else {
                                      setSelectedStepIndices(rangeIndices);
                                    }
                                  } else {
                                    setSelectedStepIndices([i]);
                                    setSelectedStepIdx(i);
                                  }
                                } else if (e.ctrlKey || e.metaKey) {
                                  if (selectedStepIndices.includes(i)) {
                                    setSelectedStepIndices(selectedStepIndices.filter(idx => idx !== i));
                                  } else {
                                    setSelectedStepIndices([...selectedStepIndices, i]);
                                  }
                                }
                                return;
                              }

                              if (isMultiSelectActive) {
                                setIsMultiSelectActive(false);
                                setSelectedStepIndices([i]);
                                setSelectedStepIdx(i);
                                return;
                              }

                              setSelectedStepIdx(i);
                              setSelectedStepIndices([i]);
                              setSelectedSubIndex?.(null);
                              isMouseDownRef.current = true;

                              // Peinture directe du pas avec alternance et pré-écoute sonore
                              applyStrokeToVariationStep(variation.id, i, val, true);
                            }}
                            onMouseEnter={() => {
                              if (!isMouseDownRef.current) return;
                              setSelectedStepIdx(i);
                              setSelectedStepIndices([i]);
                              setSelectedSubIndex?.(null);
                              applyStrokeToVariationStep(variation.id, i, val, false);
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              onSelectPattern(ptn.id);
                              setSelectedPatternId(ptn.id);
                              setSelectedVariationId(variation.id);

                              if (isMultiSelectActive) {
                                if (selectedStepIndices.includes(i)) {
                                  setSelectedStepIndices(selectedStepIndices.filter(idx => idx !== i));
                                } else {
                                  setSelectedStepIndices([...selectedStepIndices, i]);
                                }
                                return;
                              }

                              setSelectedStepIdx(i);
                              setSelectedStepIndices([i]);
                              setSelectedSubIndex?.(null);

                              if (isTouchDevice && onStepTouchStart) {
                                onStepTouchStart(e, ptn.id, i, inst.id, val as string | number, (newVal) => {
                                  onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, newVal);
                                });
                              }
                            }}
                            onChange={(e) => {
                              onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              const inputEl = e.currentTarget;
                              const cardGrid = inputEl.closest('.step-boxes');
                              const inputs = cardGrid ? Array.from(cardGrid.querySelectorAll('input')) : [];
                              const indexInGrid = inputs.indexOf(inputEl);

                              // Espace : Dédié exclusivement au transport Play / Pause hors saisie de texte
                              if (e.code === 'Space') {
                                e.preventDefault();
                                handleTogglePlay();
                                return;
                              }

                              // Backspace / Delete / 0 : Gomme (silence)
                              if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') {
                                e.preventDefault();
                                onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, '0');
                                if (e.key === 'Backspace' && indexInGrid > 0) {
                                  const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
                                  prevEl.focus();
                                  prevEl.select();
                                  setSelectedStepIdx(i - 1);
                                  setSelectedStepIndices([i - 1]);
                                }
                                return;
                              }

                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                e.stopPropagation();
                                const dir = e.key === 'ArrowUp' ? 'up' : 'down';
                                const nextVal = getWheelNuanceState(
                                  val as string | number,
                                  dir,
                                  inst.id,
                                  inst.type,
                                  lang,
                                  isLeftHanded
                                );
                                if (nextVal !== val) {
                                  onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, String(nextVal));
                                  if (nextVal !== 0 && nextVal !== '0' && audioEngine) {
                                    try {
                                      const rawVol = variation.volumes?.[i];
                                      const vol = ((Array.isArray(rawVol) ? rawVol[0] : (rawVol ?? 80)) as number) / 100;
                                      const rawDec = variation.decays?.[i];
                                      const dec = ((Array.isArray(rawDec) ? rawDec[0] : (rawDec ?? 100)) as number) / 100;
                                      audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
                                    } catch (_) {}
                                  }
                                }
                                return;
                              }

                              if (e.key === 'ArrowRight' || e.key === 'Tab' || e.key === 'Enter') {
                                e.preventDefault();
                                if (indexInGrid < inputs.length - 1) {
                                  const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
                                  nextEl.focus();
                                  nextEl.select();
                                  setSelectedStepIdx(i + 1);
                                  setSelectedStepIndices([i + 1]);
                                }
                                return;
                              }
                              
                              if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                if (indexInGrid > 0) {
                                  const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
                                  prevEl.focus();
                                  prevEl.select();
                                  setSelectedStepIdx(i - 1);
                                  setSelectedStepIndices([i - 1]);
                                }
                                return;
                              }

                              const char = e.key;
                              const isAlphaNum = char.length === 1 && char.match(/^[a-zA-Z0-9]$/);
                              if (isAlphaNum && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                e.preventDefault();
                                onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, char);
                                if (audioEngine) {
                                  try {
                                    const rawVol = variation.volumes?.[i];
                                    const vol = ((Array.isArray(rawVol) ? rawVol[0] : (rawVol ?? 80)) as number) / 100;
                                    const rawDec = variation.decays?.[i];
                                    const dec = ((Array.isArray(rawDec) ? rawDec[0] : (rawDec ?? 100)) as number) / 100;
                                    audioEngine.playNote(trackId, char, Tone.now(), vol, dec);
                                  } catch (_) {}
                                }
                                if (indexInGrid < inputs.length - 1) {
                                  const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
                                  nextEl.focus();
                                  nextEl.select();
                                  setSelectedStepIdx(i + 1);
                                  setSelectedStepIndices([i + 1]);
                                }
                              }
                            }}
                            className={`step-input-cell text-center text-sm font-bold outline-none p-0 box-border z-10 relative transition-all duration-200 cursor-pointer ${
                              selectedStepIdx === i && selectedVariationId === variation.id
                                ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20 m-[1px] rounded-none'
                                : (val === 0 || val === '0' || !val)
                                  ? 'bg-[#ece4d0] text-[#1a1a1a] border border-[#1a1a1a]/30 shadow-[1px_1px_0px_rgba(26,26,26,0.3)] rounded-none m-[1px]'
                                  : 'border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded-none m-[1px]'
                            }`}
                            style={{
                              width: '34px',
                              height: '34px',
                              ...colorStyle,
                            }}
                          />
                          {/* Sculpting micro-bars — Zone interactive pour ouvrir l'Escultor sans modifier la note */}
                          <div
                            className={`w-full mt-1.5 z-10 relative select-none min-h-[18px] py-0.5 cursor-pointer rounded-xs transition-colors p-[1px] ${
                              isSelected && selectedVariationId === variation.id
                                ? 'bg-[#8b2a1a]/15 ring-1 ring-[#8b2a1a]'
                                : 'hover:bg-[#1a1a1a]/10'
                            }`}
                            style={{ touchAction: 'manipulation' }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPattern(ptn.id);
                              setSelectedPatternId(ptn.id);
                              setSelectedVariationId(variation.id);
                              setSelectedStepIdx(i);
                              setSelectedStepIndices([i]);
                              setSelectedSubIndex?.(null);
                            }}
                            title={lang === 'fr' ? "Régler le volume, decay et micro-timing (Escultor)" : "Ajustar volume, decay e micro-timing (Escultor)"}
                          >
                            {(() => {
                              const isSplit = Array.isArray(val);
                              const rawVol = variation.volumes?.[i];
                              const vol0 = Array.isArray(rawVol) ? (rawVol[0] ?? 80) : (rawVol ?? 80);
                              const vol1 = Array.isArray(rawVol) ? (rawVol[1] ?? 80) : (rawVol ?? 80);

                              const rawDec = variation.decays?.[i];
                              const dec0 = Array.isArray(rawDec) ? (rawDec[0] ?? 100) : (rawDec ?? 100);
                              const dec1 = Array.isArray(rawDec) ? (rawDec[1] ?? 100) : (rawDec ?? 100);

                              const rawMicro = variation.microtimings?.[i] ?? 0;
                              const swingOffset = getStepSwingPercent(i, variation.steps.length, ptn.beatResolutions);
                              const totalShift0 = Math.max(-100, Math.min(100, (Array.isArray(rawMicro) ? rawMicro[0] : rawMicro) + swingOffset));
                              const totalShift1 = Math.max(-100, Math.min(100, (Array.isArray(rawMicro) ? rawMicro[1] : rawMicro) + swingOffset));

                              if (isSplit) {
                                return (
                                  <div className="grid grid-cols-2 gap-[1px] w-full">
                                    <div
                                      className={`flex flex-col gap-[1px] p-[1px] rounded-xs ${
                                        isSelected && selectedSubIndex === 0 ? 'bg-[#8b2a1a]/20 ring-1 ring-[#8b2a1a]' : ''
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPattern(ptn.id);
                                        setSelectedPatternId(ptn.id);
                                        setSelectedVariationId(variation.id);
                                        setSelectedStepIdx(i);
                                        setSelectedStepIndices([i]);
                                        setSelectedSubIndex?.(0);
                                      }}
                                    >
                                      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                        <div className="h-full bg-green-600 transition-all" style={{ width: `${vol0}%` }} />
                                      </div>
                                      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${dec0}%` }} />
                                      </div>
                                      <div className="h-[2px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                        {totalShift0 !== 0 && (
                                          <div
                                            className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                            style={{
                                              left: totalShift0 > 0 ? '50%' : 'auto',
                                              right: totalShift0 < 0 ? '50%' : 'auto',
                                              width: `${Math.min(50, Math.abs(totalShift0) / 2)}%`
                                            }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      className={`flex flex-col gap-[1px] p-[1px] rounded-xs ${
                                        isSelected && selectedSubIndex === 1 ? 'bg-[#8b2a1a]/20 ring-1 ring-[#8b2a1a]' : ''
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPattern(ptn.id);
                                        setSelectedPatternId(ptn.id);
                                        setSelectedVariationId(variation.id);
                                        setSelectedStepIdx(i);
                                        setSelectedStepIndices([i]);
                                        setSelectedSubIndex?.(1);
                                      }}
                                    >
                                      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                        <div className="h-full bg-green-600 transition-all" style={{ width: `${vol1}%` }} />
                                      </div>
                                      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${dec1}%` }} />
                                      </div>
                                      <div className="h-[2px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                        {totalShift1 !== 0 && (
                                          <div
                                            className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                            style={{
                                              left: totalShift1 > 0 ? '50%' : 'auto',
                                              right: totalShift1 < 0 ? '50%' : 'auto',
                                              width: `${Math.min(50, Math.abs(totalShift1) / 2)}%`
                                            }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col gap-[2px] w-full">
                                  <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                    <div className="h-full bg-green-600 transition-all" style={{ width: `${vol0}%` }} />
                                  </div>
                                  <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${dec0}%` }} />
                                  </div>
                                  <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                    {totalShift0 !== 0 && (
                                      <div
                                        className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                        style={{
                                          left: totalShift0 > 0 ? '50%' : 'auto',
                                          right: totalShift0 < 0 ? '50%' : 'auto',
                                          width: `${Math.min(50, Math.abs(totalShift0) / 2)}%`
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        );
      })}
      
      {/* Add Variation Button */}
      <button
        onClick={() => onAddPatternVariation && onAddPatternVariation(ptn.id)}
        className="text-xs font-bold text-[#1a1a1a] bg-transparent border-2 border-dashed border-[#1a1a1a]/40 px-3 py-1.5 self-start hover:border-[#1a1a1a] hover:bg-[#1a1a1a]/5 transition-colors"
      >
        + {lang === 'fr' ? 'Ajouter une variation probabiliste' : 'Adicionar variação probabilística'}
      </button>
    </div>
  );
};
