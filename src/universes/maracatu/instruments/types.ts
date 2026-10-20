/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Instrument Audio Configuration Types
 */

export interface StrokeMapping {
  symbol: string;         // The unique note symbol matching sequencer values (e.g. 'D', 'rd', 'GRV')
  keys: string[];         // Keyboard keys that trigger this stroke
  files: string[];        // File paths for round-robin sample selection
  caseSensitive: boolean; // Whether keys are case sensitive
  isBarulho?: boolean;    // If true, the stroke plays as a loop on keydown and stops on keyup
}

export interface InstrumentAudioConfig {
  id: string;
  name: string;
  uiOrder: string[];      // Order in which symbols are displayed in UI legend
  strokes: StrokeMapping[];
  leftHandedSupport: boolean;
  macroPitch?: number;    // Pitch multiplier (e.g. Marcante 0.85, Repique 1.15)
}
