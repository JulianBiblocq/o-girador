/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useTransportStore } from '../stores/useTransportStore';
import { Pattern } from '../types';
import { useSequencerStore } from '../stores/useSequencerStore';
import { computeStepBalancoPercent } from '../utils/balancoUtils';
import { instrumentsConfig } from '../data';

const getVoiceDurationLabel = (val: number, lang: string): string => {
  if (val <= 10) return lang === 'fr' ? '1 double croche (1 pas)' : '1 semicolcheia';
  if (val <= 20) return lang === 'fr' ? '1 croche (2 pas)' : '1 colcheia';
  if (val <= 30) return lang === 'fr' ? '3 double croches (3 pas)' : '3 semicolcheias';
  if (val <= 40) return lang === 'fr' ? '1 noire (1 temps)' : '1 semínima (1 tempo)';
  if (val <= 50) return lang === 'fr' ? '5 double croches' : '5 semicolcheias';
  if (val <= 60) return lang === 'fr' ? '1 noire + croche (6 pas)' : '1 semínima + colcheia';
  if (val <= 70) return lang === 'fr' ? '7 double croches' : '7 semicolcheias';
  if (val <= 80) return lang === 'fr' ? '1 blanche (2 temps)' : '1 mínima (2 tempos)';
  if (val <= 90) return lang === 'fr' ? '3 temps (12 pas)' : '3 tempos';
  return lang === 'fr' ? '1 ronde (4 temps)' : '1 semibreve (4 tempos)';
};

const EditableNumber = ({ value, suffix = "", min = 0, max = 100, onChange, className = "" }: any) => {
  const lang = useSequencerStore(state => state.lang);
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(String(value));

  if (isEditing) {
    return (
      <input
        type="number"
        value={tempVal}
        autoFocus
        onChange={e => setTempVal(e.target.value)}
        onBlur={() => {
          let num = parseInt(tempVal);
          if (!isNaN(num)) onChange(Math.max(min, Math.min(max, num)));
          setIsEditing(false);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        className={`w-12 text-right bg-[#eaddcf] border border-[#1a1a1a] text-[#1a1a1a] outline-none text-[10px] p-0 rounded-sm shadow-inner font-bold ${className}`}
      />
    );
  }
  return (
    <span 
      onClick={() => { setTempVal(String(value)); setIsEditing(true); }} 
      className={`cursor-pointer hover:underline decoration-dashed underline-offset-2 ${className}`}
      title={lang === 'fr' ? "Cliquer pour modifier" : "Clique para editar"}
    >
      {value > 0 && min < 0 ? `+${value}` : value}{suffix}
    </span>
  );
};

const DecaySliderControl: React.FC<{
  initialValue: number;
  isVoice: boolean;
  lang: string;
  onCommit: (val: number) => void;
}> = ({ initialValue, isVoice, lang, onCommit }) => {
  const [localVal, setLocalVal] = useState(initialValue);
  const labelRef = React.useRef<HTMLSpanElement>(null);
  const valRef = React.useRef(initialValue);
  const isDraggingRef = React.useRef(false);

  React.useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalVal(initialValue);
      valRef.current = initialValue;
      if (labelRef.current) {
        labelRef.current.textContent = isVoice
          ? getVoiceDurationLabel(initialValue, lang)
          : `${initialValue}%`;
      }
    }
  }, [initialValue, isVoice, lang]);

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const nextVal = parseInt((e.target as HTMLInputElement).value, 10);
    valRef.current = nextVal;
    if (labelRef.current) {
      labelRef.current.textContent = isVoice
        ? getVoiceDurationLabel(nextVal, lang)
        : `${nextVal}%`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      setLocalVal(valRef.current);
      onCommit(valRef.current);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLInputElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setLocalVal(valRef.current);
      onCommit(valRef.current);
    }
  };

  return (
    <>
      <div className="flex justify-between text-[10px] font-bold items-center">
        {isVoice ? (
          <>
            <span>⏱️ {lang === 'fr' ? 'Durée de la note' : 'Duração da nota'}</span>
            <span ref={labelRef} className="font-mono text-amber-800">
              {getVoiceDurationLabel(localVal, lang)}
            </span>
          </>
        ) : (
          <>
            <span>🎛️ {lang === 'fr' ? 'Résonance' : 'Ressonância'} (Decay)</span>
            <EditableNumber 
              value={localVal} 
              suffix="%" 
              min={10} 
              max={100} 
              onChange={(newVal: number) => {
                setLocalVal(newVal);
                valRef.current = newVal;
                if (labelRef.current) labelRef.current.textContent = `${newVal}%`;
                onCommit(newVal);
              }} 
            />
          </>
        )}
      </div>
      <input 
        type="range"
        min="10"
        max="100"
        step={isVoice ? "5" : "1"}
        defaultValue={localVal}
        key={`decay-slider-${initialValue}`}
        onPointerDown={handlePointerDown}
        onInput={handleInput}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="w-full accent-amber-500 cursor-pointer h-2 bg-[#1a1a1a]/10 touch-none"
      />
    </>
  );
};

