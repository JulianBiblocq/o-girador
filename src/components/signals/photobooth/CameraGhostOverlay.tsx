import React from 'react';

interface Props {
  isActive: boolean;
  ghostReferenceImage?: string | null;
}

export const CameraGhostOverlay: React.FC<Props> = ({ isActive, ghostReferenceImage }) => {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      {/* 1. Image Onion Skin semi-transparente */}
      {ghostReferenceImage && (
        <img
          src={ghostReferenceImage}
          alt="Ghost reference"
          className="w-full h-full object-cover opacity-25 filter contrast-125"
        />
      )}

      {/* 2. Réticule & Cadre repère ergonomique des mains */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Cadre central en pointillés optimisé pour la zone des deux mains */}
        <div className="w-[72%] h-[58%] border-2 border-dashed border-[#ffd369]/70 rounded-xs relative flex items-center justify-center">
          {/* Ligne médiane horizontale fine */}
          <div className="absolute left-0 right-0 h-[1px] bg-[#ffd369]/30" />
          {/* Ligne médiane verticale fine */}
          <div className="absolute top-0 bottom-0 w-[1px] bg-[#ffd369]/30" />

          {/* Croix centrale précise */}
          <div className="w-6 h-[2px] bg-[#ffd369]/80 absolute" />
          <div className="h-6 w-[2px] bg-[#ffd369]/80 absolute" />

          {/* Repères pour les mains (Gauche / Droite) */}
          <div className="absolute left-3 top-2 text-[9px] font-mono font-bold text-[#ffd369]/70">
            [ G ]
          </div>
          <div className="absolute right-3 top-2 text-[9px] font-mono font-bold text-[#ffd369]/70">
            [ D ]
          </div>
        </div>
      </div>
    </div>
  );
};
