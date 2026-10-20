/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Factory Preset: Vou Vadiar (Carnaval)
 */

import { Preset } from '../../../types';

export const vouVadiarPreset: Preset = {
  bpm: 83,
  timeSig: "4/4",
  version: 2,
  audioScaleVersion: 2,
  circles: [
    {
      id: 1,
      steps: 16,
      repeats: 1,
      activeSteps: ["e", "D", 0, "d", "E", 0, "D", 0, "e", "D", 0, "d", "E", 0, 0, 0],
      instrumentIdx: 0,
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
      volumeVal: 68
    },
    {
      id: 5,
      steps: 16,
      repeats: 1,
      activeSteps: [0, "G", 0, 0, "G", 0, "G", 0, 0, "G", 0, 0, "G", 0, "G", 0],
      instrumentIdx: 5,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 47
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
    },
    {
      id: 8,
      steps: 16,
      repeats: 1,
      activeSteps: ["P", 0, "P", 0, "P", 0, "P", 0, 0, "C", 0, "C", "C", 0, 0, 0],
      instrumentIdx: 8,
      lyrics: ["Vou", "", "va-", "", "di-", "", "ar", "", "Car-", "Car-", "na-", "na-", "val", "", "!", ""],
      notes: ["C4", "", "C4", "", "D4", "", "D4", "", "", "E4", "", "E4", "F4", "", "", ""],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75
    },
    {
      id: 1779,
      steps: 16,
      repeats: 1,
      activeSteps: ["P", 0, "P", 0, "P", 0, "P", 0, 0, "C", 0, "C", "C", 0, "C", 0],
      instrumentIdx: 8,
      lyrics: ["Vou", "", "Pra", "", "Ba-", "", "hi-", "", "", "a", "", "Brin-", "car", "", "Eu", ""],
      notes: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75
    }
  ]
};
