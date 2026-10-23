/**
 * O Girador - Vocal Engine Audio Types & Active Vocal Cache Map
 */

import * as Tone from 'tone';

export interface ActiveVocal {
  mainPlayer: Tone.GrainPlayer | Tone.Player;
  directPlayer?: Tone.Player;
  grainPlayer?: Tone.GrainPlayer;
  mainGain: Tone.Gain;
  currentBuffer: AudioBuffer | null;
  haasNodes?: {
    input: GainNode;
    delay: DelayNode;
    filter: BiquadFilterNode;
    sideGainLeft: GainNode;
    sideGainRight: GainNode;
    merger: ChannelMergerNode;
  };
  chorusPlayers: (Tone.GrainPlayer | Tone.Player)[];
  chorusGains: Tone.Gain[];
  panners: Tone.Panner[];
}

export const activeVocals = new Map<string, ActiveVocal>();
