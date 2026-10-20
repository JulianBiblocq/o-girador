import React from 'react';
import { TrackMeta } from '../../stores/useSequencerStore';
import { MixerChannel } from '../MixerChannel';
import { MixerLinkedTrack } from '../MixerLinkedTrack';
import { MixerFolderBus } from '../MixerFolderBus';

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
  track,
  index,
  channelOrdinal,
  midiFaderIndex,
  isUnderMidiControl,
  isActive,
  busPosition,
  linkPosition,
  isThisGroupHovered,
  dropIndicator,
  wagonSize,
  isWagonMember,
  isDraggingWagon,
  onOpenDetailEditor,
  onStepTouchStart,
  handleCopyPattern,
  handlePastePattern,
  copiedPattern,
}) => {
  const commonProps = {
    trackId: track.id,
    index,
    channelOrdinal,
    midiFaderIndex,
    isUnderMidiControl,
    isActive,
    busPosition,
    linkPosition,
    isDragOver: isThisGroupHovered,
    dropIndicator,
    activeWagonSize: wagonSize,
    isWagonMember,
    isDraggingWagon,
  };

  if (track.isBusFolder) {
    if (track.isLinkFolder) {
      return (
        <MixerChannel
          key={track.id}
          {...commonProps}
          onOpenDetailEditor={onOpenDetailEditor}
          onCopyPattern={handleCopyPattern}
          onPastePattern={handlePastePattern}
          canPaste={copiedPattern !== null}
        />
      );
    }
    return <MixerFolderBus key={track.id} {...commonProps} />;
  }

  if (track.linkedToTrackId) {
    return <MixerLinkedTrack key={track.id} {...commonProps} onOpenDetailEditor={onOpenDetailEditor} />;
  }

  return (
    <MixerChannel
      key={track.id}
      {...commonProps}
      onOpenDetailEditor={onOpenDetailEditor}
      onStepTouchStart={onStepTouchStart}
      onCopyPattern={handleCopyPattern}
      onPastePattern={handlePastePattern}
      canPaste={!!copiedPattern}
    />
  );
};
