import React from 'react';
import { X } from 'lucide-react';

interface Props {
  activeTab: 'capture' | 'gallery';
  onChangeTab: (tab: 'capture' | 'gallery') => void;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const PhotoBoothHeader: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  onClose,
  lang,
}) => {
  return (
    <div className="flex flex-wrap justify-between items-center gap-2 border-b-2 border-[var(--cordel-border)] pb-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="font-cactus text-lg sm:text-xl font-bold text-[var(--cordel-text)]">
          {lang === 'fr' ? 'Photomaton Musical' : 'Cabine de Fotos'}
        </h3>
        <div className="flex border-2 border-[var(--cordel-border-strong)] text-xs font-cactus font-bold overflow-hidden">
          <button
            type="button"
            onClick={() => onChangeTab('capture')}
            className={`px-2.5 py-1 uppercase cursor-pointer transition-colors ${
              activeTab === 'capture'
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-surface)]'
            }`}
          >
            {lang === 'fr' ? 'Prise de vue' : 'Captura'}
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('gallery')}
            className={`px-2.5 py-1 uppercase border-l border-[var(--cordel-border)] cursor-pointer transition-colors ${
              activeTab === 'gallery'
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-surface)]'
            }`}
          >
            {lang === 'fr' ? 'Galerie' : 'Galeria'}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] cursor-pointer transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};
