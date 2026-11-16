import * as Tone from 'tone';

export interface VoiceMelismaGlide {
  note: string;
  freq: number;
  offsetSec: number;
}

/**
 * Transpose une chaîne représentant une note musicale d'un nombre donné de demi-tons.
 * Préserve les cellules vides, silences ('0', '𝄽') et tenues ('───', '-', '_').
 */
export const transposeNoteString = (noteStr: string, semitones: number): string => {
  if (!noteStr) return '';
  const trimmed = noteStr.trim();
  if (
    trimmed === '' ||
    trimmed === '0' ||
    trimmed === '𝄽' ||
    trimmed === '───' ||
    trimmed === '-' ||
    trimmed === '_'
  ) {
    return noteStr;
  }
  try {
    return Tone.Frequency(trimmed).transpose(semitones).toNote();
  } catch {
    return noteStr;
  }
};

export const isVoiceHoldSyllable = (syl: string | undefined | null): boolean => {
  if (!syl) return true;
  const trimmed = syl.trim();
  return (
    trimmed === '' ||
    trimmed === '-' ||
    trimmed === '───' ||
    trimmed === '—' ||
    trimmed === '~' ||
    trimmed === '_'
  );
};

export const isVoiceHoldNote = (note: string | undefined | null): boolean => {
  if (!note) return false;
  const trimmed = note.trim();
  return trimmed === '-' || trimmed === '───' || trimmed === '—' || trimmed === '~' || trimmed === '_';
};

export const isKaraokeHiddenToken = (syl: string | undefined | null): boolean => {
  if (!syl) return true;
  const trimmed = syl.trim();
  return (
    trimmed === '' ||
    trimmed === '-' ||
    trimmed === '_' ||
    trimmed === '───' ||
    trimmed === '—' ||
    trimmed === '~' ||
    trimmed === '0' ||
    trimmed === '𝄽'
  );
};

export const cleanVoiceSyllableForDisplay = (rawSyl: string | undefined | null): string => {
  if (!rawSyl || isKaraokeHiddenToken(rawSyl)) return '';
  return rawSyl.trim().replace(/-$/, '');
};

/**
 * Détermine si un pas vocal est une tenue iso-hauteur (prolongation pure) du pas précédent.
 * Un mélisme `_` changeant de hauteur (`curNote !== prevNote`) retourne `false` (traité par `isVoiceMelismaStep`).
 */
export const isVoiceStepProlongation = (
  currentActive: boolean,
  prevActive: boolean,
  curNote: string | undefined | null,
  prevNote: string | undefined | null,
  curSyl: string | undefined | null
): boolean => {
  if (!currentActive || !prevActive) return false;
  const curNoteTrim = (curNote || '').trim();
  const prevNoteTrim = (prevNote || '').trim();
  const curSylTrim = (curSyl || '').trim();
  if (!isVoiceHoldSyllable(curSylTrim)) return false;
  if (isVoiceHoldNote(curNoteTrim)) return true;
  if (curSylTrim === '_') {
    if (curNoteTrim && prevNoteTrim && !isVoiceHoldNote(prevNoteTrim) && curNoteTrim !== prevNoteTrim) {
      return false;
    }
    return true;
  }
  return isVoiceHoldNote(curSylTrim);
};

/**
 * Détermine si un pas vocal actif est un mélisme legato (`_` avec changement de hauteur sans ré-attaque ADSR).
 */
export const isVoiceMelismaStep = (
  currentActive: boolean,
  prevActive: boolean,
  curNote: string | undefined | null,
  prevNote: string | undefined | null,
  curSyl: string | undefined | null
): boolean => {
  if (!currentActive || !prevActive) return false;
  if ((curSyl || '').trim() !== '_') return false;
  const curNoteTrim = (curNote || '').trim();
  const prevNoteTrim = (prevNote || '').trim();
  if (!curNoteTrim || isVoiceHoldNote(curNoteTrim) || curNoteTrim === '0' || curNoteTrim === '𝄽') return false;
  if (!prevNoteTrim || isVoiceHoldNote(prevNoteTrim)) return false;
  return curNoteTrim !== prevNoteTrim;
};

/**
 * Résout la hauteur effective portée par un pas actif (remonte à travers les tenues `───`).
 */
export const resolveEffectiveVoicePitch = (
  notes: Array<string | undefined> | undefined,
  activeSteps: any[] | undefined,
  idx: number
): string => {
  if (!notes || !activeSteps || idx < 0) return '';
  for (let i = idx; i >= 0; i--) {
    const st = activeSteps[i];
    if (st === undefined || st === null || st === 0 || st === '0') return '';
    const n = (notes[i] || '').trim();
    if (n && !isVoiceHoldNote(n) && n !== '0' && n !== '𝄽') return n;
  }
  return '';
};
