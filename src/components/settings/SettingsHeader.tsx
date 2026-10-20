import React from 'react';

interface SettingsHeaderProps {
  lang: string;
  onSetLang: (lang: 'fr' | 'pt') => void;
  onClose: () => void;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  lang,
  onSetLang,
  onClose,
}) => {
  return (
    <div className="bg-black text-[#f4ecd8] px-6 py-4 flex justify-between items-center shrink-0 border-b-4 border-black">
      <h2 className="text-xl md:text-2xl font-cactus font-bold tracking-wider uppercase flex items-center gap-2">
        <svg className="w-5 h-5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2L14 5H10L12 2Z" />
          <path d="M12 22L10 19H14L12 22Z" />
          <path d="M22 12L19 14V10L22 12Z" />
          <path d="M2 12L5 10V14L2 12Z" />
          <path d="M19.07 4.93L16.24 7.76L17.66 9.17L20.49 6.34L19.07 4.93Z" />
          <path d="M4.93 19.07L7.76 16.24L9.17 17.66L6.34 20.49L4.93 19.07Z" />
          <path d="M19.07 19.07L16.24 16.24L17.66 14.83L20.49 17.66L19.07 19.07Z" />
          <path d="M4.93 4.93L7.76 7.76L9.17 6.34L6.34 3.51L4.93 4.93Z" />
        </svg>
        <span>{lang === 'fr' ? "L'Atelier - O Girador" : 'A Oficina - O Girador'}</span>
      </h2>
      <div className="flex items-center gap-3">
        <div className="flex border-2 border-[#f4ecd8] bg-black text-[10px] md:text-xs font-cactus font-bold uppercase overflow-hidden shadow-[2px_2px_0px_#f4ecd8]/20">
          <button
            onClick={() => onSetLang('fr')}
            className={`px-2 py-1 cursor-pointer transition-colors ${
              lang === 'fr'
                ? 'bg-[#f4ecd8] text-black font-black font-cactus'
                : 'bg-black text-[#f4ecd8] hover:bg-[#f4ecd8]/10'
            }`}
            title="Passer en Français"
          >
            FR
          </button>
          <div className="w-[2px] bg-[#f4ecd8]/30"></div>
          <button
            onClick={() => onSetLang('pt')}
            className={`px-2 py-1 cursor-pointer transition-colors ${
              lang === 'pt'
                ? 'bg-[#f4ecd8] text-black font-black font-cactus'
                : 'bg-black text-[#f4ecd8] hover:bg-[#f4ecd8]/10'
            }`}
            title="Mudar para Português"
          >
            PT
          </button>
        </div>

        <button
          onClick={onClose}
          className="bg-[#f4ecd8] text-black border-2 border-black hover:bg-black hover:text-[#f4ecd8] transition-colors px-3 py-1 font-cactus font-black text-lg cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          title={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
