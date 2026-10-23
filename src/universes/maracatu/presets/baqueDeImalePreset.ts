/**
 * 
 * O Girador - Factory Preset: Baque de Imalê
 */

import { Preset } from '../../../types';

export const baqueDeImalePreset: Preset = {
  bpm: 77,
  timeSig: "4/4",
  version: 2,
  audioScaleVersion: 2,
  circles: [
    {
      id: 1,
      steps: 16,
      repeats: 1,
      activeSteps: ["D", 0, 0, 0, "e", 0, "D", 0, "e", "D", 0, 0, "e", "D", 0, 0],
      instrumentIdx: 0,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75
    },
    {
      id: 2,
      steps: 16,
      repeats: 1,
      activeSteps: ["E", 0, 0, "d", "e", 0, "D", 0, "e", "D", 0, "d", "e", "D", 0, "d"],
      instrumentIdx: 1,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75
    },
    {
      id: 4,
      steps: 16,
      repeats: 1,
      activeSteps: ["D", "D", "e", "D", "D", "e", "D", "e", "D", "D", "e", "D", "D", "e", "D", "e"],
      instrumentIdx: 3,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75
    },
    {
      id: 5,
      steps: 16,
      repeats: 1,
      activeSteps: ["G", 0, "A", 0, "G", 0, "A", 0, "G", "A", 0, "a", "G", 0, "A", 0],
      instrumentIdx: 5,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75
    },
    {
      id: 6,
      steps: 16,
      repeats: 1,
      activeSteps: ["E", 0, "d", "e", "D", 0, "e", "d", "E", 0, "d", "e", "D", 0, "e", "d"],
      instrumentIdx: 6,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75
    }
  ]
};
