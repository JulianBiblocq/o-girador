import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isVoiceHoldNote } from '../../utils/musicTheory';
import { VoiceStepData } from '../slices/clipboardSliceTypes';
import { resolveVoiceTrackAndPattern } from './vocalClipboardResolutionHelper';

export const pasteVoiceStepsState = (
  tracks: TrackGroup[],
  clipboardSteps: VoiceStepData[],
  targetTrackId: number,
  targetPatternId: number,
  startIsPreRoll: boolean,
  startStepIdx: number,
  notesOnly = false,
  selectedPatternId?: number | null
): TrackGroup[] | null => {
  if (!clipboardSteps || clipboardSteps.length === 0) return null;

  const { track, pattern } = resolveVoiceTrackAndPattern(tracks, targetTrackId, targetPatternId, null, null, selectedPatternId);
  if (!track || !pattern) return null;

  const instId = instrumentsConfig[track.instrumentIdx]?.id;
  const isCoro = instId === 'coro' || String(track.id).toLowerCase().includes('coro') || track.customName?.toLowerCase().includes('coro');
  const defaultVoiceRole: 'P' | 'C' = isCoro ? 'C' : 'P';

  const preRollStepsCount = pattern.preRollActiveSteps?.length || 16;
  const patternSteps = pattern.steps || 16;

  const preRollNotes = [...(pattern.preRollNotes || Array(preRollStepsCount).fill(''))];
  while (preRollNotes.length < preRollStepsCount) preRollNotes.push('');
  const preRollLyrics = [...(pattern.preRollLyrics || Array(preRollStepsCount).fill(''))];
  while (preRollLyrics.length < preRollStepsCount) preRollLyrics.push('');
  const preRollActiveSteps = [...(pattern.preRollActiveSteps || Array(preRollStepsCount).fill(0))];
  while (preRollActiveSteps.length < preRollStepsCount) preRollActiveSteps.push(0);

  const notes = [...(pattern.notes || Array(patternSteps).fill(''))];
  while (notes.length < patternSteps) notes.push('');
  const lyrics = [...(pattern.lyrics || Array(patternSteps).fill(''))];
  while (lyrics.length < patternSteps) lyrics.push('');
  const activeSteps = [...(pattern.activeSteps || Array(patternSteps).fill(0))];
  while (activeSteps.length < patternSteps) activeSteps.push(0);

  const startLinear = startIsPreRoll ? startStepIdx : (preRollStepsCount + startStepIdx);

  for (let i = 0; i < clipboardSteps.length; i++) {
    const stepData = clipboardSteps[i];
    const currentLinear = startLinear + i;
    const isProlongation = Boolean(stepData.isProlongation);
    const isHoldN = isVoiceHoldNote(stepData.note);
    const isHoldS = stepData.syllable === '-' || stepData.syllable === '───' || isProlongation;
    const isHoldStep = isProlongation || isHoldN || isHoldS;

    if (currentLinear < preRollStepsCount) {
      const prevNote = currentLinear > 0 ? preRollNotes[currentLinear - 1] : '';
      const effectiveNote = stepData.note || (isHoldStep ? prevNote : '');

      if (notesOnly) {
        preRollNotes[currentLinear] = effectiveNote;
        if ((effectiveNote && effectiveNote.trim() !== '') || (isHoldStep && prevNote)) {
          preRollActiveSteps[currentLinear] = defaultVoiceRole;
        }
      } else {
        preRollNotes[currentLinear] = effectiveNote;
        preRollLyrics[currentLinear] = stepData.syllable;
        if ((effectiveNote && effectiveNote.trim() !== '') || (isHoldStep && prevNote) || (stepData.role && stepData.role !== '0')) {
          preRollActiveSteps[currentLinear] = defaultVoiceRole;
        } else {
          preRollActiveSteps[currentLinear] = 0;
        }
      }
    } else {
      const stepIdx = currentLinear - preRollStepsCount;
      if (stepIdx >= patternSteps) break;

      const prevNote = stepIdx > 0 ? notes[stepIdx - 1] : (preRollStepsCount > 0 ? preRollNotes[preRollStepsCount - 1] : '');
      const effectiveNote = stepData.note || (isHoldStep ? prevNote : '');

      if (notesOnly) {
        notes[stepIdx] = effectiveNote;
        if ((effectiveNote && effectiveNote.trim() !== '') || (isHoldStep && prevNote)) {
          activeSteps[stepIdx] = defaultVoiceRole;
        }
      } else {
        notes[stepIdx] = effectiveNote;
        lyrics[stepIdx] = stepData.syllable;
        if ((effectiveNote && effectiveNote.trim() !== '') || (isHoldStep && prevNote) || (stepData.role && stepData.role !== '0')) {
          activeSteps[stepIdx] = defaultVoiceRole;
        } else {
          activeSteps[stepIdx] = 0;
        }
      }
    }
  }

  return tracks.map(t => {
    if (t.id === track.id || String(t.id) === String(track.id)) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === pattern.id || String(p.id) === String(pattern.id)) {
            return {
              ...p,
              notes,
              lyrics,
              activeSteps,
              preRollNotes,
              preRollLyrics,
              preRollActiveSteps
            };
          }
          return p;
        })
      };
    }
    return t;
  });
};
