import React from 'react';
import { MasterEffectsActiveState } from '../../stores/useSequencerStore';

export type StudioRackModuleId = 'reverb' | 'saturation' | 'compressor' | 'eq';

export interface MixerMasterEffectsProps {
  t: (key: string) => string;
  lang: string;
  isMobile?: boolean;
  isPracticeMode?: boolean;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  masterEffectsActive: MasterEffectsActiveState;
  onToggleEffect: (effect: keyof MasterEffectsActiveState) => void;
  onOpenStudioRack?: (module: StudioRackModuleId) => void;
  grMeterRef?: React.RefObject<HTMLDivElement | null>;
}
