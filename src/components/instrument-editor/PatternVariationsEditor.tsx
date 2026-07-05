import React from 'react';
import { Play, Square } from 'lucide-react';
import { Language, Pattern } from '../../types';
import { isDarkText } from '../../data';

interface PatternVariationsEditorProps {
  lang: Language;
  ptn: Pattern;
  inst: any;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedVariationId: string | null;
  selectedStepIndices: number[];
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
  handleStepMouseDownMulti: (e: any, i: number) => void;
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  onAddPatternVariation?: (patternId: number) => void;
}

export const PatternVariationsEditor: React.FC<PatternVariationsEditorProps> = ({
  lang,
  ptn,
  inst,
  soloPatternPlayId,
  soloPatternVariationId,
  isTouchDevice,
  isMultiSelectActive,
  selectedStepIdx,
  selectedVariationId,
  selectedStepIndices,
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
  handleStepMouseDownMulti,
  getStepSwingPercent,
  onAddPatternVariation,
}) => {
  const getDisplayVal = (val: string | number): string => {
    if (val === 0 || val === '0') return '';
    return String(val);
  };

  if (inst.type === 'voice' || inst.id === 'apito') return null;

  return (
    <div className="flex flex-col gap-3 mt-2 mb-2 pl-4 border-l-[3px] border-dashed border-[#1a1a1a]/20">
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
                  <>
                    <span className="text-[10px] uppercase font-bold text-[#666]">Prob:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={variation.probability}
                      onChange={(e) => onUpdatePatternVariationProbability && onUpdatePatternVariationProbability(ptn.id, variation.id, parseInt(e.target.value) || 0)}
                      className="w-12 text-xs bg-[#f4ecd8] border border-[#1a1a1a] p-0.5 text-center font-bold"
                    />
                    <span className="text-[10px] font-bold text-[#666]">%</span>
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-[#8b2a1a] bg-[#8b2a1a]/10 px-1.5 py-0.5 rounded-sm">100% ({lang === 'fr' ? 'Entrée' : 'Entrada'})</span>
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
                const groups = [];
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
                          borderColor: isSelected ? undefined : bgColor,
                          color: txtColor,
                        };
                      }
                      
                      return (
                        <div key={i} className="relative flex flex-col items-center" style={{ width: '36px' }}>
                          <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
                          <input
                            type="text"
                            maxLength={['caixa', 'tarol', 'timbal'].includes(inst.id) ? 2 : 1}
                            value={displayVal}
                            readOnly={false}
                            inputMode={isTouchDevice ? 'none' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                              if (!isTouchDevice) {
                                e.target.select();
                              }
                              setSelectedPatternId(ptn.id);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (e.button !== 0) return;
                              setSelectedPatternId(ptn.id);
                              setSelectedStepIdx(i);
                              setSelectedVariationId(variation.id);
                              setSelectedStepIndices([]);
                              if ('shiftKey' in e && e.shiftKey) return;
                              if (onStepTouchStart) {
                                onStepTouchStart(e, ptn.id, i, inst.id, val, (newVal) => {
                                  onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, newVal);
                                });
                              }
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setSelectedPatternId(ptn.id);
                              setSelectedVariationId(variation.id);

                              if (isMultiSelectActive) {
                                handleStepMouseDownMulti(e as any, i);
                                return;
                              }

                              setSelectedStepIdx(i);
                              setSelectedStepIndices([]);
                              if ('shiftKey' in e && e.shiftKey) return;
                              if (onStepTouchStart) {
                                onStepTouchStart(e, ptn.id, i, inst.id, val, (newVal) => {
                                  onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, newVal);
                                });
                              }
                            }}
                            onChange={(e) => {
                              onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, e.target.value.toUpperCase());
                            }}
                            onKeyDown={(e) => {
                              const inputEl = e.currentTarget;
                              const cardGrid = inputEl.closest('.step-boxes');
                              const inputs = cardGrid ? Array.from(cardGrid.querySelectorAll('input')) : [];
                              const indexInGrid = inputs.indexOf(inputEl);

                              if (e.key === 'Delete' || e.key === 'Backspace' || e.key === ' ') {
                                e.preventDefault();
                                onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, '0');
                                if (e.key === 'Backspace' && indexInGrid > 0) {
                                  const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
                                  prevEl.focus();
                                  prevEl.select();
                                }
                                return;
                              }

                              if (e.key === 'ArrowRight' || e.key === 'Tab' || e.key === 'Enter') {
                                e.preventDefault();
                                if (indexInGrid < inputs.length - 1) {
                                  const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
                                  nextEl.focus();
                                  nextEl.select();
                                }
                                return;
                              }
                              
                              if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                if (indexInGrid > 0) {
                                  const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
                                  prevEl.focus();
                                  prevEl.select();
                                }
                                return;
                              }

                              const upper = e.key.toUpperCase();
                              const isAlphaNum = upper.length === 1 && upper.match(/^[A-Z0-9]$/);
                              if (isAlphaNum && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                e.preventDefault();
                                onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, upper);
                                if (indexInGrid < inputs.length - 1) {
                                  const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
                                  nextEl.focus();
                                  nextEl.select();
                                }
                              }
                            }}
                            className={`text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border z-10 relative transition-all duration-200 ${
                              (val === 0 || val === '0') ? 'bg-[#ece4d0] text-[#1a1a1a]' : ''
                            } ${
                              selectedStepIdx === i && selectedVariationId === variation.id
                                ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                                : 'focus:border-[#8b2a1a]'
                            }`}
                            style={{
                              width: '36px',
                              height: '36px',
                              ...colorStyle,
                            }}
                          />
                          {/* Sculpting micro-bars */}
                          <div className="w-full flex flex-col gap-[2px] mt-1 z-10 relative">
                            {/* Volume bar (Green) */}
                            <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                              <div className="h-full bg-green-600 transition-all" style={{ width: `${variation.volumes?.[i] ?? 100}%` }} />
                            </div>
                            {/* Decay bar (Amber) */}
                            <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                              <div className="h-full bg-amber-500 transition-all" style={{ width: `${variation.decays?.[i] ?? 100}%` }} />
                            </div>
                            {/* Micro-timing bar (Blue bi-directional) */}
                            {(() => {
                              const manualVal = variation.microtimings?.[i] ?? 0;
                              const swingOffset = getStepSwingPercent(i, variation.steps.length, ptn.beatResolutions);
                              const totalShift = Math.max(-100, Math.min(100, manualVal + swingOffset));
                              return (
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
