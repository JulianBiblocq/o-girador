import React from 'react';
import { Pattern } from '../../../types';

export interface BaseChannelStripProps {
  trackId: number;
  index: number;
  onOpenDetailEditor?: (trackId: number) => void;
  isActive?: boolean;
  busPosition?: 'first' | 'middle' | 'last' | 'none';
  linkPosition?: 'first' | 'middle' | 'last' | 'none';
  isDragOver?: boolean;
  dropIndicator?: 'left' | 'right' | null;
  activeWagonSize?: number;
  isWagonMember?: boolean;
  isDraggingWagon?: boolean;
  channelOrdinal?: string;
  midiFaderIndex?: number | null;
  isUnderMidiControl?: boolean;
}

export interface MixerChannelProps extends BaseChannelStripProps {
  onOpenDetailEditor: (trackId: number) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: Pattern) => void;
  onPastePattern?: (trackId: number, patternId: number) => void;
  canPaste?: boolean;
}
