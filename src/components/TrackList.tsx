import React, { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNewSequencerStore } from '../stores/useNewSequencerStore';
import { playheadVanillaStore } from '../stores/usePlayheadStore';
import { Track } from './Track';

export const TrackList: React.FC = () => {
  // Récupération uniquement du tableau d'IDs de pistes en enveloppant le sélecteur avec useShallow
  const trackIds = useNewSequencerStore(
    useShallow((state) => state.trackIds)
  );

  // Référence pour mémoriser le dernier index actif afin d'effectuer un nettoyage ciblé
  const lastActiveStepRef = useRef<number>(-1);

  useEffect(() => {
    // Écouteur Vanilla hors du cycle de rendu React
    const unsubscribe = playheadVanillaStore.subscribe((state) => {
      const activeIdx = state.currentStepIndex;
      const lastIdx = lastActiveStepRef.current;

      // 1. Suppression de la classe playhead-active sur le pas précédent
      if (lastIdx !== -1 && lastIdx !== activeIdx) {
        const prevActiveElements = document.querySelectorAll(
          `.sequencer-step[data-step-index="${lastIdx}"]`
        );
        prevActiveElements.forEach((el) => {
          el.classList.remove('playhead-active');
        });
      }

      // 2. Ajout de la classe playhead-active sur le pas courant
      const currentActiveElements = document.querySelectorAll(
        `.sequencer-step[data-step-index="${activeIdx}"]`
      );
      currentActiveElements.forEach((el) => {
        el.classList.add('playhead-active');
      });

      lastActiveStepRef.current = activeIdx;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="sequencer-track-list">
      {trackIds.map((trackId) => (
        <Track key={trackId} trackId={trackId} />
      ))}
    </div>
  );
};
