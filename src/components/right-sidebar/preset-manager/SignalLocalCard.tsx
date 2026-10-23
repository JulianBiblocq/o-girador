
import React, { useState } from 'react';
import { Language, RhythmSignal } from '../../../types';

interface SignalLocalCardProps {
  sig: RhythmSignal;
  lang: Language;
  onEdit: (sig: RhythmSignal) => void;
  onDelete: (id: string) => void;
}

export const SignalLocalCard: React.FC<SignalLocalCardProps> = ({ sig, lang, onEdit, onDelete }) => {
  const [hasError, setHasError] = useState(false);

  const imageSource = (sig.frames && sig.frames[0] && sig.frames[0].startsWith('data:'))
    ? sig.frames[0]
    : (sig.image && sig.image.startsWith('data:'))
      ? sig.image
      : (sig.image || '');

  const initials = sig.name
    ? sig.name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'SG';

  return (
    <div
      onClick={() => onEdit(sig)}
      className="relative group bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden flex flex-col items-center justify-center aspect-square border-[var(--cordel-border)] cursor-pointer hover:border-[var(--cordel-wood)] transition-all"
      title={sig.name}
    >
      {imageSource && !hasError ? (
        <img
          src={imageSource}
          alt={sig.name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-[#f4ecd8] flex flex-col items-center justify-center p-2 text-center border border-dashed border-[#1a1a1a]/30">
          <div className="w-10 h-10 rounded-full border border-[#1a1a1a] flex items-center justify-center font-cactus font-bold text-base text-[var(--cordel-wood)] bg-black/5 mb-0.5">
            {initials}
          </div>
          <span className="text-[8px] font-cactus font-bold uppercase text-black/60 truncate max-w-full px-1">
            {sig.name}
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-black/75 p-1 flex flex-col text-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-bold text-white truncate px-1">{sig.name}</span>
      </div>

      <div className="absolute top-1 left-1 bg-gray-500 text-white text-[8px] font-bold px-1 cordel-border-sm">
        Local
      </div>

      {sig.frames && sig.frames.length > 1 && (
        <div className="absolute bottom-1 left-1 bg-black/80 text-white text-[7px] font-bold px-1 border border-white/30 group-hover:opacity-0 transition-opacity">
          {sig.frames.length}T
        </div>
      )}

      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(sig);
          }}
          className="bg-amber-600 text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center cordel-border-sm hover:bg-amber-700 cursor-pointer shadow-sm"
          title={lang === 'fr' ? 'Éditer le nom ou reprendre' : 'Editar nome ou recapturar'}
        >
          
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(sig.id);
          }}
          className="bg-[#8b2a1a] text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center cordel-border-sm hover:bg-red-700 cursor-pointer shadow-sm"
          title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
        >
          
        </button>
      </div>
    </div>
  );
};
