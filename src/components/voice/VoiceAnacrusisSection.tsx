/**
 * VoiceAnacrusisSection.tsx
 * Section Anacrouse (Mesure -1) du pattern vocal avec masquage/dépliage Cordel (< 130 lignes).
 */
import React, { useState } from 'react';
import type { Pattern } from '../../types/store.types';
import { isVoiceStepProlongation } from '../../utils/musicTheory';
import { VoiceStepCell } from '../InstrumentPatternGrid';

interface VoiceAnacrusisProps {
  pattern: Pattern;
  trackId: number;
  lang: string;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean | null;
  selectedStepRange: any;
  preRollLengthComputed: number;
  isStepInRange: (range: any, isPre: boolean, idx: number, len: number) => boolean;
  handleVoicePreRollStepClear?: (tId: number, pId: number, i: number, isPre?: boolean) => void;
  handleVoicePreRollMouseDown?: (e: React.MouseEvent<HTMLDivElement>, i: number) => void;
  handleVoiceContextMenu?: (e: React.MouseEvent<any>, i: number, isPre?: boolean) => void;
  handleVoicePreRollSylChange: (tId: number, pId: number, i: number, val: string) => void;
  handleVoiceNoteChange: (tId: number, pId: number, i: number, note: string) => void;
  handleVoicePreRollNoteBlur: (tId: number, pId: number, i: number, note: string) => void;
  handleVoiceFocusStep: (idx: number, isPre?: boolean) => void;
  handleVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
}

const isStepActive = (val: any) => val !== undefined && val !== null && val !== 0 && val !== '0';

