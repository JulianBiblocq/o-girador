import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { getPasteDisabledReason } from '../../../utils/patternPasteNormalizer';
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
    if (!clipboard || !isCompatible) return;
    pasteAllTrackPatterns(trackId, mode);
    onClose();
  };

  const canPaste = Boolean(clipboard && isCompatible);
  const disabledReason = getPasteDisabledReason(
    Boolean(clipboard),
    isCompatible,
    lang,
    clipboard?.sourceFamily || clipboard?.sourceInstId,
    targetFamily
  );

  const itemBtnClass = 'w-full text-left px-3 py-1.5 hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] transition-colors flex items-center gap-2 cursor-pointer';
  const disabledBtnClass = 'w-full text-left px-3 py-1.5 text-[var(--cordel-ink-dark)]/45 opacity-55 flex items-center gap-2 cursor-not-allowed';

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

      <button
        type="button"
        disabled={!canPaste}
        onClick={() => handlePaste('libraryOnly')}
        className={canPaste ? itemBtnClass : disabledBtnClass}
        title={canPaste ? (lang === 'fr' ? 'Importe les motifs dans la bibliothèque sans toucher à la timeline' : 'Importa os padrões sem alterar a timeline') : disabledReason}
      >
        <span>{lang === 'fr' ? 'Coller (banque seule)' : 'Colar (somente banco)'}</span>
      </button>
      <button
        type="button"
        disabled={!canPaste}
        onClick={() => handlePaste('libraryAndTimeline')}
        className={canPaste ? itemBtnClass : disabledBtnClass}
        title={canPaste ? (lang === 'fr' ? 'Importe les motifs et applique leur disposition sur la timeline' : 'Importa os padrões e aplica a disposição na timeline') : disabledReason}
      >
        <span>{lang === 'fr' ? 'Coller (banque + timeline)' : 'Colar (banco + timeline)'}</span>
      </button>

      {!canPaste && disabledReason && (
        <div className="px-3 py-1 text-[10px] text-[var(--cordel-wood)]/80 italic">
          {disabledReason}
        </div>
      )}
    </>
  );
});

InstrumentHeaderContextMenuItems.displayName = 'InstrumentHeaderContextMenuItems';
