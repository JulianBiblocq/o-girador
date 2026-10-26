import React from 'react';
import { FolderOpen } from 'lucide-react';
import { MobileMestreSignalGallery } from '../../mobile/editor/MobileMestreSignalGallery';
import { CloudRhythmSignal } from '../../../types';
import { CordelOptions } from '../../../utils/cordelEffect';

interface Props {
  onPickSignal: (sig: CloudRhythmSignal) => void;
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
    <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
      <div className="flex justify-between items-center">
        <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">
          {lang === 'fr' ? 'Signes enregistrés' : 'Sinais salvos'}
        </span>
        <button
          type="button"
          onClick={onOpenBatch}
          className="px-2 py-1 bg-white border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer hover:bg-black hover:text-white"
        >
          <FolderOpen size={12} />
          <span>{lang === 'fr' ? 'Importer un lot' : 'Importar lote'}</span>
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