export const VoiceAnacrusisSection: React.FC<VoiceAnacrusisProps> = (props) => {
  const { pattern, trackId, lang } = props;
  const hasActiveNotes = (pattern?.preRollActiveSteps?.some(isStepActive) ?? false) ||
    (pattern?.preRollLyrics?.some((l) => Boolean(l && l.trim())) ?? false) ||
    (pattern?.preRollNotes?.some((n) => Boolean(n && n.trim())) ?? false);
  const [isExpanded, setIsExpanded] = useState<boolean>(() => Boolean(pattern?.hasAnacrusis) || hasActiveNotes);

  const resArray = Array.isArray(pattern?.beatResolutions) && pattern.beatResolutions.length >= 4 ? pattern.beatResolutions.slice(0, 4) : [4, 4, 4, 4];
  const preRollGroups: number[][] = [];
  let preAcc = 0;
  for (let b = 0; b < 4; b++) {
    const res = resArray[b] || 4, grp: number[] = [];
    for (let s = 0; s < res; s++) grp.push(preAcc + s);
    preRollGroups.push(grp);
    preAcc += res;
  }
  const preRollTotalSteps = preAcc;
  const activeCount = pattern?.preRollActiveSteps?.reduce((acc: number, val, i) => isStepActive(val) && acc === 0 ? preRollTotalSteps - i : acc, 0) || 0;

  if (!isExpanded && !hasActiveNotes) {
    return (
      <div className="w-full flex items-center justify-start py-1">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="px-3 py-1 bg-[var(--cordel-accent,#8b2a1a)]/10 hover:bg-[var(--cordel-accent,#8b2a1a)]/20 text-[var(--cordel-accent,#8b2a1a)] border border-dashed border-[var(--cordel-accent,#8b2a1a)]/40 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>➕</span>
          <span>{lang === 'fr' ? 'Ajouter une anacrouse (M-1)' : 'Adicionar anacruse (M-1)'}</span>
        </button>
      </div>
    );
  }

  const renderGroup = (group: number[], gIdx: number) => (
    <div key={`preroll-grp-${gIdx}`} className="flex-1 min-w-0 flex gap-1 sm:gap-2 justify-between p-1 bg-[var(--cordel-bg-secondary,#ece4d0)]/40 border border-[var(--cordel-border,#1a1a1a)]/10 rounded-sm">
      {group.map((i, idxInGrp) => {
        const state = pattern?.preRollActiveSteps?.[i] ?? 0;
        const syl = pattern?.preRollLyrics?.[i] || '';
        const note = pattern?.preRollNotes?.[i] || '';
        const curActive = isStepActive(state);
        const prevActive = i > 0 ? isStepActive(pattern?.preRollActiveSteps?.[i - 1]) : false;
        const prevNote = i > 0 ? (pattern?.preRollNotes?.[i - 1] || '').trim() : '';
        const nextActive = i < preRollTotalSteps - 1 ? isStepActive(pattern?.preRollActiveSteps?.[i + 1]) : false;
        const nextNote = i < preRollTotalSteps - 1 ? (pattern?.preRollNotes?.[i + 1] || '').trim() : '';
        const nextSyl = i < preRollTotalSteps - 1 ? (pattern?.preRollLyrics?.[i + 1] || '').trim() : '';
        const isProlongation = isVoiceStepProlongation(curActive, prevActive, note.trim(), prevNote, syl);
        const isFollowedByProlongation = isVoiceStepProlongation(nextActive, curActive, nextNote, note.trim(), nextSyl);

        return (
          <VoiceStepCell
            key={`preroll-cell-${i}`} i={i} steps={pattern?.steps || 16} trackId={trackId} patternId={pattern.id}
            state={state} syl={syl} note={note} volume={pattern?.preRollVolumes?.[i] ?? 100} decay={pattern?.preRollDecays?.[i] ?? 10}
            isSelected={props.selectedPatternId === pattern.id && props.selectedStepIdx === i && Boolean(props.selectedStepIsPreRoll)}
            isMultiSelectActive={false} manualMicro={0} totalShift={0} shiftPx={0} isLinked={false} isPreRoll={true}
            isInRange={props.isStepInRange(props.selectedStepRange, true, i, props.preRollLengthComputed)}
            preRollLength={props.preRollLengthComputed} isProlongation={isProlongation} isFollowedByProlongation={isFollowedByProlongation}
            isFirstInBeat={idxInGrp === 0} onVoiceStepClear={props.handleVoicePreRollStepClear} onMouseDown={props.handleVoicePreRollMouseDown}
            onContextMenu={(e) => props.handleVoiceContextMenu?.(e, i, true)} onVoiceTypeToggle={() => {}}
            onVoiceSylChange={props.handleVoicePreRollSylChange} onVoiceNoteChange={props.handleVoiceNoteChange}
            onVoiceNoteBlur={props.handleVoicePreRollNoteBlur} onFocusStep={(idx) => props.handleVoiceFocusStep(idx, true)}
            onVoiceNav={props.handleVoiceNav} focusVoiceStep={props.focusVoiceStep}
          />
        );
      })}
    </div>
  );

  return (
    <div
      className="pre-roll-section w-full mb-1 p-3.5 rounded border border-dashed border-[var(--cordel-border,#1a1a1a)]/30"
      style={{
        background: 'repeating-linear-gradient(45deg, rgba(200, 200, 200, 0.15), rgba(200, 200, 200, 0.15) 10px, rgba(160, 160, 160, 0.1) 10px, rgba(160, 160, 160, 0.1) 20px)',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="text-[11px] font-bold text-[var(--cordel-accent,#8b2a1a)] mb-2 tracking-wide uppercase select-none flex items-center gap-1.5">
        <span>🎙️ {lang === 'fr' ? 'Mesure -1 : Anacrouse (Pre-roll)' : 'Compasso -1 : Anacruse (Pre-roll)'}</span>
        {activeCount > 0 && (
          <span className="bg-[var(--cordel-accent,#8b2a1a)] text-[var(--cordel-bg,#f4ecd8)] text-[8px] font-bold px-1.5 py-px rounded-full animate-pulse">
            +{activeCount} {lang === 'fr' ? 'pas' : 'passos'}
          </span>
        )}
        <span className="text-[9px] text-[var(--cordel-muted,#555)] font-normal normal-case italic ml-auto">
          ({lang === 'fr' ? 'La première syllabe détermine la durée' : 'A primeira sílaba determina a duração'})
        </span>
        {!hasActiveNotes && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-[10px] text-[var(--cordel-muted,#777)] hover:text-[var(--cordel-accent,#8b2a1a)] normal-case underline ml-2 cursor-pointer"
          >
            {lang === 'fr' ? 'Masquer' : 'Ocultar'}
          </button>
        )}
      </div>
      <div className="step-boxes flex flex-col gap-1.5 w-full p-1 bg-[var(--cordel-bg-secondary,#ece4d0)]/10 border border-[var(--cordel-border,#1a1a1a)]/15 rounded-md" id={`preroll-voice-${trackId}-${pattern.id}`}>
        <div className="flex flex-row gap-1.5 sm:gap-2 w-full justify-between items-stretch">
          {renderGroup(preRollGroups[0], 0)}
          {renderGroup(preRollGroups[1], 1)}
        </div>
        <div className="flex flex-row gap-1.5 sm:gap-2 w-full justify-between items-stretch">
          {renderGroup(preRollGroups[2], 2)}
          {renderGroup(preRollGroups[3], 3)}
        </div>
      </div>
    </div>
  );
};
