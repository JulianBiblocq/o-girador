import {
  VoiceMelismaGlide,
  isVoiceStepProlongation,
  isVoiceMelismaStep,
} from '../../utils/musicTheory';
import { noteToFrequency } from './vocalSampleHelpers';

export interface LegatoChainScanResult {
  spanSteps: number;
  melismaGlides: VoiceMelismaGlide[];
}

/**
 * Parcourt en avant une chaîne vocale liée (tenues `───` ET mélismes legato `_` changeant de hauteur)
 * afin d'ouvrir une enveloppe ADSR unique et de programmer les transitions de fréquence sans ré-attaque.
 */
export function scanVoiceLegatoChain(
  activeSteps: any[] | undefined,
  notes: Array<string | undefined> | undefined,
  lyrics: Array<string | undefined> | undefined,
  startIdx: number,
  totalSteps: number,
  startNote: string,
  singleStepSec: number
): LegatoChainScanResult {
  let spanSteps = 1;
  const melismaGlides: VoiceMelismaGlide[] = [];
  let runningPitch = startNote;
  let nextIdx = startIdx + 1;

  while (nextIdx < totalSteps) {
    const nextState = activeSteps?.[nextIdx];
    const nextIsActive = nextState !== undefined && nextState !== null && nextState !== 0 && nextState !== '0';
    if (!nextIsActive) break;

    const nextRawNote = notes?.[nextIdx];
    const nextNoteVal = typeof nextRawNote === 'string' ? nextRawNote.trim() : '';
    const nextSyl = lyrics?.[nextIdx];

    if (isVoiceStepProlongation(true, true, nextNoteVal, runningPitch, nextSyl)) {
      spanSteps++;
      nextIdx++;
    } else if (isVoiceMelismaStep(true, true, nextNoteVal, runningPitch, nextSyl)) {
      melismaGlides.push({
        note: nextNoteVal,
        freq: noteToFrequency(nextNoteVal),
        offsetSec: (nextIdx - startIdx) * singleStepSec,
      });
      runningPitch = nextNoteVal;
      spanSteps++;
      nextIdx++;
    } else {
      break;
    }
  }

  return { spanSteps, melismaGlides };
}
