/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sous-composant Tocar Junto pour le panneau de focus piste (< 55 lignes).
 */

import React from 'react';

interface TrackFocusTocarJuntoSectionProps {
  lang: string;
  hasFamily: boolean;
  tocarJuntoIsMuted: boolean;
  tocarJuntoMuteScope: 'track' | 'family';
  setTocarJuntoIsMuted: (val: boolean) => void;
  setTocarJuntoMuteScope: (scope: 'track' | 'family') => void;
}

export const TrackFocusTocarJuntoSection: React.FC<TrackFocusTocarJuntoSectionProps> = ({
  lang,
  hasFamily,
  tocarJuntoIsMuted,
  tocarJuntoMuteScope,
  setTocarJuntoIsMuted,
  setTocarJuntoMuteScope,
}) => {
  return (
    <div className="pt-1.5 border-t border-[#1a1a1a]/30">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 mb-1.5">
        {lang === 'pt' ? '3. Tocar junto' : '3. Jouer par-dessus'}
      </div>
      <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 text-[11px]">
        <input
          type="checkbox"
          checked={tocarJuntoIsMuted}
          onChange={(e) => setTocarJuntoIsMuted(e.target.checked)}
          className="accent-[#1a1a1a] rounded-none"
        />
        <span>{lang === 'pt' ? 'Mutar meu instrumento para tocar junto' : 'Rendre mon instrument muet pour jouer par-dessus'}</span>
      </label>
      {hasFamily && tocarJuntoIsMuted && (
        <div className="flex gap-1.5 mt-2 pl-5">
          <button
            type="button"
            onClick={() => setTocarJuntoMuteScope('track')}
            className={`flex-1 py-1 px-1.5 text-[10px] font-bold cordel-border-sm cursor-pointer transition-colors ${tocarJuntoMuteScope === 'track' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:opacity-80'}`}
          >{lang === 'pt' ? 'Este instrumento só' : 'Cet instrument seul'}</button>
          <button
            type="button"
            onClick={() => setTocarJuntoMuteScope('family')}
            className={`flex-1 py-1 px-1.5 text-[10px] font-bold cordel-border-sm cursor-pointer transition-colors ${tocarJuntoMuteScope === 'family' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:opacity-80'}`}
          >{lang === 'pt' ? 'Todo o naipe' : 'Tout le pupitre'}</button>
        </div>
      )}
    </div>
  );
};
