import React from 'react';
import { useNewSequencerStore } from '../stores/useNewSequencerStore';
import { useSequencerStore } from '../stores/useSequencerStore';

interface StepProps {
  trackId: string;
  stepIndex: number;
}

export const Step: React.FC<StepProps> = ({ trackId, stepIndex }) => {
  // Sélecteur atomique primitif (string immuable pendant la lecture => 0 re-rendu parasite)
  const lang = useSequencerStore((state) => state.lang);

  // Sélection ciblée : Ce composant ne se re-rend que si SA valeur change.
  const isActive = useNewSequencerStore(
    (state) => state.steps[trackId]?.[stepIndex] ?? false
  );

  const toggleStep = () => {
    useNewSequencerStore.getState().toggleStep(trackId, stepIndex);
  };

  return (
    <button
      type="button"
      onClick={toggleStep}
      data-step-index={stepIndex}
      className={`sequencer-step ${isActive ? 'is-active' : ''}`}
      aria-label={lang === 'fr' ? `Pas ${stepIndex + 1}` : `Passo ${stepIndex + 1}`}
    />
  );
};
