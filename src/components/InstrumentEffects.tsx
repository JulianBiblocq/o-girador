/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { useTransportStore } from '../stores/useTransportStore';
import { Pattern } from '../types';
import { useSequencerStore } from '../stores/useSequencerStore';
import { computeStepBalancoPercent } from '../utils/balancoUtils';
import { instrumentsConfig } from '../data';
import { VolumeSliderControl } from './effects/VolumeSliderControl';
import { DecaySliderControl } from './effects/DecaySliderControl';
import { MicrotimingSliderControl } from './effects/MicrotimingSliderControl';
import { SplitStepTargetSelector } from './effects/SplitStepTargetSelector';

export interface InstrumentEffectsProps {
  trackId: number;
  pattern: Pattern;
  selectedStepIdx: number;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  selectedSubIndex?: 0 | 1 | null;
  onSelectSubIndex?: (subIndex: 0 | 1 | null) => void;
  onClose?: () => void;
}

export const InstrumentEffects: React.FC<InstrumentEffectsProps> = React.memo(({
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
    lang, handleTrackStepVolumeChange, handleTrackStepDecayChange, handleTrackStepMicrotimingChange,
    handleVariationStepVolumeChange, handleVariationStepDecayChange, handleVariationStepMicrotimingChange,
  } = useSequencer();

  const globalSwing = useTransportStore((state) => state.globalSwing);
  const track = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId));
  const inst = track ? instrumentsConfig[track.instrumentIdx] : null;
  const isVoice = Boolean(inst?.type === 'voice');

  const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];
  const isSingle = selectedStepIndices.length <= 1;
  const activeVarObj = selectedVariationId ? pattern.variations?.find((v) => v.id === selectedVariationId) : null;
  const effectiveSteps = activeVarObj ? activeVarObj.steps : pattern.activeSteps;
  const effectiveVolumes = activeVarObj ? activeVarObj.volumes : pattern.volumes;
  const effectiveDecays = activeVarObj ? activeVarObj.decays : pattern.decays;
  const effectiveMicros = activeVarObj ? activeVarObj.microtimings : pattern.microtimings;

  const stepVal = isSingle ? effectiveSteps[selectedStepIdx] : null;
  const isSplitStep = isSingle && Array.isArray(stepVal);
  const activeSub: 0 | 1 | null = isSplitStep ? (selectedSubIndex ?? 0) : null;
  const subToPass = isSplitStep && selectedSubIndex !== null && selectedSubIndex !== undefined ? selectedSubIndex : undefined;

  const rawVol = effectiveVolumes?.[selectedStepIdx];
  const currVol = Array.isArray(rawVol) ? (activeSub === 1 ? (rawVol[1] ?? 80) : (rawVol[0] ?? 80)) : (rawVol ?? 80);

  const rawDecay = effectiveDecays?.[selectedStepIdx];
  const defaultDecay = isVoice ? 10 : 100;
  const currDecay = Array.isArray(rawDecay) ? (activeSub === 1 ? (rawDecay[1] ?? defaultDecay) : (rawDecay[0] ?? defaultDecay)) : (rawDecay ?? defaultDecay);

  const rawMicro = effectiveMicros?.[selectedStepIdx];
  const manualVal = Array.isArray(rawMicro) ? (activeSub === 1 ? (rawMicro[1] ?? 0) : (rawMicro[0] ?? 0)) : (rawMicro ?? 0);
  const swingOffset = computeStepBalancoPercent({ stepIdx: selectedStepIdx, steps: pattern.steps, beatResolutions: pattern.beatResolutions, track, pattern, globalSwing });

  const resetValues = () => {
    if (selectedVariationId) {
      handleVariationStepVolumeChange?.(trackId, pattern.id, selectedVariationId, targets, 80, subToPass);
      handleVariationStepDecayChange?.(trackId, pattern.id, selectedVariationId, targets, 100, subToPass);
      handleVariationStepMicrotimingChange?.(trackId, pattern.id, selectedVariationId, targets, 0, subToPass);
    } else {
      handleTrackStepVolumeChange(trackId, pattern.id, targets, 80, subToPass);
      handleTrackStepDecayChange(trackId, pattern.id, targets, 100, subToPass);
      handleTrackStepMicrotimingChange(trackId, pattern.id, targets, 0, subToPass);
    }
  };

  return (
    <div className="bg-[#ece4d0] cordel-border-sm p-3 mt-3 flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between text-xs border-b border-[#1a1a1a]/20 pb-1.5 text-[#1a1a1a]">
        <span className="font-bold">
          {lang === 'fr' ? 'Sculpteur' : 'Escultor'} — {!isSingle ? `${selectedStepIndices.length} ${lang === 'fr' ? 'pas' : 'passos'}` : `${lang === 'fr' ? 'Pas' : 'Passo'} ${selectedStepIdx + 1}`}
          {activeVarObj && ` (Var: ${activeVarObj.name})`}
          {isSingle && isSplitStep && ` — ${selectedSubIndex === 0 ? (lang === 'fr' ? '1er Coup' : '1º Golpe') : selectedSubIndex === 1 ? (lang === 'fr' ? '2ème Coup' : '2º Golpe') : (lang === 'fr' ? 'Coups liés' : 'Golpes ligados')} (${(stepVal as [string, string]).join(', ')})`}
          {isSingle && !isSplitStep && ` (${stepVal === 0 ? (lang === 'fr' ? 'Silence' : 'Silêncio') : `${lang === 'fr' ? 'Coup' : 'Golpe'}: ${stepVal}`})`}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={resetValues} className="text-[#8b2a1a] font-bold text-[10px] uppercase hover:underline cursor-pointer">
            {lang === 'fr' ? 'Réinitialiser' : 'Resetar'}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded-xs bg-[#1a1a1a]/10 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer text-xs font-bold shrink-0 ml-1">
              
            </button>
          )}
        </div>
      </div>

      {isSplitStep && (
        <SplitStepTargetSelector stepVal={stepVal as [string, string]} selectedSubIndex={selectedSubIndex} lang={lang} onSelectSubIndex={onSelectSubIndex} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#1a1a1a]">
        <VolumeSliderControl currVol={currVol} onChange={(val) => selectedVariationId ? handleVariationStepVolumeChange?.(trackId, pattern.id, selectedVariationId, targets, val, subToPass) : handleTrackStepVolumeChange(trackId, pattern.id, targets, val, subToPass)} />
        <div className="flex flex-col gap-0.5">
          <DecaySliderControl initialValue={currDecay} isVoice={isVoice} lang={lang} onCommit={(val) => selectedVariationId ? handleVariationStepDecayChange?.(trackId, pattern.id, selectedVariationId, targets, val, subToPass) : handleTrackStepDecayChange(trackId, pattern.id, targets, val, subToPass)} />
        </div>
        <MicrotimingSliderControl totalVal={manualVal + swingOffset} swingOffset={swingOffset} lang={lang} onChange={(clampedManual) => selectedVariationId ? handleVariationStepMicrotimingChange?.(trackId, pattern.id, selectedVariationId, targets, clampedManual, subToPass) : handleTrackStepMicrotimingChange(trackId, pattern.id, targets, clampedManual, subToPass)} />
      </div>
    </div>
  );
});

InstrumentEffects.displayName = 'InstrumentEffects';
