/**
 * Sélecteur direct Cordel du 2e instrument avec popover Cordel (< 120 lignes).
 */
import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { getEligibleReferenceTracks, getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { Eye, X } from 'lucide-react';

interface Props {
  referenceTrackId: number | null;
  onSelectReferenceTrackId: (id: number | null) => void;
  primaryTrackId: number | null;
  lang?: 'fr' | 'pt';
}

export const MobileSecondInstrumentSelector: React.FC<Props> = ({
  referenceTrackId,
  onSelectReferenceTrackId,
  primaryTrackId,
  lang = 'pt',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tracks = useSequencerStore((s) => s.tracks);
  const eligibleTracks = getEligibleReferenceTracks(tracks, primaryTrackId);
  const playable = getPlayableFocusTracks(tracks);

  const refTrack = referenceTrackId !== null ? tracks.find((t) => t.id === referenceTrackId) : null;
  const refInst = refTrack ? instrumentsConfig[refTrack.instrumentIdx] : null;
  const refRaw = refTrack?.customName || refInst?.name || '';
  const refShortName = refRaw.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
  const refPlayableIdx = refTrack ? playable.findIndex((p) => p.id === refTrack.id) : -1;
  const refNum = refPlayableIdx >= 0 ? `${refPlayableIdx + 1}. ` : '';

  return (
    <div className="relative h-8">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-full px-1.5 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-between gap-1 transition-colors shadow-[1px_1px_0_#000] cursor-pointer ${
          referenceTrackId !== null
            ? 'bg-[#c25e38] text-[#f4ecd8] border-black'
            : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
          {referenceTrackId !== null ? (
            <span
              className="w-2 h-2 rounded-full shrink-0 border border-black/40"
              style={{ backgroundColor: refInst?.mixerBg || '#f4ecd8' }}
            />
          ) : (
            <Eye size={12} className="shrink-0" />
          )}
          <span className="truncate">
            {referenceTrackId !== null ? `${refNum}${refShortName}` : (lang === 'pt' ? '+ 2º INSTRU' : '+ 2e INSTRU')}
          </span>
        </div>
        <span className="text-[10px] opacity-80 shrink-0">▾</span>
      </div>

      {referenceTrackId !== null && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectReferenceTrackId(null);
            setIsOpen(false);
          }}
          className="absolute right-0 top-0 bottom-0 w-[22px] flex items-center justify-center text-[#f4ecd8] hover:text-white cursor-pointer z-20"
          title={lang === 'pt' ? 'Remover 2º instrumento' : 'Retirer le 2e instrument'}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 min-w-[190px] max-h-[60vh] overflow-y-auto bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] z-50 p-1 flex flex-col gap-1 font-cactus text-xs select-none">
            <button
              type="button"
              onClick={() => {
                onSelectReferenceTrackId(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-2 py-1 border transition-colors cursor-pointer text-[11px] font-bold ${
                referenceTrackId === null
                  ? 'bg-[#c25e38] text-[#f4ecd8] border-black font-black'
                  : 'bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c]/20 border-transparent text-[var(--cordel-text)]'
              }`}
            >
              {lang === 'pt' ? '— Nenhum (1 só instrumento) —' : '— Aucun (1 seul instrument) —'}
            </button>
            {eligibleTracks.map((t) => {
              const pIdx = playable.findIndex((p) => p.id === t.id);
              const num = pIdx >= 0 ? `${pIdx + 1}. ` : '';
              const inst = instrumentsConfig[t.instrumentIdx];
              const name = (t.customName || inst?.name || '')
                .replace(/\s*\([^)]*\)/g, '')
                .replace(/^\d+[\.\s\-]+/, '')
                .trim();
              const isSelected = referenceTrackId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectReferenceTrackId(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 border text-left cursor-pointer transition-colors text-[11px] font-bold ${
                    isSelected
                      ? 'bg-[#c25e38] text-[#f4ecd8] border-black font-black'
                      : 'bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c]/20 border-transparent text-[var(--cordel-text)]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30"
                    style={{ backgroundColor: inst?.mixerBg || '#f4ecd8' }}
                  />
                  <span className="truncate flex-1">{num}{name}</span>
                  {isSelected && <span className="text-[10px] font-black shrink-0"></span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
