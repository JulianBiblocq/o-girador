/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useRef, useState } from 'react';
import { useSequencerState } from '../hooks/useSequencerState';
import { audioEngine, channels, masterVolumeNode } from '../hooks/useAudioSync';

import { useSequencerStore } from '../stores/useSequencerStore';

export interface CustomDialogState {
  type: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onResolve: (value: any) => void;
}

export type SequencerContextType = ReturnType<typeof useSequencerState> & {
    isPlayingRef: React.MutableRefObject<boolean>;
    currentStepIndexRef: React.MutableRefObject<number>;
    measureCountRef: React.MutableRefObject<number>;
    lastPlayedSignalIdRef: React.MutableRefObject<string | null>;
    setIsPlayingRef: React.MutableRefObject<(val: boolean) => void>;
    // Dialogs
    customDialog: CustomDialogState | null;
    setCustomDialog: React.Dispatch<React.SetStateAction<CustomDialogState | null>>;
    alertAsync: (message: string) => Promise<void>;
    confirmAsync: (message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
    promptAsync: (message: string, defaultValue?: string) => Promise<string | null>;
  };

const SequencerContext = createContext<SequencerContextType | undefined>(undefined);

export const SequencerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sequencerState = useSequencerState();
  const totalMeasures = useSequencerStore(state => state.totalMeasures);

  // Shared audio and transport Refs to resolve hook circular dependency
  const isPlayingRef = useRef<boolean>(false);
  const measureCountRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(-1);
  const lastPlayedSignalIdRef = useRef<string | null>(null);
  const setIsPlayingRef = useRef<(val: boolean) => void>(() => {});

  // Global custom dialog overlay state
  const [customDialog, setCustomDialog] = useState<CustomDialogState | null>(null);

  const alertAsync = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'alert', message, onResolve: resolve });
    });
  };

  const confirmAsync = (message: string, confirmLabel?: string, cancelLabel?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'confirm', message, confirmLabel, cancelLabel, onResolve: resolve });
    });
  };

  const promptAsync = (message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'prompt', message, defaultValue, onResolve: resolve });
    });
  };

  const value: SequencerContextType = {
    ...sequencerState,
    isPlayingRef,
    currentStepIndexRef,
    measureCountRef,
    lastPlayedSignalIdRef,
    setIsPlayingRef,
    customDialog,
    setCustomDialog,
    alertAsync,
    confirmAsync,
    promptAsync,
  };

  return (
    <SequencerContext.Provider value={value}>
      {children}
    </SequencerContext.Provider>
  );
};

export const useSequencer = (): SequencerContextType => {
  const context = useContext(SequencerContext);
  if (!context) {
    throw new Error('useSequencer must be used within a SequencerProvider');
  }
  return context;
};
