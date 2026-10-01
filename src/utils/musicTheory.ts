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
