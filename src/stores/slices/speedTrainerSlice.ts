/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import type { SequencerStore } from '../useSequencerStore';
import { SpeedTrainerSlice } from '../../types/speedTrainer.types';
import {
  calculateSpeedTrainerOpenConfig,
  buildSpeedTrainerBackup,
} from '../helpers/speedTrainerModalHelper';

export const createSpeedTrainerSlice: StateCreator<SequencerStore, [], [], SpeedTrainerSlice> = (set, get) => ({
  isSpeedTrainerOpen: false,
  isSpeedTrainerActive: false,
  hasCustomSpeedTrainerConfig: false,
  speedTrainerConfig: {
    startMeasure: 0,
    endMeasure: 1,
    startBpm: 63,
    targetBpm: 83,
    bpmStep: 2,
    loopInterval: 1,
  },
  speedTrainerBackup: null,
  speedTrainerTourCount: 0,
  speedTrainerCurrentBpm: 83,
  speedTrainerCountdown: null,
  activeTrainingSession: null,

  openSpeedTrainerModal: () => {
    const config = calculateSpeedTrainerOpenConfig(get());
    set({
      isSpeedTrainerOpen: true,
      speedTrainerConfig: config,
    });
  },

  closeSpeedTrainerModal: () => set({ isSpeedTrainerOpen: false }),

  setSpeedTrainerConfig: (config) => set({
    speedTrainerConfig: config,
    hasCustomSpeedTrainerConfig: true,
  }),

  resetSpeedTrainerConfig: () => set({
    hasCustomSpeedTrainerConfig: false,
  }),

  startSpeedTrainer: (config) => {
    const backup = buildSpeedTrainerBackup(get());
    set({
      speedTrainerBackup: backup,
      speedTrainerConfig: config,
      hasCustomSpeedTrainerConfig: true,
      isSpeedTrainerActive: true,
      speedTrainerTourCount: 0,
      speedTrainerCurrentBpm: config.startBpm,
      speedTrainerCountdown: null,
      loopStartMeasure: config.startMeasure,
      loopEndMeasure: config.endMeasure,
      isLoopRegionActive: true,
      loopMode: 'infinite',
      isSpeedTrainerOpen: false,
    });
  },

  stopSpeedTrainer: () => {
    const state = get();
    const backup = state.speedTrainerBackup;
    if (backup) {
      set({
        bpm: backup.originalBpm,
        loopMode: backup.originalLoopMode,
        loopStartMeasure: backup.originalLoopStart,
        loopEndMeasure: backup.originalLoopEnd,
        isLoopRegionActive: backup.originalIsLoopActive,
        isSpeedTrainerActive: false,
        speedTrainerBackup: null,
        speedTrainerTourCount: 0,
        speedTrainerCountdown: null,
      });
    } else {
      set({
        isSpeedTrainerActive: false,
        speedTrainerTourCount: 0,
        speedTrainerCountdown: null,
      });
    }
  },

  setSpeedTrainerTourCount: (updater) => set(state => ({
    speedTrainerTourCount: typeof updater === 'function' ? updater(state.speedTrainerTourCount) : updater
  })),

  setSpeedTrainerCurrentBpm: (updater) => set(state => ({
    speedTrainerCurrentBpm: typeof updater === 'function' ? updater(state.speedTrainerCurrentBpm) : updater
  })),

  setSpeedTrainerCountdown: (count) => set({ speedTrainerCountdown: count }),
  setActiveTrainingSession: (session) => set({ activeTrainingSession: session }),
});
