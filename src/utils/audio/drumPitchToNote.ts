/**
 * drumPitchToNote.ts — Convertisseur unifié Note Musicale (FR/PT + Intl), Fréquence (Hz) et Cents (< 95 lignes).
 * S'appuie exclusivement sur le registre SSOT `drumFundamentalRegistry.ts` et `pitchHzContract.ts`.
 */

import { DEFAULT_REFERENCE_PITCH_HZ, sanitizePitchHz } from '../pitchHzContract';
import { getDrumNaturalBaseHz, roundSemitonesTenth } from './drumFundamentalRegistry';

export interface DrumPitchNoteInfo {
  noteLabel: string;
  intlNote: string;
  cents: number;
  centsLabel: string;
  noteWithCents: string;
  frequencyHz: number;
  formattedHz: string;
  semitones: number;
  semitonesLabel: string;
  shortBadgeText: string;
  badgeText: string;
}

const NOTES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTES_PT = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
const NOTES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function formatSemitonesLabel(semitones: number): string {
  const st = roundSemitonesTenth(semitones);
  const numStr = Number.isInteger(st) ? String(st) : st.toFixed(1);
  return `${st > 0 ? `+${numStr}` : numStr} st`;
}

export function getDrumPitchNoteInfo(
  instrumentId: string,
  userTuningSemitones: number = 0,
  lang: string = 'fr',
  referencePitchHz: number = DEFAULT_REFERENCE_PITCH_HZ
): DrumPitchNoteInfo {
  const baseHz = getDrumNaturalBaseHz(instrumentId);
  const refHz = sanitizePitchHz(referencePitchHz);
  const semitones = roundSemitonesTenth(userTuningSemitones);
  const rawHz = baseHz * Math.pow(2, semitones / 12);

  const exactMidi = 69 + 12 * Math.log2(rawHz / refHz);
  const nearestMidi = Math.round(exactMidi);
  const rawCents = Math.round((exactMidi - nearestMidi) * 100);
  const cents = Object.is(rawCents, -0) ? 0 : rawCents;

  const noteIdx = ((nearestMidi % 12) + 12) % 12;
  const octave = Math.floor(nearestMidi / 12) - 1;
  const solfege = (lang === 'pt' ? NOTES_PT : NOTES_FR)[noteIdx];

  const noteLabel = `${solfege}${octave}`;
  const intlNote = `${NOTES_INTL[noteIdx]}${octave}`;
  const centsLabel = Math.abs(cents) >= 5 ? (cents > 0 ? `+${cents}c` : `${cents}c`) : '';
  const noteWithCents = centsLabel ? `${noteLabel} ${centsLabel}` : noteLabel;

  const frequencyHz = Math.round(rawHz * 10) / 10;
  const formattedHz = Number.isInteger(frequencyHz) ? `${frequencyHz} Hz` : `${frequencyHz.toFixed(1)} Hz`;
  const semitonesLabel = formatSemitonesLabel(semitones);
  const shortBadgeText = `${noteWithCents} (${intlNote}) • ${formattedHz}`;

  return {
    noteLabel,
    intlNote,
    cents,
    centsLabel,
    noteWithCents,
    frequencyHz,
    formattedHz,
    semitones,
    semitonesLabel,
    shortBadgeText,
    badgeText: `${shortBadgeText} | ${semitonesLabel}`,
  };
}
