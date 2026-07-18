import React from 'react';
import { useNewSequencerStore } from '../stores/useNewSequencerStore';

interface StepProps {
  trackId: string;
  stepIndex: number;
}

export const Step: React.FC<StepProps> = ({ trackId, stepIndex }) => {
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
      aria-label={`Step ${stepIndex + 1}`}
    />
  );
};
