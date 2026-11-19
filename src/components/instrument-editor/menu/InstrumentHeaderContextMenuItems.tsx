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
    useSequencerStore.getState().activateFocusOnTrack(trackId);
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

  const itemBtnClass = 'w-full text-left px-3 py-1.5 hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] transition-colors flex items-center gap-2 cursor-pointer';

  return (
    <>
      <button
        type="button"
        onClick={handleTrain}
        className={`${itemBtnClass} border-b border-[var(--cordel-ink-dark)]/15`}
      >
        <XiloTarget size={16} className="shrink-0" />
        <span>{lang === 'fr' ? "S'entraîner sur ce pupitre (Focus)" : 'Treinar neste naipe (Focus)'}</span>
      </button>

      <button type="button" onClick={handleCopy} className={itemBtnClass}>
        <span>{lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos os padrões'}</span>
      </button>

      <div className="my-1 border-t border-[var(--cordel-ink-dark)]/15" />

      {!clipboard ? (
        <div className="px-3 py-1.5 text-[11px] text-[var(--cordel-ink-dark)]/40 italic flex items-center gap-2 cursor-default">
          <span>{lang === 'fr' ? 'Presse-papier vide' : 'Área de transferência vazia'}</span>
        </div>
      ) : !isCompatible ? (
        <div className="px-3 py-1.5 text-[11px] text-[var(--cordel-wood)]/70 flex flex-col gap-0.5 cursor-default bg-[var(--cordel-wood)]/5">
          <span>{lang === 'fr' ? 'Famille incompatible' : 'Família incompatível'}</span>
          <span className="text-[10px] text-[var(--cordel-ink-dark)]/50 font-normal">
            ({clipboard.sourceFamily || 'source'} {targetFamily || 'cible'})
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => handlePaste('libraryOnly')}
            className={itemBtnClass}
            title={lang === 'fr' ? 'Importe les motifs dans la bibliothèque sans toucher à la timeline' : 'Importa os padrões sem alterar a timeline'}
          >
            <span>{lang === 'fr' ? 'Coller (banque seule)' : 'Colar (somente banco)'}</span>
          </button>
          <button
            type="button"
            onClick={() => handlePaste('libraryAndTimeline')}
            className={itemBtnClass}
            title={lang === 'fr' ? 'Importe les motifs et applique leur disposition sur la timeline' : 'Importa os padrões e aplica a disposição na timeline'}
          >
            <span>{lang === 'fr' ? 'Coller (banque + timeline)' : 'Colar (banco + timeline)'}</span>
          </button>
        </>
      )}
    </>
  );
});

InstrumentHeaderContextMenuItems.displayName = 'InstrumentHeaderContextMenuItems';
