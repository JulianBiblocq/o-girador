
import React from 'react';
import { Language } from '../../../types';

export interface InstrumentEditorHeaderProps {
  inst: { mixerBg?: string; colors?: { text?: string } };
  trackDisplayName: string;
  isVocalContext: boolean;
  puxTrack?: any;
  coroTrack?: any;
  isCoroActive?: boolean;
  onSwitchVocalTrack: (targetTrack: any) => void;
  visibleTrackIds: number[];
  activeTrackId: number;
  onSelectTrack: (trackId: number) => void;
  onContextMenu: (trackId: number, x: number, y: number) => void;
  addBtnRef: React.RefObject<HTMLButtonElement | null>;
  isAddPickerOpen: boolean;
  onToggleAddPicker: () => void;
  targetBalancoTrack: any;
  effectiveEditTrackId: number;
  balancoPresets: Array<{ id: string; name: string }>;
  handleTrackBalancoChange: (trackId: number, presetId: string, amount: number) => void;
  isPatternRecording: boolean;
  togglePatternRecording: () => void;
  isMute: boolean;
  isSolo: boolean;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onClose: () => void;
  isClosing?: boolean;
  lang: Language;
  selectedPatternId?: number;
  activePatternId?: number;
  onToggleSoloLoop?: () => void;
  isSoloLoopPlaying?: boolean;
}
