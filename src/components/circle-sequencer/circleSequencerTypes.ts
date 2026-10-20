/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrackGroup,
  Language,
  HitTriggerPool,
  TimeSignature,
  SongSection,
  SongMarker,
  CloudRhythmSignal
} from '../../types';

export interface CircleSequencerProps {
  isActive?: boolean;
  lang?: Language;
  isLeftHanded?: boolean;
  tracks?: TrackGroup[];
  isPlaying?: boolean;
  currentMeasure?: number;
  maxTicks?: number;
  timeSig?: TimeSignature;
  onTogglePlay?: () => void;
  onStepChange?: (trackId: number, patternId: number, stepIdx: number, newState: string | number | [string, string], lyric?: string, note?: string) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
  ) => void;
  langPromptVoiceText?: string;
  isMetroOn?: boolean;
  activeCircleIdByInst?: { [instIdx: number]: number | null };
  totalMeasures?: number;
  activePatternIdByTrack?: Record<number, number | null>;
  hitTriggersRef?: React.MutableRefObject<HitTriggerPool>;
  bpm?: number;
  measureBpms?: number[];
  measureVols?: number[];
  isMobile?: boolean;
  onNavigateMeasure?: (measureIdx: number) => void;
  activeSignal?: { id: string; name: string; image: string } | null;
  soloPatternPlayId?: number | null;
  measureSignals?: (string | null)[];
  rhythmSignals?: { id: string; name: string; image: string }[];
  mestreSignals?: CloudRhythmSignal[];
  songSections?: SongSection[];
  songMarkers?: SongMarker[];
  circleId?: number;
  measureIndex?: number;
  trackId?: number;
  rodaTrackOrder?: number[];
}

export interface SyllableItem {
  step: number;
  cleanText: string;
  hasSpace: boolean;
  note?: string;
}

export interface WordItem {
  startStep: number;
  endStep: number;
  fullWord: string;
  syllables: SyllableItem[];
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
}

export interface LivePlaybackState {
  step: number;
  measure: number;
  maxTicks: number;
  ratio: number;
  iteration: number;
  time: number;
  measureStartTime?: number;
  measureDuration?: number;
  isPreRoll?: boolean;
}

export interface OverlayCacheState {
  opacity: string;
  bgColor: string;
  imgDisplay: string;
  imgSrc: string;
  tintDisplay: string;
  color: string;
  textShadow: string;
  fontSize: string;
}

export interface ThemeColors {
  themeBg: string;
  themeText: string;
  themeBorder: string;
  themeWood: string;
}

