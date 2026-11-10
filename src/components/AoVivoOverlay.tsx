import React, { useSyncExternalStore } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getIsAoVivoLabOpen, subscribeAoVivoLabOpen } from '../audio/animations/aoVivoConfigStorage';
import { AoVivoOverlayInner } from './AoVivo/AoVivoOverlayInner';

export const AoVivoOverlay: React.FC = () => {
  const isEco = useSequencerStore((state) => state.isEcoMode);
  const activeAoVivoTrackId = useSequencerStore((state) => state.activeAoVivoTrackId);
  const isLabOpen = useSyncExternalStore(subscribeAoVivoLabOpen, getIsAoVivoLabOpen);

  // Palier 1 Eco : l'animation decorative Ao Vivo est coupee (Zero Cost basis), sauf si
  // l'utilisateur ouvre explicitement le Lab Ao Vivo (le Mode Eco n'est jamais force a Off).
  if ((isEco && !isLabOpen) || activeAoVivoTrackId === null) {
    return null;
  }

  return <AoVivoOverlayInner activeAoVivoTrackId={activeAoVivoTrackId} />;
};
