/**
 * O Girador - Audio Engine Type Definitions & Constants
 */

export interface ActiveVoice {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  time: number;
  velocity: number;
  instrumentId: string;
}

export interface ActiveInstrumentData {
  id: string;
  activeStrokes: string[];
}

export interface GainNodeMapping {
  instrumentId: string;
  gainNode: GainNode | null;
  expectedEnd: number;
}

export const ALFAIA_INSTRUMENTS = new Set(['marcante', 'meiao', 'repique']);
export const HUMANIZED_INSTRUMENTS_SET = new Set(['marcante', 'meiao', 'repique', 'caixa', 'tarol']);
export const MAX_POOL_SIZE = 40;
