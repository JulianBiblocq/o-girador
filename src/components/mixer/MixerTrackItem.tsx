import React from 'react';
import { TrackMeta } from '../../stores/useSequencerStore';
import { MixerChannel } from '../MixerChannel';

interface MixerTrackItemProps {
  track: TrackMeta;
  index: number;
  channelOrdinal: string;
  midiFaderIndex: number | null;
  isUnderMidiControl: boolean;
  isActive: boolean;
  busPosition: 'first' | 'middle' | 'last' | 'none';
  linkPosition: 'first' | 'middle' | 'last' | 'none';
  isThisGroupHovered: boolean;
  dropIndicator: 'left' | 'right' | null;
  wagonSize: number;
  isWagonMember: boolean;
  isDraggingWagon: boolean;
  onOpenDetailEditor: (trackId: number) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  handleCopyPattern: (pattern: any) => void;
  handlePastePattern: (trackId: number, patternId: number) => void;
  copiedPattern: any;
}

export const MixerTrackItem: React.FC<MixerTrackItemProps> = ({
  track, index, channelOrdinal, midiFaderIndex, isUnderMidiControl, isActive,
  busPosition, linkPosition, isThisGroupHovered, dropIndicator, wagonSize,
  isWagonMember, isDraggingWagon, onOpenDetailEditor, onStepTouchStart,
  handleCopyPattern, handlePastePattern, copiedPattern,
}) => {
  return (
    <MixerChannel
      key={track.id}
      trackId={track.id}
      index={index}
      channelOrdinal={channelOrdinal}
      midiFaderIndex={midiFaderIndex}
      isUnderMidiControl={isUnderMidiControl}
      isActive={isActive}
      busPosition={busPosition}
      linkPosition={linkPosition}
      isDragOver={isThisGroupHovered}
      dropIndicator={dropIndicator}
      activeWagonSize={wagonSize}
      isWagonMember={isWagonMember}
      isDraggingWagon={isDraggingWagon}
      onOpenDetailEditor={onOpenDetailEditor}
      onStepTouchStart={onStepTouchStart}
      onCopyPattern={handleCopyPattern}
      onPastePattern={handlePastePattern}
      canPaste={Boolean(copiedPattern)}
    />
  );
};
