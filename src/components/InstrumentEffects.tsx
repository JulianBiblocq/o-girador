/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useTransportStore } from '../stores/useTransportStore';
import { Pattern } from '../types';
import { useSequencerStore } from '../stores/useSequencerStore';
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

interface InstrumentEffectsProps {
  trackId: number;
  pattern: Pattern;
  selectedStepIdx: number;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
}

const InstrumentEffectsComponent: React.FC<InstrumentEffectsProps> = ({
  trackId,
  pattern,
  selectedStepIdx,
  selectedStepIndices,
  selectedVariationId,
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

  /* Compute global swing offset for a step index */
  const getStepSwingPercent = (stepIdx: number, steps: number, beatResolutions?: number[]) => {
    if (globalSwing.mode === 'off') return 0;

    let posInGroup = 0;
    if (beatResolutions && beatResolutions.length > 0) {
      let accumulated = 0;
      for (const res of beatResolutions) {
        if (stepIdx >= accumulated && stepIdx < accumulated + res) {
          if (res === 3 || res === 6) return 0;
          posInGroup = stepIdx - accumulated;
          break;
        }
        accumulated += res;
      }
    } else {
      const posInBeat = ((stepIdx / (steps / 4)) % 1) * 4;
      posInGroup = Math.round(posInBeat) % 4;
    }

    const intensity = (globalSwing.swingIntensity !== undefined ? globalSwing.swingIntensity : 100) / 100;

    if (globalSwing.mode === 'custom') {
      return (globalSwing.customOffsets[posInGroup] || 0) * intensity;
    }

    // Default 'maracatu' mode
    if (posInGroup === 0) return 0;
    if (posInGroup === 1) return 8 * intensity;
    if (posInGroup === 2) return -29 * intensity;
    if (posInGroup === 3) return -58 * intensity;
    return 0;
  };

  const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];

  return (
    <div className="bg-[#ece4d0] cordel-border-sm p-3 mt-3 flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between text-xs border-b border-[#1a1a1a]/20 pb-1.5 text-[#1a1a1a]">
        <span className="font-bold">
          🎛️ {lang === 'fr' ? 'Sculpteur' : 'Escultor'} — {
            selectedStepIndices.length > 1
              ? (lang === 'fr' ? `${selectedStepIndices.length} pas sélectionnés` : `${selectedStepIndices.length} passos selecionados`)
              : (lang === 'fr' ? `Pas ${selectedStepIdx + 1}` : `Passo ${selectedStepIdx + 1}`)
          }
          {(() => {
            const activeVarObj = selectedVariationId ? pattern.variations?.find(v => v.id === selectedVariationId) : null;
            if (activeVarObj) {
              return ` (Var: ${activeVarObj.name})`;
            }
            return '';
          })()}
          {selectedStepIndices.length <= 1 && (() => {
            const activeVarObj = selectedVariationId ? pattern.variations?.find(v => v.id === selectedVariationId) : null;
            const effectiveSteps = activeVarObj ? activeVarObj.steps : pattern.activeSteps;
            const stepVal = effectiveSteps[selectedStepIdx];
            return ` (${stepVal === 0 ? (lang === 'fr' ? 'Silence' : 'Silêncio') : `${lang === 'fr' ? 'Coup' : 'Golpe'}: ${stepVal}`})`;
          })()}
        </span>
        <button 
          onClick={() => {
            if (selectedVariationId) {
              handleVariationStepVolumeChange?.(trackId, pattern.id, selectedVariationId, targets, 80);
              handleVariationStepDecayChange?.(trackId, pattern.id, selectedVariationId, targets, 100);
              handleVariationStepMicrotimingChange?.(trackId, pattern.id, selectedVariationId, targets, 0);
            } else {
              handleTrackStepVolumeChange(trackId, pattern.id, targets, 80);
              handleTrackStepDecayChange(trackId, pattern.id, targets, 100);
              handleTrackStepMicrotimingChange(trackId, pattern.id, targets, 0);
            }
          }}
          className="text-[#8b2a1a] font-bold text-[10px] uppercase hover:underline cursor-pointer"
        >
          {lang === 'fr' ? 'Réinitialiser' : 'Resetar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#1a1a1a]">
        {/* Volume slider */}
        <div className="flex flex-col gap-0.5">
          {(() => {
            const activeVarObj = selectedVariationId ? pattern.variations?.find(v => v.id === selectedVariationId) : null;
            const effectiveVolumes = activeVarObj ? activeVarObj.volumes : pattern.volumes;
            const currVol = effectiveVolumes?.[selectedStepIdx] ?? 80;
            return (
              <>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>🔊 Volume</span>
                  <span>{currVol}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={currVol}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (selectedVariationId) {
                      handleVariationStepVolumeChange?.(trackId, pattern.id, selectedVariationId, targets, val);
                    } else {
                      handleTrackStepVolumeChange(trackId, pattern.id, targets, val);
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

            const activeVarObj = selectedVariationId ? pattern.variations?.find(v => v.id === selectedVariationId) : null;
            const effectiveDecays = activeVarObj ? activeVarObj.decays : pattern.decays;
            const currDecay = effectiveDecays?.[selectedStepIdx] ?? (isVoice ? 10 : 100);
            return (
              <>
                <div className="flex justify-between text-[10px] font-bold">
                  {isVoice ? (
                    <>
                      <span>⏳ {lang === 'fr' ? 'Durée de la note' : 'Duração da nota'}</span>
                      <span>{getVoiceDurationLabel(currDecay, lang)}</span>
                    </>
                  ) : (
                    <>
                      <span>⏳ {lang === 'fr' ? 'Résonance' : 'Ressonância'} (Decay)</span>
                      <span>{currDecay}%</span>
                    </>
                  )}
                </div>
                <input 
                  type="range"
                  min="10"
                  max="100"
                  step={isVoice ? "10" : undefined}
                  value={currDecay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (selectedVariationId) {
                      handleVariationStepDecayChange?.(trackId, pattern.id, selectedVariationId, targets, val);
                    } else {
                      handleTrackStepDecayChange(trackId, pattern.id, targets, val);
                    }
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-[#1a1a1a]/10"
                />
              </>
            );
          })()}
        </div>

        {/* Micro-timing slider */}
        <div className="flex flex-col gap-0.5">
          {(() => {
            const activeVarObj = selectedVariationId ? pattern.variations?.find(v => v.id === selectedVariationId) : null;
            const effectiveMicros = activeVarObj ? activeVarObj.microtimings : pattern.microtimings;
            const manualVal = effectiveMicros?.[selectedStepIdx] ?? 0;
            const swingOffset = getStepSwingPercent(selectedStepIdx, pattern.steps, pattern.beatResolutions);
            const totalVal = manualVal + swingOffset;
            const clampedTotalVal = Math.max(-100, Math.min(100, totalVal));

            return (
              <>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>⏱️ Micro-timing ({lang === 'fr' ? 'Décalage' : 'Desvio'})</span>
                  <span>
                    {totalVal > 0 ? `+${totalVal}` : totalVal}%
                  </span>
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
                          handleVariationStepMicrotimingChange?.(trackId, pattern.id, selectedVariationId, targets, clampedManual);
                        } else {
                          handleTrackStepMicrotimingChange(trackId, pattern.id, targets, clampedManual);
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
