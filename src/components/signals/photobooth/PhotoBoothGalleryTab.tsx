import React from 'react';
import { FolderOpen } from 'lucide-react';
import { MobileMestreSignalGallery } from '../../mobile/editor/MobileMestreSignalGallery';
import { GallerySignalItem } from '../../mobile/editor/MobileMestreSignalCard';
import { CordelOptions } from '../../../utils/cordelEffect';

interface Props {
  onPickSignal: (sig: GallerySignalItem) => void;
  onCopyStyle: (opts: Partial<CordelOptions>) => void;
  onOpenBatch: () => void;
  selectedSignalId: string | null;
  lang: 'fr' | 'pt';
}

export const PhotoBoothGalleryTab: React.FC<Props> = ({
  onPickSignal,
  onCopyStyle,
  onOpenBatch,
  selectedSignalId,
  lang,
}) => {
  return (
    <div className="flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
      <div className="flex flex-wrap justify-between items-center gap-2 p-2 bg-[var(--cordel-surface)] border border-[var(--cordel-border)]">
        <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)]">
          {lang === 'fr' ? 'Signes enregistrés (Locaux & Cloud)' : 'Sinais salvos (Locais & Cloud)'}
        </span>
        <button
          type="button"
          onClick={onOpenBatch}
          className="px-2.5 py-1 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--cordel-shadow-color)] transition-colors"
        >
          <FolderOpen size={13} />
          <span>{lang === 'fr' ? 'Importer par lot' : 'Importar em lote'}</span>
        </button>
      </div>
      <MobileMestreSignalGallery
        onSelectSignal={onPickSignal}
        onCopyStyle={onCopyStyle}
        selectedSignalId={selectedSignalId}
        lang={lang}
      />
    </div>
  );
};
