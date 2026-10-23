import React from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Language } from '../../types';
import { t } from './wizardConstants';

interface WizardStep2SignsProps {
  wizardLang: Language;
  onOpenPhotoBooth: () => void;
  onSignalFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WizardStep2Signs: React.FC<WizardStep2SignsProps> = ({
  wizardLang,
  onOpenPhotoBooth,
  onSignalFileChange,
}) => {
  const mestreSignals = useSequencerStore((state) => state.mestreSignals);
  const selectedSignIds = useWizardStore((state) => state.selectedSignIds);
  const toggleSignId = useWizardStore((state) => state.toggleSignId);

  const defaultSigns = [
    { id: 'pictures/logo-samambaia.png', name: wizardLang === 'fr' ? 'Signe Luanda' : 'Sinal Luanda', image: 'pictures/logo-samambaia.png' },
    { id: 'pictures/tambour.png', name: wizardLang === 'fr' ? 'Signe Martelo' : 'Sinal Martelo', image: 'pictures/tambour.png' },
    { id: 'pictures/atelier.png', name: wizardLang === 'fr' ? 'Signe Trovão' : 'Sinal Trovão', image: 'pictures/atelier.png' },
  ];

  const mestreSignsList = mestreSignals && mestreSignals.length > 0
    ? mestreSignals.map((s) => ({ id: s.id || s.name, name: s.name, image: s.imageUrl || s.image }))
    : defaultSigns;

  return (
    <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4 rounded-sm">
      <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
        {t[wizardLang].blason}
      </h3>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
          {t[wizardLang].choixSigne}
        </label>
        <div className="flex gap-3 overflow-x-auto p-2 border-2 border-dashed border-[#1a1a1a]/20 bg-[#1a1a1a]/5 rounded-sm scrollbar-thin">
          {mestreSignsList.map((sign) => {
            const isSelected = selectedSignIds.includes(sign.id);
            return (
              <div
                key={sign.id}
                onClick={() => toggleSignId(sign.id)}
                className={`relative flex-shrink-0 w-16 h-16 p-1.5 border-3 bg-[#f4ecd8] cursor-pointer flex items-center justify-center transition-all ${
                  isSelected ? 'border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-105' : 'border-[#1a1a1a]/40 hover:border-[#1a1a1a]/80'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 bg-[#1a1a1a] text-[#f4ecd8] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-[#1a1a1a] select-none z-10">
                    
                  </div>
                )}
                <img src={sign.image} className="w-full h-full object-contain pointer-events-none" alt={sign.name} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center mt-1 border-t border-[#1a1a1a]/10 pt-3">
        <div className="flex-1 flex gap-2 overflow-x-auto p-1 max-h-20 scrollbar-none">
          {selectedSignIds.length === 0 ? (
            <div className="text-[10px] text-[#1a1a1a]/50 italic">
              {wizardLang === 'fr' ? 'Aucun signe personnalisé' : 'Nenhum sinal personalizado'}
            </div>
          ) : (
            selectedSignIds.map((id, index) => (
              <div key={index} className="w-12 h-12 border-2 border-[#1a1a1a] bg-[#ece4d0] shadow-[1px_1px_0_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSignId(id); }}
                  className="absolute top-0 right-0 bg-[#8b2a1a] text-[#f4ecd8] text-[7px] w-3 h-3 flex items-center justify-center select-none"
                >
                  
                </button>
                {id.startsWith('data:image') ? (
                  <img src={id} className="w-full h-full object-cover" alt="Custom" />
                ) : (
                  <img src={id} className="w-10 h-10 object-contain" alt="Standard" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenPhotoBooth}
            className="w-full md:w-auto px-4 py-2.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider shrink-0"
          >
            {wizardLang === 'fr' ? 'Photo-cabine Musicale' : 'Cabine de Fotos'}
          </button>
          <label className="px-3 py-2.5 bg-[#ece4d0] hover:bg-[#e2d7be] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider shrink-0 flex items-center gap-1">
            {t[wizardLang].importFichier}
            <input type="file" accept="image/*" onChange={onSignalFileChange} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
