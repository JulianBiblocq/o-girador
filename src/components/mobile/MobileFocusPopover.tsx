/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Panneau complet Mode Focus Mobile (3 sections Cordel, < 135 lignes).
 */
import React from 'react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useSequencerStore, getTrackFamilyIds } from '../../stores/useSequencerStore';
import { getPlayableFocusTracks, getEligibleReferenceTracks } from '../../utils/focusTrackSelector';
import { getEnsembleVocabulary } from '../../universes/styleVocabularyConfig';
import { TrackGroup } from '../../types';
import { CordelTarget } from '../ui/CordelTarget';

interface Props {
  isOpen: boolean; onClose: () => void;
  referenceTrackId: number | null; onSelectReferenceTrackId: (id: number | null) => void;
  isRestMuted: boolean; onToggleRestMuted: () => void; lang: 'fr' | 'pt';
}

export const MobileFocusPopover: React.FC<Props> = ({
  isOpen, onClose, referenceTrackId, onSelectReferenceTrackId, isRestMuted, onToggleRestMuted, lang,
}) => {
  const tracks = useSequencerStore((s) => s.tracks), focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const setFocusTrackId = useSequencerStore((s) => s.setFocusTrackId), setActiveAoVivoTrackId = useSequencerStore((s) => s.setActiveAoVivoTrackId);
  const isolateBaseOnly = useSequencerStore((s) => s.isolateBaseOnly), setIsolateBaseOnly = useSequencerStore((s) => s.setIsolateBaseOnly);
  const tocarJuntoIsMuted = useSequencerStore((s) => s.tocarJuntoIsMuted), setTocarJuntoIsMuted = useSequencerStore((s) => s.setTocarJuntoIsMuted);
  const tocarJuntoMuteScope = useSequencerStore((s) => s.tocarJuntoMuteScope), setTocarJuntoMuteScope = useSequencerStore((s) => s.setTocarJuntoMuteScope);

  if (!isOpen) return null;
  const vocab = getEnsembleVocabulary('maracatu', lang), playable = getPlayableFocusTracks(tracks);
  const hasFamily = focusTrackId !== null && getTrackFamilyIds(focusTrackId, tracks).length > 1;

  const handleSelectTrack = (t: TrackGroup) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    setFocusTrackId(t.id, inst?.name);
    setActiveAoVivoTrackId(t.id);
    if (!useSequencerStore.getState().isFocusActive) useSequencerStore.setState({ isFocusActive: true });
    if (referenceTrackId === t.id) onSelectReferenceTrackId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-3 flex flex-col gap-2 text-xs font-cactus max-h-[82dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1a1a]/30">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sm text-[#8b2a1a]">
            <CordelTarget size={16} />
            <span>{lang === 'pt' ? 'Opções do Focus' : 'Options du Focus'}</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 border border-[#1a1a1a] flex items-center justify-center font-bold hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer">✕</button>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 mb-1">
            {lang === 'pt' ? '1. Escolher seu naipe principal' : '1. Choisir son pupitre principal'}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-0.5">
            {playable.map((t, idx) => {
              const inst = instrumentsConfig[t.instrumentIdx], isSelected = t.id === focusTrackId;
              const raw = t.customName || inst?.name || `Track ${idx + 1}`;
              const name = raw.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
              return (
                <button
                  key={t.id} onClick={() => handleSelectTrack(t)}
                  className={`flex items-center gap-1 px-1.5 py-1 cordel-border-sm text-left transition-all cursor-pointer ${isSelected ? 'ring-2 ring-[#1a1a1a] font-black' : 'opacity-85 hover:opacity-100'}`}
                  style={{ backgroundColor: inst?.mixerBg || '#f4ecd8', color: inst?.colors.text || '#1a1a1a' }}
                >
                  <img src={`${ASSETS_BASE_URL}${inst?.iconImg}`} alt={name} className="w-3.5 h-3.5 object-contain filter invert opacity-90 shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  <span className="truncate flex-1 text-[10.5px] leading-tight font-medium">{idx + 1}. {name}</span>
                  {isSelected && <span className="text-[10px] font-black shrink-0">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-1 border-t border-[#1a1a1a]/20 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/80">
              <span>{lang === 'pt' ? '2º Instrumento (Correlação)' : '2e Instrument (Corrélation)'}</span>
              {referenceTrackId !== null && (
                <button type="button" onClick={() => onSelectReferenceTrackId(null)} className="text-[#8b2a1a] hover:underline cursor-pointer text-[9px] font-bold">
                  {lang === 'pt' ? 'Remover' : 'Retirer'}
                </button>
              )}
            </div>
            <select
              value={referenceTrackId ?? ''} onChange={(e) => onSelectReferenceTrackId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-[#fcf9f2] border border-[#1a1a1a] p-1 text-[11px] font-bold font-cactus cursor-pointer shadow-[1px_1px_0_#000]"
            >
              <option value="">{lang === 'pt' ? 'Nenhum (Apenas meu pupitre)' : 'Aucun (Mon pupitre seul)'}</option>
              {getEligibleReferenceTracks(tracks, focusTrackId).map((t) => {
                const pIdx = playable.findIndex((p) => p.id === t.id);
                const num = pIdx >= 0 ? pIdx + 1 : '';
                const name = (t.customName || instrumentsConfig[t.instrumentIdx]?.name || '').replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
                return <option key={t.id} value={t.id}>{num}. {name}</option>;
              })}
            </select>
          </div>
        </div>

        <div className="pt-1 border-t border-[#1a1a1a]/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 mb-1">
            {lang === 'pt' ? '2. Modo de variações' : '2. Mode des variations'}
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <input type="radio" name="mobileFocusVar" checked={isolateBaseOnly} onChange={() => setIsolateBaseOnly(true)} className="accent-[#1a1a1a]" />
              <span>{lang === 'pt' ? 'Base pura (frase mestra + chamada)' : 'Base pure (phrase maîtresse + amorce)'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <input type="radio" name="mobileFocusVar" checked={!isolateBaseOnly} onChange={() => setIsolateBaseOnly(false)} className="accent-[#1a1a1a]" />
              <span>{lang === 'pt' ? 'Jogo livre com variações' : 'Jeu libre avec variations'}</span>
            </label>
          </div>
        </div>

        <div className="pt-1 border-t border-[#1a1a1a]/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 mb-1">
            {lang === 'pt' ? '3. Tocar junto' : '3. Jouer par-dessus'}
          </div>
          <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 text-[11px]">
            <input type="checkbox" checked={tocarJuntoIsMuted} onChange={(e) => setTocarJuntoIsMuted(e.target.checked)} className="accent-[#1a1a1a] rounded-none" />
            <span>{lang === 'pt' ? 'Silenciar meu instrumento para tocar junto' : 'Rendre mon instrument muet pour jouer par-dessus'}</span>
          </label>
          {hasFamily && tocarJuntoIsMuted && (
            <div className="flex gap-1.5 mt-1.5 pl-5">
              <button type="button" onClick={() => setTocarJuntoMuteScope('track')} className={`flex-1 py-1 px-1 text-[10px] font-bold cordel-border-sm cursor-pointer ${tocarJuntoMuteScope === 'track' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a]'}`}>{lang === 'pt' ? 'Só este instrumento' : 'Cet instrument seul'}</button>
              <button type="button" onClick={() => setTocarJuntoMuteScope('family')} className={`flex-1 py-1 px-1 text-[10px] font-bold cordel-border-sm cursor-pointer ${tocarJuntoMuteScope === 'family' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a]'}`}>{lang === 'pt' ? 'Todo o naipe' : 'Tout le pupitre'}</button>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 text-[11px] mt-1 pt-1 border-t border-[#1a1a1a]/20">
            <input type="checkbox" checked={isRestMuted} onChange={onToggleRestMuted} className="accent-[#1a1a1a] rounded-none" />
            <span>{lang === 'pt' ? `Mutar o ${vocab.restOfEnsemble}` : `Couper le son du ${vocab.restOfEnsemble}`}</span>
          </label>
        </div>

        <div className="pt-1.5 border-t border-[#1a1a1a]/30">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-8 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-center gap-1.5 bg-[#c25e38] hover:bg-[#b94a2c] text-[#f4ecd8] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors active:translate-y-0.5"
          >
            <span className="font-black text-sm">✓</span>
            <span>{lang === 'pt' ? 'CONFIRMAR' : 'VALIDER'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
