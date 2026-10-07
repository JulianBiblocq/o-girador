/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Pattern, StepSculptValue } from '../../types';
import { getVocalMeasureGroups } from '../../utils/vocalTimingUtils';
import { isVoiceStepProlongation } from '../../utils/musicTheory';
import { useSequencer } from '../../contexts/SequencerContext';
import { VoiceStepCell } from '../InstrumentPatternGrid';

const getSculptNumber = (val: StepSculptValue | undefined, fallback = 100, subIndex = 0): number => {
  if (val === undefined) return fallback;
  if (Array.isArray(val)) return val[subIndex] ?? val[0] ?? fallback;
  return typeof val === 'number' ? val : fallback;
};

export interface VoicePatternGridSectionProps {
  trackId: number;
  pattern: Pattern;
  timeSig?: string;
  lang: string;
  isTupletEditMode: boolean;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean | null;
  selectedStepRange: any;
  isMultiSelectActive: boolean;
  preRollLengthComputed: number;
  swingOffsets: Float32Array | number[];
  isStepInRange: (range: any, cellIsPreRoll: boolean, cellStep: number, preRollCount: number) => boolean;
  handlePatternBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
  handleSetPatternAllBeatsResolution?: (patternId: number, newResolution: number) => void;
  handleDeletePatternMeasure: (trackId: number, patternId: number, measureIdx: number) => void;
  confirmAsync?: (message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  // Handlers pour VoiceStepCell
  handleVoiceStepClear: (trackId: number, patternId: number, index: number, isPreRoll?: boolean) => void;
  handleVoiceTouchStart: (e: React.TouchEvent<HTMLDivElement>, index: number) => void;
  handleVoiceMouseDown: (e: React.MouseEvent<HTMLDivElement>, index: number) => void;
  handleVoiceMouseEnter: (index: number, e?: React.MouseEvent) => void;
  handleVoiceTypeToggle: (trackId: number, patternId: number, index: number) => void;
  handleVoiceSylChange: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceNoteChange: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceNoteBlur: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceFocusStep: (index: number, isPreRoll?: boolean) => void;
  handleVoiceContextMenu: (e: React.MouseEvent<any>, index: number, isPreRoll?: boolean) => void;
  handleSelectStepForSculpt: (index: number) => void;
  handleVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
}

export const VoicePatternGridSection: React.FC<VoicePatternGridSectionProps> = ({
  trackId,
  pattern,
  timeSig = '4/4',
  lang,
  isTupletEditMode,
  selectedPatternId,
  selectedStepIdx,
  selectedStepIsPreRoll,
  selectedStepRange,
  isMultiSelectActive,
  preRollLengthComputed,
  swingOffsets,
  isStepInRange,
  handlePatternBeatResolutionChange,
  handleSetPatternAllBeatsResolution,
  handleDeletePatternMeasure,
  confirmAsync: propConfirmAsync,
  handleVoiceStepClear,
  handleVoiceTouchStart,
  handleVoiceMouseDown,
  handleVoiceMouseEnter,
  handleVoiceTypeToggle,
  handleVoiceSylChange,
  handleVoiceNoteChange,
  handleVoiceNoteBlur,
  handleVoiceFocusStep,
  handleVoiceContextMenu,
  handleSelectStepForSculpt,
  handleVoiceNav,
  focusVoiceStep,
}) => {
  const sequencer = useSequencer();
  const confirmFn = propConfirmAsync || sequencer.confirmAsync;

  let inferredBeats = 4;
  if (timeSig === '3/4') inferredBeats = 3;
  if (timeSig === '2/4' || timeSig === '6/8') inferredBeats = 2;
  if (timeSig === '12/8') inferredBeats = 4;

  const beatsPerMeasure = inferredBeats;
  const measureGroups = getVocalMeasureGroups(pattern.steps || 16, pattern.beatResolutions, beatsPerMeasure);

  const isCurrentAll12 = Array.isArray(pattern.beatResolutions) && pattern.beatResolutions.length >= beatsPerMeasure && pattern.beatResolutions.slice(0, beatsPerMeasure).every(r => r === 3);
  const isCurrentAll16 = !pattern.beatResolutions || pattern.beatResolutions.slice(0, beatsPerMeasure).every(r => r === 4);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* ─── Barre de préréglages rapides des divisions (quand isTupletEditMode est actif) ─── */}
      {isTupletEditMode && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-2.5 py-1.5 bg-[#ece4d0] border border-[#1a1a1a]/20 rounded-md shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#1a1a1a]">⚙️ {lang === 'fr' ? 'Divisions vocales :' : 'Divisões vocais :'}</span>
            <span className="text-[10px] text-[#1a1a1a]/60">({lang === 'fr' ? 'Par temps ou global' : 'Por tempo ou global'})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSetPatternAllBeatsResolution?.(pattern.id, 3)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border transition-colors ${
                isCurrentAll12
                  ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a] shadow-xs'
                  : 'bg-[#ece4d0]/80 text-[#1a1a1a] border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/10'
              }`}
              title={lang === 'fr' ? 'Passer toute la mesure en triolets (12 pas)' : 'Passar todo o compasso em tercinas (12 passos)'}
            >
              3 {lang === 'fr' ? 'Triolets (12 pas)' : 'Tercinas (12 passos)'}
            </button>
            <button
              onClick={() => handleSetPatternAllBeatsResolution?.(pattern.id, 4)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border transition-colors ${
                isCurrentAll16
                  ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] shadow-xs'
                  : 'bg-[#ece4d0]/80 text-[#1a1a1a] border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/10'
              }`}
              title={lang === 'fr' ? 'Passer toute la mesure en doubles-croches (16 pas standard)' : 'Passar todo o compasso em semicolcheias (16 passos padrão)'}
            >
              4 {lang === 'fr' ? 'D.Croches (16 pas)' : 'Semicolcheias (16)'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Mesures vocales ─── */}
      {measureGroups.map((measure) => {
        const m = measure.measureIndex;
        const groups = measure.groups;
        const totalGroups = groups.length;

        // Découpage en 2 moitiés si 4 temps (ex: T1-T2 en haut, T3-T4 en bas)
        const halfPoint = Math.ceil(totalGroups / 2);
        const firstHalf = groups.slice(0, halfPoint);
        const secondHalf = groups.slice(halfPoint);

        const renderBeatGroup = (groupItem: typeof groups[0]) => {
          const beatIdx = groupItem.beatIndex;
          const groupSteps = groupItem.steps;
          const currentRes = groupItem.resolution;

          return (
            <div key={`beat-group-${m}-${beatIdx}`} className="flex-1 min-w-0 flex flex-col gap-1">
              {/* En-tête de pulsation : Numéro de temps + Sélecteur de division si actif */}
              <div className="flex items-center justify-between px-1 text-[9px] font-bold text-[#1a1a1a]/50 select-none">
                <span className="tracking-wide">
                  {lang === 'fr' ? `T${beatIdx + 1}` : `T${beatIdx + 1}`}
                  <span className="text-[8px] font-normal ml-0.5 opacity-70">({groupSteps.length}p)</span>
                </span>
                {isTupletEditMode && (
                  <select
                    value={currentRes}
                    onChange={(e) => handlePatternBeatResolutionChange(pattern.id, beatIdx, parseInt(e.target.value, 10))}
                    className="text-[9px] bg-[#ece4d0] border border-[#1a1a1a]/20 rounded-xs outline-none px-0.5 py-0 font-bold cursor-pointer hover:bg-[#ece4d0]/80 transition-colors"
                  >
                    <option value="3">3 (Triolet)</option>
                    <option value="4">4 (D.Croche)</option>
                    <option value="6">6 (Sextolet)</option>
                    <option value="8">8 (Fusa)</option>
                  </select>
                )}
              </div>

              {/* Cellules du temps */}
              <div className="flex gap-1 sm:gap-2 justify-between p-1 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm">
                {groupSteps.map((i, indexInGroup) => {
                  const state = pattern?.activeSteps?.[i];
                  const syl = pattern?.lyrics?.[i] || '';
                  const note = pattern?.notes?.[i] || '';
                  const isSelected = selectedPatternId === pattern.id && selectedStepIdx === i && Boolean(selectedStepIsPreRoll) === false;

                  const isStepActive = (val: any) => val !== undefined && val !== null && val !== 0 && val !== '0';
                  const currentActive = isStepActive(state);
                  const curNoteTrim = (note || '').trim();
                  const prevActive = i > 0 ? isStepActive(pattern?.activeSteps?.[i - 1]) : false;
                  const prevNote = i > 0 ? (pattern?.notes?.[i - 1] || '').trim() : '';
                  const nextActive = i < (pattern?.steps ?? 16) - 1 ? isStepActive(pattern?.activeSteps?.[i + 1]) : false;
                  const nextNote = i < (pattern?.steps ?? 16) - 1 ? (pattern?.notes?.[i + 1] || '').trim() : '';
                  const nextSyl = i < (pattern?.steps ?? 16) - 1 ? (pattern?.lyrics?.[i + 1] || '').trim() : '';

                  const isProlongation = isVoiceStepProlongation(
                    currentActive,
                    prevActive,
                    curNoteTrim,
                    prevNote,
                    syl
                  );

                  const isFollowedByProlongation = isVoiceStepProlongation(
                    nextActive,
                    currentActive,
                    nextNote,
                    curNoteTrim,
                    nextSyl
                  );

                  // Décalage micro-timing (sculpt + swing global)
                  const manualMicro = pattern?.microtimings?.[i] ?? 0;
                  const manualMicroNum = getSculptNumber(manualMicro, 0);
                  const swingOffset = (swingOffsets as any)?.[i] || 0;
                  const totalShift = Math.max(-100, Math.min(100, manualMicroNum + swingOffset));
                  const shiftPx = (totalShift / 100) * 8; // Max 8px shift

                  const isLinked = Boolean(syl && !syl.endsWith(' ') && i < (pattern?.steps ?? 16) - 1 && (pattern?.lyrics?.[i + 1] || '').trim() !== '');

                  return (
                    <VoiceStepCell
                      key={`voice-step-${i}`}
                      i={i}
                      steps={pattern?.steps ?? 16}
                      trackId={trackId}
                      patternId={pattern.id}
                      state={state}
                      syl={syl}
                      note={note}
                      isSelected={isSelected}
                      isInRange={isStepInRange(selectedStepRange, false, i, preRollLengthComputed)}
                      preRollLength={preRollLengthComputed}
                      isMultiSelectActive={isMultiSelectActive}
                      manualMicro={manualMicro}
                      totalShift={totalShift}
                      shiftPx={shiftPx}
                      isLinked={isLinked}
                      volume={pattern.volumes?.[i] ?? 100}
                      decay={pattern.decays?.[i] ?? 10}
                      isProlongation={isProlongation}
                      isFollowedByProlongation={isFollowedByProlongation}
                      isFirstInBeat={indexInGroup === 0}
                      onVoiceStepClear={handleVoiceStepClear}
                      onTouchStart={handleVoiceTouchStart}
                      onMouseDown={handleVoiceMouseDown}
                      onMouseEnter={handleVoiceMouseEnter}
                      onVoiceTypeToggle={handleVoiceTypeToggle}
                      onVoiceSylChange={handleVoiceSylChange}
                      onVoiceNoteChange={handleVoiceNoteChange}
                      onVoiceNoteBlur={handleVoiceNoteBlur}
                      onFocusStep={(idx) => handleVoiceFocusStep(idx, false)}
                      onContextMenu={(e) => handleVoiceContextMenu(e, i, false)}
                      onSelectForSculpt={handleSelectStepForSculpt}
                      onVoiceNav={handleVoiceNav}
                      focusVoiceStep={focusVoiceStep}
                    />
                  );
                })}
              </div>
            </div>
          );
        };

        return (
          <div key={`voice-measure-${m}`} className="flex flex-col gap-1 w-full">
            {/* Titre de mesure */}
            <div className="text-[9px] font-bold text-[#1a1a1a]/40 tracking-wider uppercase pl-1 flex items-center gap-2">
              <span>{lang === 'fr' ? `Mesure ${m + 1}` : `Compasso ${m + 1}`}</span>
              {measureGroups.length > 1 && (
                <button
                  onClick={async () => {
                    const confirmMsg = lang === 'fr'
                      ? `Supprimer la mesure ${m + 1} du motif ? Cette action est irréversible.`
                      : `Excluir o compasso ${m + 1} do padrão? Esta ação é irreversível.`;
                    const confirmed = await confirmFn(confirmMsg);
                    if (!confirmed) return;
                    handleDeletePatternMeasure(trackId, pattern.id, m);
                  }}
                  className="text-[#8b2a1a] hover:text-[#a63d2d] transition-colors p-0.5 hover:bg-[#8b2a1a]/10 rounded cursor-pointer"
                  title={lang === 'fr' ? "Supprimer cette mesure" : "Excluir este compasso"}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Conteneur des temps de la mesure */}
            <div className="flex flex-col gap-1.5 w-full p-1 bg-[#ece4d0]/10 border border-[#1a1a1a]/15 rounded-md">
              {/* Ligne 1 : Première moitié des temps (Temps 1-2 en 4/4) */}
              <div className="flex flex-row gap-1.5 sm:gap-2 w-full justify-between items-stretch">
                {firstHalf.map(renderBeatGroup)}
              </div>

              {/* Ligne 2 : Deuxième moitié des temps (Temps 3-4 en 4/4) si applicable */}
              {secondHalf.length > 0 && (
                <div className="flex flex-row gap-1.5 sm:gap-2 w-full justify-between items-stretch">
                  {secondHalf.map(renderBeatGroup)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
