import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { AoVivoOverlayInner } from './AoVivo/AoVivoOverlayInner';

export const AoVivoOverlay: React.FC = () => {
  const isEco = useSequencerStore((state) => state.isEcoMode);
  const activeAoVivoTrackId = useSequencerStore((state) => state.activeAoVivoTrackId);

  // If eco mode is enabled or no track is active for Ao Vivo,
  // return null immediately, avoiding any animation hook execution (Zero Cost basis).
  if (isEco || activeAoVivoTrackId === null) {
    return null;
  }

  return <AoVivoOverlayInner activeAoVivoTrackId={activeAoVivoTrackId} />;
};
