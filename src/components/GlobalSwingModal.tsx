import React, { useEffect, useState } from 'react';
import { GlobalSwing, Language } from '../types';

interface GlobalSwingModalProps {
  globalSwing: GlobalSwing;
  setGlobalSwing: (gs: GlobalSwing) => void;
  onClose: () => void;
  lang: Language;
}

export const GlobalSwingModal: React.FC<GlobalSwingModalProps> = ({
  globalSwing,
  setGlobalSwing,
  onClose,
  lang
}) => {
  const [localSwing, setLocalSwing] = useState<GlobalSwing>(globalSwing);

  // Sync state if it changes outside
  useEffect(() => {
    setLocalSwing(globalSwing);
  }, [globalSwing]);

  const handleModeChange = (mode: 'maracatu' | 'custom' | 'off') => {
    const newSwing = { ...localSwing, mode };
    setLocalSwing(newSwing);
    setGlobalSwing(newSwing);
  };

  const handleCustomOffsetChange = (index: number, val: number) => {
    const newOffsets = [...localSwing.customOffsets] as [number, number, number, number];
    newOffsets[index] = val;
    const newSwing = { ...localSwing, customOffsets: newOffsets };
    setLocalSwing(newSwing);
    setGlobalSwing(newSwing);
  };

  const handleResetCustom = () => {
    const newSwing = { ...localSwing, customOffsets: [0, 8, -29, -58] as [number, number, number, number] };
    setLocalSwing(newSwing);
    setGlobalSwing(newSwing);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-lg w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-2">
          <h3 className="font-cactus text-3xl font-bold text-[#1a1a1a]">
            {lang === 'fr' ? 'Balanço Général' : 'Balanço Geral'}
          </h3>
          <button onClick={onClose} className="text-[#1a1a1a] font-bold text-xl hover:text-[#8b2a1a]">
            ✕
          </button>
        </div>

        {/* Modes */}
        <div className="flex flex-col gap-3">
          <label className="font-bold text-[#1a1a1a] text-sm">Mode :</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleModeChange('maracatu')}
              className={`px-4 py-2 font-bold text-sm cordel-border-sm transition-colors flex-1 ${
                localSwing.mode === 'maracatu' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
              }`}
            >
              Maracatu
            </button>
            <button
              onClick={() => handleModeChange('custom')}
              className={`px-4 py-2 font-bold text-sm cordel-border-sm transition-colors flex-1 ${
                localSwing.mode === 'custom' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
              }`}
            >
              {lang === 'fr' ? 'Personnalisé' : 'Personalizado'}
            </button>
            <button
              onClick={() => handleModeChange('off')}
              className={`px-4 py-2 font-bold text-sm cordel-border-sm transition-colors flex-1 ${
                localSwing.mode === 'off' ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
              }`}
            >
              {lang === 'fr' ? 'Désactivé' : 'Desativado'}
            </button>
          </div>
        </div>

        {/* Custom blocks */}
        {localSwing.mode === 'custom' && (
          <div className="flex flex-col gap-6 bg-[#eaddcf] p-4 cordel-border-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-[#1a1a1a] text-sm">
                {lang === 'fr' ? 'Micro-timing des 4 doubles croches' : 'Micro-timing das 4 semicolcheias'}
              </span>
              <button
                onClick={handleResetCustom}
                className="px-3 py-1 bg-white border border-[#1a1a1a] text-[#1a1a1a] text-xs font-bold hover:bg-[#1a1a1a] hover:text-white transition-colors"
              >
                {lang === 'fr' ? 'Réinitialiser (Maracatu)' : 'Redefinir (Maracatu)'}
              </button>
            </div>
            
            <div className="flex gap-4 justify-around w-full">
              {localSwing.customOffsets.map((offset, idx) => (
                <div key={idx} className="flex flex-col items-center gap-4 flex-1">
                  
                  {/* Visuel du carré mobile */}
                  <div className="relative w-full h-16 flex items-center justify-center">
                    {/* Axe central pointillé */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l-2 border-dashed border-[#1a1a1a]/20 -translate-x-1/2 z-0" />
                    
                    {/* Carré de la cellule */}
                    <div 
                      className="flex items-center justify-center bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] z-10 w-10 h-10 font-bold text-lg text-[#1a1a1a] transition-transform duration-100"
                      style={{ 
                        // translate by max 20px either side depending on offset
                        transform: `translateX(${(offset / 100) * 20}px)` 
                      }}
                    >
                      {idx + 1}
                    </div>
                  </div>

                  {/* Slider horizontal */}
                  <div className="w-full relative flex items-center">
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={offset}
                      onChange={(e) => handleCustomOffsetChange(idx, parseInt(e.target.value))}
                      className="w-full h-2 bg-[#1a1a1a]/20 rounded-full appearance-none cursor-pointer outline-none slider-horizontal"
                      style={{ accentColor: '#8b2a1a' }}
                    />
                  </div>
                  
                  {/* Valeur numérique */}
                  <div className="text-center font-bold text-[#1a1a1a] text-sm">
                    {offset > 0 ? `+${offset}%` : `${offset}%`}
                  </div>

                </div>
              ))}
            </div>
            
            <p className="text-xs text-[#666] text-center mt-2">
              {lang === 'fr' 
                ? 'Vers la droite : Retard (+). Vers la gauche : Avance (-).' 
                : 'Para a direita: Atraso (+). Para a esquerda: Avanço (-).'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