interface InstrumentEffectsProps {
  trackId: number;
  pattern: Pattern;
  selectedStepIdx: number;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  selectedSubIndex?: 0 | 1 | null;
  onSelectSubIndex?: (subIndex: 0 | 1 | null) => void;
  onClose?: () => void;
}

const InstrumentEffectsComponent: React.FC<InstrumentEffectsProps> = ({
  trackId,
  pattern,
  selectedStepIdx,
  selectedStepIndices,
  selectedVariationId,
  selectedSubIndex,
  onSelectSubIndex,
  onClose,
}) => {
  const {
    lang,
    handleTrackStepVolumeChange,
    handleTrackStepDecayChange,
    handleTrackStepMicrotimingChange,
    handleVariationStepVolumeChange,
    handleVariationStepDecayChange,
    handleVariationStepMicrotimingChange,
  } = useSequencer();

  const globalSwing = useTransportStore(state => state.globalSwing);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));

  /* Compute balanço offset for a step index */
  const getStepSwingPercent = (stepIdx: number, steps: number, beatResolutions?: number[]) => {
    return computeStepBalancoPercent({
      stepIdx,
      steps,
      beatResolutions,
      track,
      pattern,
      globalSwing
    });
  };

  const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];
  const isSingle = selectedStepIndices.length <= 1;

  const activeVarObj = selectedVariationId ? pattern.variations?.find(v => v.id === selectedVariationId) : null;
  const effectiveSteps = activeVarObj ? activeVarObj.steps : pattern.activeSteps;
  const effectiveVolumes = activeVarObj ? activeVarObj.volumes : pattern.volumes;
  const effectiveDecays = activeVarObj ? activeVarObj.decays : pattern.decays;
  const effectiveMicros = activeVarObj ? activeVarObj.microtimings : pattern.microtimings;

  const stepVal = isSingle ? effectiveSteps[selectedStepIdx] : null;
  const isSplitStep = isSingle && Array.isArray(stepVal);
  const activeSub: 0 | 1 | null = isSplitStep ? (selectedSubIndex ?? 0) : null;
  const subToPass = isSplitStep && selectedSubIndex !== null && selectedSubIndex !== undefined ? selectedSubIndex : undefined;

  return (
    <div className="bg-[#ece4d0] cordel-border-sm p-3 mt-3 flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between text-xs border-b border-[#1a1a1a]/20 pb-1.5 text-[#1a1a1a]">
        <span className="font-bold">
          🎛️ {lang === 'fr' ? 'Sculpteur' : 'Escultor'} — {
            !isSingle
              ? (lang === 'fr' ? `${selectedStepIndices.length} pas sélectionnés` : `${selectedStepIndices.length} passos selecionados`)
              : (lang === 'fr' ? `Pas ${selectedStepIdx + 1}` : `Passo ${selectedStepIdx + 1}`)
          }
          {activeVarObj && ` (Var: ${activeVarObj.name})`}
          {isSingle && (() => {
            if (isSplitStep) {
              const sVal = stepVal as [string, string];
              if (selectedSubIndex === 0) {
                return ` — ${lang === 'fr' ? '1er Coup' : '1º Golpe'} (${sVal[0]})`;
              } else if (selectedSubIndex === 1) {
                return ` — ${lang === 'fr' ? '2ème Coup' : '2º Golpe'} (${sVal[1]})`;
              } else {
                return ` — ${lang === 'fr' ? 'Coups liés' : 'Golpes ligados'} (${sVal[0]}, ${sVal[1]})`;
              }
            }
            return ` (${stepVal === 0 ? (lang === 'fr' ? 'Silence' : 'Silêncio') : `${lang === 'fr' ? 'Coup' : 'Golpe'}: ${stepVal}`})`;
          })()}
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (selectedVariationId) {
                handleVariationStepVolumeChange?.(trackId, pattern.id, selectedVariationId, targets, 80, subToPass);
                handleVariationStepDecayChange?.(trackId, pattern.id, selectedVariationId, targets, 100, subToPass);
                handleVariationStepMicrotimingChange?.(trackId, pattern.id, selectedVariationId, targets, 0, subToPass);
              } else {
                handleTrackStepVolumeChange(trackId, pattern.id, targets, 80, subToPass);
                handleTrackStepDecayChange(trackId, pattern.id, targets, 100, subToPass);
                handleTrackStepMicrotimingChange(trackId, pattern.id, targets, 0, subToPass);
              }
            }}
            className="text-[#8b2a1a] font-bold text-[10px] uppercase hover:underline cursor-pointer"
          >
            {lang === 'fr' ? 'Réinitialiser' : 'Resetar'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center rounded-xs bg-[#1a1a1a]/10 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer text-xs font-bold shrink-0 ml-1"
              title={lang === 'fr' ? 'Fermer le sculpteur' : 'Fechar o escultor'}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sélecteur de sous-coup si le pas est scindé */}
      {isSplitStep && (
        <div className="flex items-center gap-1.5 py-1 px-2 bg-[#1a1a1a]/5 rounded-xs border border-[#1a1a1a]/15 text-[11px]">
          <span className="font-bold text-[#1a1a1a]/70 mr-1">
            {lang === 'fr' ? 'Cibler le coup :' : 'Alvo do golpe :'}
          </span>
          <button
            type="button"
            onClick={() => onSelectSubIndex?.(0)}
            className={`px-2 py-0.5 font-bold rounded-xs cursor-pointer transition-colors ${
              selectedSubIndex === 0
                ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-xs'
                : 'bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 text-[#1a1a1a]'
            }`}
          >
            ⚡ {lang === 'fr' ? '1er Coup' : '1º Golpe'} ({(stepVal as [string, string])[0]})
          </button>
          <button
            type="button"
            onClick={() => onSelectSubIndex?.(1)}
            className={`px-2 py-0.5 font-bold rounded-xs cursor-pointer transition-colors ${
              selectedSubIndex === 1
                ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-xs'
                : 'bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 text-[#1a1a1a]'
            }`}
          >
            ⚡ {lang === 'fr' ? '2ème Coup' : '2º Golpe'} ({(stepVal as [string, string])[1]})
          </button>
          <button
            type="button"
            onClick={() => onSelectSubIndex?.(null)}
            className={`px-2 py-0.5 font-bold rounded-xs cursor-pointer transition-colors ${
              selectedSubIndex === null
                ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-xs'
                : 'bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 text-[#1a1a1a]'
            }`}
          >
            🔗 {lang === 'fr' ? 'Les deux (Lié)' : 'Ambos (Ligado)'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#1a1a1a]">
        {/* Volume slider */}
        <div className="flex flex-col gap-0.5">
          {(() => {
            const rawVol = effectiveVolumes?.[selectedStepIdx];
            let currVol = 80;
            if (Array.isArray(rawVol)) {
              currVol = activeSub === 1 ? (rawVol[1] ?? 80) : (rawVol[0] ?? 80);
            } else if (rawVol !== undefined && rawVol !== null) {
              currVol = rawVol as number;
            }

            return (
              <>
                <div className="flex justify-between text-[10px] font-bold items-center">
                  <span>🔊 Volume</span>
                  <EditableNumber 
                    value={currVol} 
                    suffix="%" 
                    min={0} 
                    max={100} 
                    onChange={(val: number) => {
                      if (selectedVariationId) {
                        handleVariationStepVolumeChange?.(trackId, pattern.id, selectedVariationId, targets, val, subToPass);
                      } else {
                        handleTrackStepVolumeChange(trackId, pattern.id, targets, val, subToPass);
                      }
                    }} 
                  />
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={currVol}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (selectedVariationId) {
                      handleVariationStepVolumeChange?.(trackId, pattern.id, selectedVariationId, targets, val, subToPass);
                    } else {
                      handleTrackStepVolumeChange(trackId, pattern.id, targets, val, subToPass);
                    }
                  }}
                  className="w-full accent-green-600 cursor-pointer h-2 bg-[#1a1a1a]/10"
                />
              </>
            );
          })()}
        </div>

        {/* Decay slider */}
        <div className="flex flex-col gap-0.5">
          {(() => {
            const tracks = useSequencerStore.getState().tracks;
            const track = tracks.find(t => t.id === trackId);
            const inst = track ? instrumentsConfig[track.instrumentIdx] : null;
            const isVoice = inst?.type === 'voice';

            const rawDecay = effectiveDecays?.[selectedStepIdx];
            const defaultDecay = isVoice ? 10 : 100;
            let currDecay = defaultDecay;
            if (Array.isArray(rawDecay)) {
              currDecay = activeSub === 1 ? (rawDecay[1] ?? defaultDecay) : (rawDecay[0] ?? defaultDecay);
            } else if (rawDecay !== undefined && rawDecay !== null) {
              currDecay = rawDecay as number;
            }

            return (
              <DecaySliderControl
                initialValue={currDecay}
                isVoice={Boolean(isVoice)}
                lang={lang}
                onCommit={(committedVal) => {
                  if (selectedVariationId) {
                    handleVariationStepDecayChange?.(trackId, pattern.id, selectedVariationId, targets, committedVal, subToPass);
                  } else {
                    handleTrackStepDecayChange(trackId, pattern.id, targets, committedVal, subToPass);
                  }
                }}
              />
            );
          })()}
        </div>

        {/* Micro-timing slider */}
        <div className="flex flex-col gap-0.5">
          {(() => {
            const rawMicro = effectiveMicros?.[selectedStepIdx];
            let manualVal = 0;
            if (Array.isArray(rawMicro)) {
              manualVal = activeSub === 1 ? (rawMicro[1] ?? 0) : (rawMicro[0] ?? 0);
            } else if (rawMicro !== undefined && rawMicro !== null) {
              manualVal = rawMicro as number;
            }

            const swingOffset = getStepSwingPercent(selectedStepIdx, pattern.steps, pattern.beatResolutions);
            const totalVal = manualVal + swingOffset;
            const clampedTotalVal = Math.max(-100, Math.min(100, totalVal));

            return (
              <>
                <div className="flex justify-between text-[10px] font-bold items-center">
                  <span>⏱️ Micro-timing ({lang === 'fr' ? 'Décalage' : 'Desvio'})</span>
                  <EditableNumber 
                    value={totalVal} 
                    suffix="%" 
                    min={-100} 
                    max={100} 
                    onChange={(newTotal: number) => {
                      const newManual = newTotal - swingOffset;
                      const clampedManual = Math.max(-100, Math.min(100, newManual));
                      if (selectedVariationId) {
                        handleVariationStepMicrotimingChange?.(trackId, pattern.id, selectedVariationId, targets, clampedManual, subToPass);
                      } else {
                        handleTrackStepMicrotimingChange(trackId, pattern.id, targets, clampedManual, subToPass);
                      }
                    }} 
                  />
                </div>
                <div className="flex items-center gap-2 relative h-6">
                  <span className="text-[8px] font-bold opacity-60 shrink-0">-100%</span>
                  <div className="flex-grow h-2 relative flex items-center">
                    {/* Background track with a center notch */}
                    <div className="absolute inset-x-0 h-1 bg-[#1a1a1a]/15 rounded" />
                    <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-3 bg-[#1a1a1a]/40 z-10" />
                    
                    {/* Bi-directional Blue track representing offset from center */}
                    {totalVal !== 0 && (() => {
                      const widthPercent = Math.min(50, Math.abs(totalVal) / 2);
                      return (
                        <div
                          className="absolute h-1 bg-[#2980b9]"
                          style={{
                            left: totalVal > 0 ? '50%' : 'auto',
                            right: totalVal < 0 ? '50%' : 'auto',
                            width: `${widthPercent}%`
                          }}
                        />
                      );
                    })()}

                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={clampedTotalVal}
                      onChange={(e) => {
                        const newTotal = parseInt(e.target.value);
                        const newManual = newTotal - swingOffset;
                        const clampedManual = Math.max(-100, Math.min(100, newManual));
                        if (selectedVariationId) {
                          handleVariationStepMicrotimingChange?.(trackId, pattern.id, selectedVariationId, targets, clampedManual, subToPass);
                        } else {
                          handleTrackStepMicrotimingChange(trackId, pattern.id, targets, clampedManual, subToPass);
                        }
                      }}
                      className="absolute inset-x-0 w-full h-4 opacity-100 cursor-pointer slider-transparent-track"
                    />
                  </div>
                  <span className="text-[8px] font-bold opacity-60 shrink-0">+50%</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export const InstrumentEffects = React.memo(InstrumentEffectsComponent);
