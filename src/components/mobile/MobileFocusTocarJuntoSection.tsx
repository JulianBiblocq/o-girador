/**
 * Section 'Tocar Junto' pour MobileFocusPopover (< 55 lignes).
 */

import React from 'react';

interface Props {
  lang: 'fr' | 'pt';
  vocab: { restOfEnsemble: string };
  hasFamily: boolean;
  tocarJuntoIsMuted: boolean;
  setTocarJuntoIsMuted: (v: boolean) => void;
  tocarJuntoMuteScope: 'track' | 'family';
  setTocarJuntoMuteScope: (s: 'track' | 'family') => void;
  isRestMuted: boolean;
  onToggleRestMuted: () => void;
}

export const MobileFocusTocarJuntoSection: React.FC<Props> = ({
  lang,
  vocab,
  hasFamily,
  tocarJuntoIsMuted,
  setTocarJuntoIsMuted,
  tocarJuntoMuteScope,
  setTocarJuntoMuteScope,
  isRestMuted,
  onToggleRestMuted,
}) => {
  return (
    <div className="pt-1 border-t border-[#1a1a1a]/30">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 mb-1">
        {lang === 'pt' ? '3. Tocar junto' : '3. Jouer par-dessus'}
      </div>
      <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 text-[11px]">
        <input
          type="checkbox"
          checked={tocarJuntoIsMuted}
          onChange={(e) => setTocarJuntoIsMuted(e.target.checked)}
          className="accent-[#1a1a1a] rounded-none"
        />
        <span>{lang === 'pt' ? 'Silenciar meu instrumento para tocar junto' : 'Rendre mon instrument muet pour jouer par-dessus'}</span>
      </label>
      {hasFamily && tocarJuntoIsMuted && (
        <div className="flex gap-1.5 mt-1.5 pl-5">
          <button
            type="button"
            onClick={() => setTocarJuntoMuteScope('track')}
            className={`flex-1 py-1 px-1 text-[10px] font-bold cordel-border-sm cursor-pointer ${tocarJuntoMuteScope === 'track' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a]'}`}
          >
            {lang === 'pt' ? 'Só este instrumento' : 'Cet instrument seul'}
          </button>
          <button
            type="button"
            onClick={() => setTocarJuntoMuteScope('family')}
            className={`flex-1 py-1 px-1 text-[10px] font-bold cordel-border-sm cursor-pointer ${tocarJuntoMuteScope === 'family' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a]'}`}
          >
            {lang === 'pt' ? 'Todo o naipe' : 'Tout le pupitre'}
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 text-[11px] mt-1 pt-1 border-t border-[#1a1a1a]/20">
        <input
          type="checkbox"
          checked={isRestMuted}
          onChange={onToggleRestMuted}
          className="accent-[#1a1a1a] rounded-none"
        />
        <span>{lang === 'pt' ? `Mutar o ${vocab.restOfEnsemble}` : `Couper le son du ${vocab.restOfEnsemble}`}</span>
      </label>
    </div>
  );
};
