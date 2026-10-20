import React from 'react';
import { CompactPatternRenderer } from '../CompactPatternRenderer';
import type { TrackGroup as Track, Pattern } from '../../types';
import { useSequencer } from '../../contexts/SequencerContext';

interface TrackMixerPatternPreviewProps {
  pattern: Pattern;
  inst: any;
  track: Track;
  tracks: Track[];
  isLeftHanded: boolean;
  registerStepRef: (stepIdx: number, el: HTMLInputElement | null) => void;
  handleStepClick: (e: React.MouseEvent | React.TouchEvent, stepIdx: number, val: string | number | [string, string]) => void;
}

export const TrackMixerPatternPreview: React.FC<TrackMixerPatternPreviewProps> = ({
  pattern,
  inst,
  track,
  tracks,
  isLeftHanded,
  registerStepRef,
  handleStepClick,
}) => {
  const { handleTrackStepValueChange } = useSequencer();

  return (
    <div className="mt-2 w-full select-none relative z-[2]">
      <CompactPatternRenderer
        pattern={pattern}
        inst={inst}
        isLeftHanded={isLeftHanded}
        isEditable={true}
        isFluid={true}
        className="w-full mb-0"
        isLinkFolder={track.isLinkFolder}
        tracks={tracks}
        trackId={String(track.id)}
        readOnly={false}
        registerStepRef={registerStepRef}
        onStepClick={handleStepClick}
        onStepValueChange={(stepIdx, val) => {
          handleTrackStepValueChange(track.id, pattern.id, stepIdx, val);
        }}
      />
    </div>
  );
};
