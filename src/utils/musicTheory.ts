/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';

/**
 * Transpose une chaîne représentant une note musicale d'un nombre donné de demi-tons.
 * Préserve scrupuleusement les cellules vides, les silences ('0'),
 * et les prolongations de notes ('───', '-').
 *
 * @param noteStr - Nom de la note (ex: 'D4', 'F#3', 'Bb4')
 * @param semitones - Nombre de demi-tons (+1, -1, +7, etc.)
 * @returns Le nouveau nom de note transposée (ex: 'A4') ou la valeur d'origine si non transposable.
 */
export const transposeNoteString = (noteStr: string, semitones: number): string => {
  if (!noteStr) return '';
  const trimmed = noteStr.trim();
  if (trimmed === '' || trimmed === '0' || trimmed === '───' || trimmed === '-') {
    return noteStr;
  }

  try {
    return Tone.Frequency(trimmed).transpose(semitones).toNote();
  } catch {
    return noteStr;
  }
};

/**
 * Détermine si une chaîne de paroles représente une tenue / liaison de note
 * (vide, tiret '-', ligne de prolongation '───', tiret long '—', tilde '~', underscore '_').
 */
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

/**
 * Détermine si une note représente un symbole de tenue / prolongation plutôt qu'une note musicale absolue.
 */
export const isVoiceHoldNote = (note: string | undefined | null): boolean => {
  if (!note) return false;
  const trimmed = note.trim();
  return trimmed === '-' || trimmed === '───' || trimmed === '—' || trimmed === '~' || trimmed === '_';
};

/**
 * Détermine de manière unifiée et déterministe si un pas vocal est une prolongation du pas précédent.
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
  const isCurHoldSyl = isVoiceHoldSyllable(curSyl);

  // Si la cellule courante contient une syllabe explicite d'attaque (ex: "Vou", "Ma"), ce n'est pas une prolongation
  if (!isCurHoldSyl) return false;

  // Si la note courante est un symbole explicite de tenue ('───', '-')
  if (isVoiceHoldNote(curNoteTrim)) return true;

  // Si la note courante est identique à la note précédente
  if (curNoteTrim && prevNoteTrim && curNoteTrim === prevNoteTrim) return true;

  // Si la note courante est vide mais que la note précédente existe et que la syllabe est une tenue
  if (!curNoteTrim && prevNoteTrim) return true;

  // Si aucune note n'est renseignée mais que les deux pas consécutifs sont actifs et liés
  if (!curNoteTrim && !prevNoteTrim) return true;

  return false;
};
