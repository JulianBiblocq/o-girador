import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isVoiceStepProlongation } from '../../utils/musicTheory';
import { VoiceStepData, SelectedStepRange } from '../slices/clipboardSliceTypes';
import { resolveEffectiveRange, resolveVoiceTrackAndPattern } from './vocalClipboardResolutionHelper';

export const copyVoiceStepsRangeState = (
  tracks: TrackGroup[],
  rangeOverride?: SelectedStepRange | null,
  trackIdOverride?: number,
  patternIdOverride?: number,
  selectedStepRange?: SelectedStepRange | null,
  selectedStepIdx?: number | null,
  selectedStepIsPreRoll?: boolean,
  editingTrackId?: number | null,
  selectedPatternId?: number | null
): { steps: VoiceStepData[]; vocalNotes: string[]; fallbackSelection?: { step: number; isPreRoll: boolean } } | null => {
  const effectiveRange = resolveEffectiveRange(rangeOverride, selectedStepRange, selectedStepIdx, selectedStepIsPreRoll);
  if (!effectiveRange) {
    console.warn('⚠️ [Toada Copy] Aucune plage ni cellule vocale sélectionnée.');
    return null;
  }

  const { track, pattern } = resolveVoiceTrackAndPattern(tracks, trackIdOverride, patternIdOverride, effectiveRange, editingTrackId, selectedPatternId);
  if (!track || !pattern) {
    console.warn('⚠️ [Toada Copy] Aucune piste ou motif vocal trouvé.');
    return null;
  }

  const instId = instrumentsConfig[track.instrumentIdx]?.id;
  const isCoro = instId === 'coro' || String(track.id).toLowerCase().includes('coro') || track.customName?.toLowerCase().includes('coro');
  const defaultVoiceRole: 'P' | 'C' = isCoro ? 'C' : 'P';

  const preRollStepsCount = pattern.preRollActiveSteps?.length || 16;
  const toLinear = (p: { isPreRoll: boolean; step: number }) => p.isPreRoll ? p.step : (preRollStepsCount + p.step);
  const minLinear = Math.min(toLinear(effectiveRange.start), toLinear(effectiveRange.end));
  const maxLinear = Math.max(toLinear(effectiveRange.start), toLinear(effectiveRange.end));

  const isStepActiveVal = (val: any) => val !== undefined && val !== null && val !== 0 && val !== '0';

  const copiedSteps: VoiceStepData[] = [];
  for (let l = minLinear; l <= maxLinear; l++) {
    if (l < preRollStepsCount) {
      const note = pattern.preRollNotes?.[l] || '';
      const syllable = pattern.preRollLyrics?.[l] || '';
      const act = pattern.preRollActiveSteps?.[l];
      const role: 'P' | 'C' | '0' = (act === 'P' || act === 'C') ? act : (isStepActiveVal(act) ? defaultVoiceRole : '0');

      const curActive = isStepActiveVal(act);
      const prevAct = l > 0 ? pattern.preRollActiveSteps?.[l - 1] : 0;
      const prevActive = isStepActiveVal(prevAct);
      const curNoteTrim = (note || '').trim();
      const prevNote = l > 0 ? (pattern.preRollNotes?.[l - 1] || '').trim() : '';
      const isProlongation = isVoiceStepProlongation(curActive, prevActive, curNoteTrim, prevNote, syllable);

      copiedSteps.push({ note, syllable, role, isProlongation });
    } else {
      const stepIdx = l - preRollStepsCount;
      const note = pattern.notes?.[stepIdx] || '';
      const syllable = pattern.lyrics?.[stepIdx] || '';
      const act = pattern.activeSteps?.[stepIdx];
      const role: 'P' | 'C' | '0' = (act === 'P' || act === 'C') ? act : (isStepActiveVal(act) ? defaultVoiceRole : '0');

      const curActive = isStepActiveVal(act);
      const prevAct = stepIdx > 0 ? pattern.activeSteps?.[stepIdx - 1] : (pattern.preRollActiveSteps?.[preRollStepsCount - 1] || 0);
      const prevActive = isStepActiveVal(prevAct);
      const curNoteTrim = (note || '').trim();
      const prevNote = stepIdx > 0 ? (pattern.notes?.[stepIdx - 1] || '').trim() : (pattern.preRollNotes?.[preRollStepsCount - 1] || '').trim();
      const isProlongation = isVoiceStepProlongation(curActive, prevActive, curNoteTrim, prevNote, syllable);

      copiedSteps.push({ note, syllable, role, isProlongation });
    }
  }

  const fallbackSelection = (!selectedStepRange && effectiveRange.start.step !== undefined)
    ? { step: effectiveRange.start.step, isPreRoll: effectiveRange.start.isPreRoll }
    : undefined;

  return {
    steps: copiedSteps,
    vocalNotes: copiedSteps.map(s => s.note),
    fallbackSelection
  };
};
