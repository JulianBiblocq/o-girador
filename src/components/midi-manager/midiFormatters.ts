import { TransportMapping } from '../../stores/useMidiStore';

export const midiNoteToName = (note: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${notes[note % 12]}${octave}`;
};

export const formatMidiKey = (keyNum: number): string => {
  if (keyNum >= 1000) {
    return `CC ${keyNum - 1000}`;
  }
  return `Note ${keyNum} (${midiNoteToName(keyNum)})`;
};

export const formatTransportMapping = (mapping: TransportMapping): string => {
  if (mapping.type === 'cc') {
    return `CC ${mapping.number}`;
  }
  return `Note ${mapping.number} (${midiNoteToName(mapping.number)})`;
};
