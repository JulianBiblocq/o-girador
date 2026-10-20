/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { XiloTarget } from '../../XiloIcons';

interface InstrumentHeaderContextMenuItemsProps {
  trackId: number;
  lang: string;
  clipboard: any;
  isCompatible: boolean;
  targetFamily: string;
  onClose: () => void;
}

export const InstrumentHeaderContextMenuItems: React.FC<InstrumentHeaderContextMenuItemsProps> = React.memo(({
  trackId, lang, clipboard, isCompatible, targetFamily, onClose,
}) => {
  const copyAllTrackPatterns = useSequencerStore((state) => state.copyAllTrackPatterns);
  const pasteAllTrackPatterns = useSequencerStore((state) => state.pasteAllTrackPatterns);

  const handleTrain = () => {
    useSequencerStore.getState().setTocarJuntoTrack(trackId, true);
    useSequencerStore.getState().setActiveAoVivoTrackId(trackId);
    onClose();
  };

  const handleCopy = () => {
    copyAllTrackPatterns(trackId);
    onClose();
  };

  const handlePaste = (mode: 'libraryOnly' | 'libraryAndTimeline') => {
    pasteAllTrackPatterns(trackId, mode);
    onClose();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTrain}
        className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer border-b border-[#1a1a1a]/15"
      >
        <XiloTarget size={16} className="shrink-0" />
        <span>{lang === 'fr' ? "S'entraîner sur ce pupitre (Jouer avec)" : 'Treinar neste naipe (Tocar Junto)'}</span>
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <span className="text-sm">📋</span>
        <span>{lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos os padrões'}</span>
      </button>

      <div className="my-1 border-t border-[#1a1a1a]/15" />

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
            onClick={() => handlePaste('libraryOnly')}
            className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer"
            title={lang === 'fr' ? 'Importe les motifs dans la bibliothèque sans toucher à la timeline' : 'Importa os padrões sem alterar a timeline'}
          >
            <span className="text-sm">📥</span>
            <span>{lang === 'fr' ? 'Coller (banque seule)' : 'Colar (somente banco)'}</span>
          </button>
          <button
            type="button"
            onClick={() => handlePaste('libraryAndTimeline')}
            className="w-full text-left px-3 py-1.5 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-2 cursor-pointer"
            title={lang === 'fr' ? 'Importe les motifs et applique leur disposition sur la timeline' : 'Importa os padrões e aplica a disposição na timeline'}
          >
            <span className="text-sm">📥</span>
            <span>{lang === 'fr' ? 'Coller (banque + timeline)' : 'Colar (banco + timeline)'}</span>
          </button>
        </>
      )}
    </>
  );
});

InstrumentHeaderContextMenuItems.displayName = 'InstrumentHeaderContextMenuItems';
