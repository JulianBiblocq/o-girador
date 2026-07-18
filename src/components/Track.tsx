import React from 'react';
import { useNewSequencerStore } from '../stores/useNewSequencerStore';
import { Step } from './Step';

interface TrackProps {
  trackId: string;
}

export const Track: React.FC<TrackProps> = ({ trackId }) => {
  // Abonnement ciblé aux métadonnées de cette piste
  const track = useNewSequencerStore(
    (state) => state.tracks[trackId]
  );

  if (!track) return null;

  const toggleMute = () => {
    useNewSequencerStore.getState().toggleMute(trackId);
  };

  // Tableau fixe d'indices pour les 16 étapes d'une mesure
  const stepsIndices = Array.from({ length: 16 }, (_, i) => i);

  return (
    <div className={`sequencer-track ${track.isMuted ? 'is-muted' : ''}`}>
      <div className="track-info">
        <span className="track-name">{track.name}</span>
        <button
          type="button"
          onClick={toggleMute}
          className={`track-mute-btn ${track.isMuted ? 'is-active' : ''}`}
        >
          {track.isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>

      {/* Grid de 8 colonnes max pour une ergonomie mobile-first sans défilement horizontal */}
      <div className="track-steps-grid">
        {stepsIndices.map((index) => (
          <Step key={index} trackId={trackId} stepIndex={index} />
        ))}
      </div>
    </div>
  );
};
