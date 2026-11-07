/**
 * drumPitchToNote.ts — Calculateur acoustique de Note Musicale (FR/PT + notation internationale)
 * et de Fréquence Fondamentale (Hz) pour les 6 tambours accordables (< 60 lignes).
 */

export interface DrumPitchNoteInfo {
  noteLabel: string;
  intlNote: string;
  frequencyHz: number;
  formattedHz: string;
  semitonesLabel: string;
  badgeText: string;
}

const DRUM_NOMINAL_BASES: Record<string, { baseMidi: number; baseHz: number }> = {
  marcante: { baseMidi: 35, baseHz: 61.735 }, // Si1 (B1, -3 st vs Meião)
  meiao: { baseMidi: 38, baseHz: 73.416 },    // Ré2 (D2, 0 st)
  repique: { baseMidi: 42, baseHz: 92.499 },  // Fa#2 (F#2, +4 st vs Meião)
  caixa: { baseMidi: 54, baseHz: 184.997 },   // Fa#3 (F#3)
  tarol: { baseMidi: 57, baseHz: 220.0 },     // La3 (A3)
  timbal: { baseMidi: 59, baseHz: 246.942 },  // Si3 (B3, frappe A Aberto)
};

const NOTES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTES_PT = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
const NOTES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getDrumPitchNoteInfo(
  instrumentId: string,
  userTuningSemitones: number = 0,
  lang: string = 'fr'
): DrumPitchNoteInfo {
  const base = DRUM_NOMINAL_BASES[instrumentId] || DRUM_NOMINAL_BASES.meiao;
  const st = Number(userTuningSemitones) || 0;
  const exactMidi = base.baseMidi + st;
  const roundedMidi = Math.round(exactMidi);
  const noteIdx = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;

  const halfSuffix = Math.abs(exactMidi - roundedMidi) >= 0.25 ? '+' : '';
  const solfege = (lang === 'pt' ? NOTES_PT : NOTES_FR)[noteIdx];
  const noteLabel = `${solfege}${octave}${halfSuffix}`;
  const intlNote = `${NOTES_INTL[noteIdx]}${octave}${halfSuffix}`;

  const frequencyHz = Math.round(base.baseHz * Math.pow(2, st / 12) * 10) / 10;
  const formattedHz = Number.isInteger(frequencyHz) ? `${frequencyHz} Hz` : `${frequencyHz.toFixed(1)} Hz`;
  const semitonesLabel = `${st > 0 ? `+${st}` : st} st`;

  return {
    noteLabel,
    intlNote,
    frequencyHz,
    formattedHz,
    semitonesLabel,
    badgeText: `${noteLabel} (${intlNote}) • ${formattedHz} | ${semitonesLabel}`,
  };
}
