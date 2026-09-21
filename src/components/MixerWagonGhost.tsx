/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrackGroup } from '../types';
import { instrumentsConfig } from '../data';
import { getBusColor, getTopParentBusId, getTrackDisplayName } from '../utils/colorHelpers';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';
import { useSequencerStore } from '../stores/useSequencerStore';

interface MixerWagonGhostProps {
  tracks: TrackGroup[];
  lang?: string;
}

export const MixerWagonGhost: React.FC<MixerWagonGhostProps> = ({
  tracks,
  lang = 'fr',
}) => {
  if (!tracks || tracks.length === 0) return null;

  const tracksMeta = useSequencerStore.getState().tracks;
  const topBusId = getTopParentBusId(tracks[0], tracksMeta) || String(tracks[0].id);
  const busColor = getBusColor(topBusId, tracksMeta, instrumentsConfig) || 'var(--cordel-wood)';
  const isMultiple = tracks.length > 1;

  return (
    <div
      className="flex items-stretch select-none pointer-events-none cordel-master-strip overflow-hidden rounded-sm"
      style={{
        transform: 'scale(1.02) rotate(-1deg)',
        transformOrigin: 'center center',
        boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.85), 0 20px 30px rgba(0, 0, 0, 0.35)',
        border: `3px solid ${busColor}`,
        backgroundColor: 'var(--cordel-bg)',
      }}
    >
      {tracks.map((track, idx) => {
        const inst = instrumentsConfig[track.instrumentIdx];
        const instLabel = useNomenclatureStore.getState().getInstrumentLabel(track);
        const displayName = getTrackDisplayName(track, tracksMeta) || instLabel;
        const volVal = track.volumeVal !== undefined ? track.volumeVal : 80;
        const panVal = track.panVal ?? track.pan ?? 0;
        const faderColor = inst?.color || busColor;

        // Position calculée du curseur de fader (course ~90px)
        const travel = 90;
        const deltaY = ((100 - volVal) / 100) * travel;

        return (
          <div
            key={track.id}
            className={`w-[115px] h-[500px] flex flex-col justify-between p-2 shrink-0 relative bg-[var(--cordel-bg)] text-[var(--cordel-text)] ${
              idx < tracks.length - 1 ? 'border-r-2 border-dashed border-[var(--cordel-border)]/30' : ''
            }`}
          >
            {/* 1. Header de tranche */}
            <div className="flex flex-col gap-1 border-b-2 border-[var(--cordel-border)] pb-2">
              <div className="flex items-center justify-between">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-[var(--cordel-border)]"
                  style={{ backgroundColor: faderColor }}
                />
                <span className="text-[10px] font-mono font-bold opacity-60">
                  #{idx + 1}
                </span>
              </div>
              <span className="font-cactus text-xs font-bold truncate uppercase tracking-wide">
                {displayName}
              </span>
              <span className="text-[9px] font-sans opacity-60 truncate">
                {inst?.name || 'Instrument'}
              </span>
            </div>

            {/* 2. Section centrale : Potentiomètre Panoramique factice */}
            <div className="flex flex-col items-center gap-1 my-auto opacity-75">
              <span className="text-[9px] font-mono uppercase opacity-70">
                Pan {panVal > 0 ? `R${panVal}` : panVal < 0 ? `L${Math.abs(panVal)}` : 'C'}
              </span>
              <div className="w-8 h-8 rounded-full border-2 border-[var(--cordel-border)] flex items-center justify-center relative bg-[var(--cordel-bg)]">
                <div
                  className="w-1 h-3 bg-[var(--cordel-text)] rounded-full origin-bottom"
                  style={{ transform: `rotate(${panVal * 1.35}deg)` }}
                />
              </div>
            </div>

            {/* 3. Section Fader de volume factice */}
            <div className="flex flex-col items-center gap-1 border-t-2 border-[var(--cordel-border)] pt-3 pb-1">
              <div className="relative w-8 h-[120px] flex justify-center items-center">
                {/* Rail de fader */}
                <div className="w-1.5 h-full bg-[var(--cordel-border)]/30 rounded-full" />
                {/* Curseur de fader */}
                <div
                  className="absolute w-7 h-5 rounded-sm border-2 border-[var(--cordel-border)] shadow-md flex items-center justify-center"
                  style={{
                    backgroundColor: faderColor,
                    top: '10px',
                    transform: `translateY(${deltaY}px)`,
                  }}
                >
                  <div className="w-4 h-0.5 bg-[var(--cordel-bg)]" />
                </div>
              </div>

              {/* Affichage numérique volume */}
              <span className="text-[10px] font-mono font-bold opacity-80 mt-1">
                {Math.round(volVal)}%
              </span>
            </div>

            {/* Badge Wagon en bas */}
            {isMultiple && (
              <div className="text-[8px] font-cactus uppercase text-center opacity-60 tracking-wider">
                {idx === 0 ? '◀ TÊTE' : idx === tracks.length - 1 ? 'QUEUE ▶' : 'WAGON'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
