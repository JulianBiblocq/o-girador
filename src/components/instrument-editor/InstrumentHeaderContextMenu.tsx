import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { canTransferPatterns, getInstrumentFamily } from '../../utils/instrumentCompatibility';

interface InstrumentHeaderContextMenuProps {
  trackId: number;
  x: number;
  y: number;
  onClose: () => void;
}

export const InstrumentHeaderContextMenu: React.FC<InstrumentHeaderContextMenuProps> = ({
  trackId,
  x,
  y,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const lang = useSequencerStore(state => state.lang);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId || String(t.id) === String(trackId)));
  const clipboard = useSequencerStore(state => state.instrumentPatternsClipboard);
  const copyAllTrackPatterns = useSequencerStore(state => state.copyAllTrackPatterns);
  const pasteAllTrackPatterns = useSequencerStore(state => state.pasteAllTrackPatterns);

  // Fermeture sur clic extérieur ou touche Échap
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleWheel = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [onClose]);

  if (!track) return null;

  const inst = instrumentsConfig[track.instrumentIdx];
  const instName = track.customName || inst?.name || 'Instrument';
  const targetFamily = getInstrumentFamily(inst?.id || '');
  const isCompatible = clipboard ? canTransferPatterns(clipboard, track) : false;

  // Clamping de la position pour ne pas déborder du viewport
  const menuWidth = 240;
  const menuHeight = 180;
  const adjustedX = Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 800) - menuWidth - 12));
  const adjustedY = Math.max(8, Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 600) - menuHeight - 12));

  const patternCount = track.patterns?.length || 0;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu contextuel instrument"
      className="fixed z-[99999] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] rounded-sm py-1.5 w-[240px] select-none text-xs font-bold text-[#1a1a1a]"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* En-tête : Nom de l'instrument & motif count */}
      <div className="px-3 py-1 text-[11px] font-cactus tracking-wide uppercase text-[#8b2a1a] border-b border-[#1a1a1a]/15 flex items-center justify-between">
        <span className="truncate">{instName}</span>
        <span className="text-[10px] text-[#1a1a1a]/60 lowercase font-mono">
          {patternCount} {lang === 'fr' ? (patternCount > 1 ? 'motifs' : 'motif') : (patternCount > 1 ? 'padrões' : 'padrão')}
        </span>
      </div>

      {/* Action Entraînement : S'entraîner sur ce pupitre (Jouer avec) */}
      <button
        type="button"
        onClick={() => {
          useSequencerStore.getState().setTocarJuntoTrack(trackId, true);
          useSequencerStore.getState().setActiveAoVivoTrackId(trackId);
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer border-b border-[#1a1a1a]/15"
      >
        <span className="text-sm">🎯</span>
        <span>{lang === 'fr' ? "S'entraîner sur ce pupitre (Jouer avec)" : "Treinar neste naipe (Tocar Junto)"}</span>
      </button>

      {/* Action 1 : Copier tous les motifs */}
      <button
        type="button"
        onClick={() => {
          copyAllTrackPatterns(trackId);
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <span className="text-sm">📋</span>
        <span>{lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos os padrões'}</span>
      </button>

      <div className="my-1 border-t border-[#1a1a1a]/15" />

      {/* Action 2 : Coller selon compatibilité */}
      {!clipboard ? (
        <div className="px-3 py-1.5 text-[11px] text-[#1a1a1a]/40 italic flex items-center gap-2 cursor-default">
          <span className="text-sm opacity-50">📥</span>
          <span>{lang === 'fr' ? 'Presse-papier vide' : 'Área de transferência vazia'}</span>
        </div>
      ) : !isCompatible ? (
        <div className="px-3 py-1.5 text-[11px] text-[#8b2a1a]/70 flex flex-col gap-0.5 cursor-default bg-[#8b2a1a]/5">
          <div className="flex items-center gap-1.5">
            <span>✕</span>
            <span>{lang === 'fr' ? 'Famille incompatible' : 'Família incompatível'}</span>
          </div>
          <span className="text-[10px] text-[#1a1a1a]/50 font-normal">
            ({clipboard.sourceFamily || 'source'} ➔ {targetFamily || 'cible'})
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              pasteAllTrackPatterns(trackId, 'libraryOnly');
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer"
            title={lang === 'fr' ? 'Importe les motifs dans la bibliothèque sans toucher à la timeline' : 'Importa os padrões sem alterar a timeline'}
          >
            <span className="text-sm">📥</span>
            <span>{lang === 'fr' ? 'Coller (banque seule)' : 'Colar (somente banco)'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              pasteAllTrackPatterns(trackId, 'libraryAndTimeline');
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer"
            title={lang === 'fr' ? 'Importe les motifs et applique leur disposition sur la timeline' : 'Importa os padrões e aplica a disposição na timeline'}
          >
            <span className="text-sm">📥</span>
            <span>{lang === 'fr' ? 'Coller (banque + timeline)' : 'Colar (banco + timeline)'}</span>
          </button>
        </>
      )}
    </div>,
    document.body
  );
};
