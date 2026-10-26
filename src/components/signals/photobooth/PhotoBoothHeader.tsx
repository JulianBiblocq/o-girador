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
    <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1.5">
      <div className="flex items-center gap-2">
        <h3 className="font-cactus text-xl font-bold">
          {lang === 'fr' ? 'Photomaton Musical' : 'Cabine de Fotos'}
        </h3>
        <div className="flex border border-black text-xs font-cactus font-bold">
          <button
            type="button"
            onClick={() => onChangeTab('capture')}
            className={`px-2 py-0.5 cursor-pointer ${
              activeTab === 'capture' ? 'bg-[#8b2a1a] text-white' : 'bg-white'
            }`}
          >
            {lang === 'fr' ? 'Prise de vue' : 'Captura'}
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('gallery')}
            className={`px-2 py-0.5 cursor-pointer ${
              activeTab === 'gallery' ? 'bg-[#8b2a1a] text-white' : 'bg-white'
            }`}
          >
            {lang === 'fr' ? 'Galerie' : 'Galeria'}
          </button>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:text-[#8b2a1a] cursor-pointer"
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
};
