/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useSequencerStore, getTrackFamilyIds } from '../../stores/useSequencerStore';
import { getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { TrackGroup } from '../../types';

interface TrackFocusDropdownPanelProps {
  tracks: TrackGroup[];
  focusTrackId: number | null;
  onClose: () => void;
  lang?: string;
  position?: { top: number; left: number };
}

export const TrackFocusDropdownPanel: React.FC<TrackFocusDropdownPanelProps> = ({
  tracks,
  focusTrackId,
  onClose,
  lang = 'fr',
  position,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const setFocusTrackId = useSequencerStore((s) => s.setFocusTrackId);
  const isolateBaseOnly = useSequencerStore((s) => s.isolateBaseOnly);
  const setIsolateBaseOnly = useSequencerStore((s) => s.setIsolateBaseOnly);
  const tocarJuntoIsMuted = useSequencerStore((s) => s.tocarJuntoIsMuted);
  const setTocarJuntoIsMuted = useSequencerStore((s) => s.setTocarJuntoIsMuted);
  const tocarJuntoMuteScope = useSequencerStore((s) => s.tocarJuntoMuteScope);
  const setTocarJuntoMuteScope = useSequencerStore((s) => s.setTocarJuntoMuteScope);

  useEffect(() => {
    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
    };
  }, [onClose]);

  const playable = getPlayableFocusTracks(tracks).filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    const name = (t.customName || inst?.name || inst?.id || '').trim().toUpperCase();
    return name !== 'ALFAIAS' && String(t.id).toLowerCase() !== 'alfaias';
  });
  const hasFamily = focusTrackId !== null && getTrackFamilyIds(focusTrackId, tracks).length > 1;

  return (
    <div
      ref={panelRef}
      style={position ? { position: 'fixed', top: position.top, left: position.left, width: 360 } : undefined}
      className={`z-[99999] w-[360px] bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-2.5 flex flex-col gap-2.5 text-xs font-cactus select-none max-h-[calc(100vh-120px)] overflow-y-auto ${position ? '' : 'absolute left-0 top-full mt-1'}`}
    >
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 pb-1 border-b border-[#1a1a1a]/30 mb-1.5">
          {lang === 'pt' ? '1. Escolher naipe' : '1. Choisir son pupitre'}
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto pr-0.5">
          {playable.map((t, idx) => {
            const inst = instrumentsConfig[t.instrumentIdx];
            const isSelected = t.id === focusTrackId;
            const raw = t.customName || inst?.name || `Track ${idx + 1}`;
            const name = raw.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFocusTrackId(t.id, inst?.name)}
                className={`flex items-center gap-1.5 px-1.5 py-1 cordel-border-sm text-left transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-[#1a1a1a] font-black' : 'opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: inst?.mixerBg || '#f4ecd8', color: inst?.colors.text || '#1a1a1a' }}
              >
                <img
                  src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
                  alt={name}
                  className="w-3.5 h-3.5 object-contain filter invert opacity-90 shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <span className="truncate flex-1 text-[10.5px] leading-tight font-medium">{idx + 1}. {name}</span>
                {isSelected && <span className="text-[10px] font-black shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-1.5 border-t border-[#1a1a1a]/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 mb-1.5">
          {lang === 'pt' ? '2. Modo de variações' : '2. Mode des variations'}
        </div>
        <div className="flex flex-col gap-1 text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
            <input type="radio" name="focusVariationMode" checked={isolateBaseOnly} onChange={() => setIsolateBaseOnly(true)} className="accent-[#1a1a1a]" />
            <span>{lang === 'pt' ? 'Base pura (frase mestra + chamada)' : 'Base pure (phrase maîtresse + amorce)'}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
            <input type="radio" name="focusVariationMode" checked={!isolateBaseOnly} onChange={() => setIsolateBaseOnly(false)} className="accent-[#1a1a1a]" />
            <span>{lang === 'pt' ? 'Jogo livre com variações' : 'Jeu libre avec variations'}</span>
          </label>
        </div>
      </div>

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
    </div>
  );
};
