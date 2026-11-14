/**
 * O Girador - Instrument Audio Configuration Types (< 35 lignes)
 */

export interface StrokeMapping {
  symbol: string;         // Unique note symbol matching sequencer values (e.g. 'D', 'A', 'd')
  keys: string[];         // Keyboard keys that trigger this stroke
  files: string[];        // File paths for round-robin sample selection
  caseSensitive: boolean; // Whether keys are case sensitive
  isBarulho?: boolean;    // If true, plays as a loop on keydown and stops on keyup
  baseGain?: number;      // Optional nominal gain trim (defaults to 1.0)
}

export interface InstrumentAudioConfig {
  id: string;
  name: string;
  uiOrder: string[];              // Order in which symbols are displayed in UI legend
  strokes: StrokeMapping[];
  leftHandedSupport: boolean;
  macroPitch?: number;            // Pitch multiplier (1.0 or 0 = 0 semitones / native studio pitch)
  calibratedStudioBank?: boolean; // True when multi-sampled in studio (unity gain 1.0 at nominal step volume)
}
