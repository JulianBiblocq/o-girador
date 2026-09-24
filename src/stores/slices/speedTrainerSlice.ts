/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import type { SequencerStore } from '../useSequencerStore';
import { SpeedTrainerSlice, SpeedTrainerBackup } from '../../types/speedTrainer.types';

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
    const state = get();

    // If an active challenge/training session is set, prioritize its configuration
    if (state.activeTrainingSession) {
      const session = state.activeTrainingSession;
      const maxM = Math.max(0, state.totalMeasures - 1);
      const clampedStart = Math.min(state.speedTrainerConfig?.startMeasure ?? 0, maxM);
      const clampedEnd = Math.min(Math.max(clampedStart, state.speedTrainerConfig?.endMeasure ?? 1), maxM);

      set({
        isSpeedTrainerOpen: true,
        speedTrainerConfig: {
          ...state.speedTrainerConfig,
          startMeasure: clampedStart,
          endMeasure: clampedEnd,
          startBpm: session.startBpm,
          targetBpm: session.targetBpm,
          consolidationLaps: session.consolidationLaps,
          trainingId: session.trainingId,
          stageIndex: session.stageIndex,
          stageTitle: session.title,
        },
      });
      return;
    }

    // If the user already configured the trainer for this piece, preserve their settings
    if (state.hasCustomSpeedTrainerConfig && state.speedTrainerConfig) {
      const maxM = Math.max(0, state.totalMeasures - 1);
      const clampedStart = Math.min(state.speedTrainerConfig.startMeasure, maxM);
      const clampedEnd = Math.min(Math.max(clampedStart, state.speedTrainerConfig.endMeasure), maxM);

      set({
        isSpeedTrainerOpen: true,
        speedTrainerConfig: {
          ...state.speedTrainerConfig,
          startMeasure: clampedStart,
          endMeasure: clampedEnd,
        },
      });
      return;
    }

    // Default initialization based on current piece
    const targetBpm = state.bpm || 83;
    const startBpm = Math.max(40, targetBpm - 20);

    let startMeasure = 0;
    let endMeasure = Math.min(1, Math.max(0, state.totalMeasures - 1));

    if (state.isLoopRegionActive && state.loopStartMeasure !== null && state.loopEndMeasure !== null) {
      startMeasure = Math.min(state.loopStartMeasure, state.loopEndMeasure);
      endMeasure = Math.max(state.loopStartMeasure, state.loopEndMeasure);
    } else {
      startMeasure = state.currentMeasure || 0;
      endMeasure = Math.min(startMeasure + 1, Math.max(0, state.totalMeasures - 1));
    }

    set({
      isSpeedTrainerOpen: true,
      speedTrainerConfig: {
        startMeasure,
        endMeasure,
        startBpm,
        targetBpm,
        bpmStep: state.speedTrainerConfig?.bpmStep || 2,
        loopInterval: state.speedTrainerConfig?.loopInterval || 1,
      },
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
    const state = get();
    const backup: SpeedTrainerBackup = {
      originalBpm: state.bpm,
      originalLoopMode: state.loopMode,
      originalLoopStart: state.loopStartMeasure,
      originalLoopEnd: state.loopEndMeasure,
      originalIsLoopActive: state.isLoopRegionActive,
    };

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
