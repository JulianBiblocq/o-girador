import React from 'react';
import { useNewSequencerStore } from '../stores/useNewSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { useSequencerController } from '../controllers/useSequencerController';

export const NewTransportBar: React.FC = () => {
  const { start, stop } = useSequencerController();
  
  // Lecture réactive de l'état de lecture
  const isPlaying = useNewSequencerStore((state) => state.isPlaying);
  
  // Lecture réactive des paramètres de tempo et swing
  const bpm = useSequencerSettingsStore((state) => state.bpm);
  const balanco = useSequencerSettingsStore((state) => state.balanco);

  const togglePlayback = async () => {
    if (isPlaying) {
      stop();
    } else {
      await start();
    }
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    if (!isNaN(newBpm)) {
      useSequencerSettingsStore.getState().setBpm(newBpm);
    }
  };

  const handleBalancoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBalanco = parseInt(e.target.value, 10);
    if (!isNaN(newBalanco)) {
      useSequencerSettingsStore.getState().setBalanco(newBalanco);
    }
  };

  return (
    <div className="sequencer-transport-bar">
      {/* Bouton de Lecture */}
      <button
        type="button"
        onClick={togglePlayback}
        className={`transport-play-btn ${isPlaying ? 'is-playing' : ''}`}
      >
        {isPlaying ? '■ Stop' : '▶ Play'}
      </button>

      {/* Slider BPM */}
      <div className="transport-control-group">
        <label htmlFor="bpm-slider" className="transport-label">
          Tempo: <span className="value-display">{bpm} BPM</span>
        </label>
        <input
          id="bpm-slider"
          type="range"
          min="60"
          max="180"
          value={bpm}
          onChange={handleBpmChange}
          className="transport-slider"
        />
      </div>

      {/* Slider Balanço */}
      <div className="transport-control-group">
        <label htmlFor="balanco-slider" className="transport-label">
          Balanço: <span className="value-display">{balanco}%</span>
        </label>
        <input
          id="balanco-slider"
          type="range"
          min="0"
          max="100"
          value={balanco}
          onChange={handleBalancoChange}
          className="transport-slider"
        />
      </div>
    </div>
  );
};
