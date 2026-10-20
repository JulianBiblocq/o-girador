/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface VoicePianoDockProps {
  trackId: number;
  patternId: number;
  selectedStepIdx: number | null;
  setSelectedStepIdx: React.Dispatch<React.SetStateAction<number | null>>;
  selectedStepIsPreRoll: boolean;
  setSelectedStepIsPreRoll: React.Dispatch<React.SetStateAction<boolean>>;
  lang: string;
  patternSteps?: number;
}

export interface WhiteKeyDef {
  note: string;
  octave: number;
  name: string;
  hasSharp: boolean;
  sharpNote?: string;
  isC: boolean;
}

export const WHITE_KEYS: WhiteKeyDef[] = [
  // Octave 3
  { note: 'C3', octave: 3, name: 'C', hasSharp: true, sharpNote: 'C#3', isC: true },
  { note: 'D3', octave: 3, name: 'D', hasSharp: true, sharpNote: 'D#3', isC: false },
  { note: 'E3', octave: 3, name: 'E', hasSharp: false, isC: false },
  { note: 'F3', octave: 3, name: 'F', hasSharp: true, sharpNote: 'F#3', isC: false },
  { note: 'G3', octave: 3, name: 'G', hasSharp: true, sharpNote: 'G#3', isC: false },
  { note: 'A3', octave: 3, name: 'A', hasSharp: true, sharpNote: 'A#3', isC: false },
  { note: 'B3', octave: 3, name: 'B', hasSharp: false, isC: false },
  // Octave 4
  { note: 'C4', octave: 4, name: 'C', hasSharp: true, sharpNote: 'C#4', isC: true },
  { note: 'D4', octave: 4, name: 'D', hasSharp: true, sharpNote: 'D#4', isC: false },
  { note: 'E4', octave: 4, name: 'E', hasSharp: false, isC: false },
  { note: 'F4', octave: 4, name: 'F', hasSharp: true, sharpNote: 'F#4', isC: false },
  { note: 'G4', octave: 4, name: 'G', hasSharp: true, sharpNote: 'G#4', isC: false },
  { note: 'A4', octave: 4, name: 'A', hasSharp: true, sharpNote: 'A#4', isC: false },
  { note: 'B4', octave: 4, name: 'B', hasSharp: false, isC: false },
  // Octave 5
  { note: 'C5', octave: 5, name: 'C', hasSharp: true, sharpNote: 'C#5', isC: true },
  { note: 'D5', octave: 5, name: 'D', hasSharp: true, sharpNote: 'D#5', isC: false },
  { note: 'E5', octave: 5, name: 'E', hasSharp: false, isC: false },
  { note: 'F5', octave: 5, name: 'F', hasSharp: true, sharpNote: 'F#5', isC: false },
  { note: 'G5', octave: 5, name: 'G', hasSharp: true, sharpNote: 'G#5', isC: false },
  { note: 'A5', octave: 5, name: 'A', hasSharp: true, sharpNote: 'A#5', isC: false },
  { note: 'B5', octave: 5, name: 'B', hasSharp: false, isC: false },
  // Sommet : C6
  { note: 'C6', octave: 6, name: 'C', hasSharp: false, isC: true },
];
