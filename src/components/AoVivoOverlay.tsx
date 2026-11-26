import React, { useRef, useSyncExternalStore } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getIsAoVivoLabOpen, subscribeAoVivoLabOpen } from '../audio/animations/aoVivoConfigStorage';
import { AoVivoOverlayInner } from './AoVivo/AoVivoOverlayInner';

export const AoVivoOverlay: React.FC = () => {
  const isEco = useSequencerStore((state) => state.isEcoMode);
  const isPlaying = useSequencerStore((state) => state.isPlaying);
  const activeAoVivoTrackId = useSequencerStore((state) => state.activeAoVivoTrackId);
  const isLabOpen = useSyncExternalStore(subscribeAoVivoLabOpen, getIsAoVivoLabOpen);

  // Hystérésis stricte pendant la lecture : interdit tout démontage/remontage cyclique en plein jeu.
  const lockedEcoDuringPlayRef = useRef(isEco);
  if (!isPlaying) {
    lockedEcoDuringPlayRef.current = isEco;
  }
  const effectiveEco = isPlaying ? lockedEcoDuringPlayRef.current : isEco;

  if ((effectiveEco && !isLabOpen) || (activeAoVivoTrackId === null && !isLabOpen)) {
    return null;
  }

  return <AoVivoOverlayInner activeAoVivoTrackId={activeAoVivoTrackId} />;
};
