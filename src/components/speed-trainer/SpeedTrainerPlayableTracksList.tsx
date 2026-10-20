import React from 'react';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

interface SpeedTrainerPlayableTracksListProps {
  lang: string;
  t: (key: string) => string;
  playableTracks: TrackGroup[];
  selectedTrackId: number | null;
  setSelectedTrackId: (id: number | null) => void;
  tocarJuntoActive: boolean;
  tocarJuntoTrackId: number | null;
}

export const SpeedTrainerPlayableTracksList: React.FC<SpeedTrainerPlayableTracksListProps> = ({
  lang,
  t,
  playableTracks,
  selectedTrackId,
  setSelectedTrackId,
  tocarJuntoActive,
  tocarJuntoTrackId,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a]">
        {lang === 'fr' ? '1. Choisissez votre pupitre :' : '1. Escolha seu naipe :'}
      </label>
      {playableTracks.length === 0 ? (
        <div className="p-3 bg-black/5 text-xs italic text-center text-black/60 border border-black/20">
          {t('tocarJuntoNoTracks')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {playableTracks.map((track) => {
            const inst = instrumentsConfig[track.instrumentIdx];
            const name = track.customName || inst?.name || `Track ${track.id}`;
            const isSelected = selectedTrackId === track.id;
            const isCurrentActive = tocarJuntoActive && tocarJuntoTrackId === track.id;

            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setSelectedTrackId(track.id)}
                className={`p-2.5 flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer rounded-none text-center relative ${
                  isSelected
                    ? 'border-[#1a1a1a] bg-[#c25e38] text-white shadow-[2px_2px_0px_#1a1a1a]'
                    : 'border-[#1a1a1a]/40 bg-white/70 hover:bg-white text-[#1a1a1a]'
                }`}
              >
                {isCurrentActive && (
                  <span className="absolute top-1 right-1 text-[9px] px-1 py-0.2 bg-white/90 text-[#c25e38] font-bold font-mono uppercase">
                    {lang === 'fr' ? 'Actif' : 'Ativo'}
                  </span>
                )}
                {inst?.iconImg && <img src={inst.iconImg} alt={name} className="w-7 h-7 object-contain" />}
                <span className="font-cactus font-bold text-xs truncate max-w-full">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
