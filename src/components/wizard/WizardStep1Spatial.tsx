import React, { useState, useEffect } from 'react';
import { PlacedInstrument } from '../../stores/useWizardStore';
import { useDispositionStore } from '../../stores/useDispositionStore';
import { useAuth } from '../../contexts/AuthContext';
import { Language } from '../../types';
import { t } from './wizardConstants';
import { useWizardDragDrop } from './useWizardDragDrop';
import { WizardInstrumentsRack } from './WizardInstrumentsRack';
import { WizardStageCanvas } from './WizardStageCanvas';
import { SaveDispositionModal } from './SaveDispositionModal';
import { LoadDispositionModal } from './LoadDispositionModal';

interface WizardStep1SpatialProps {
  wizardLang: Language;
  placedInstruments: PlacedInstrument[];
  hasToada: boolean;
  onToggleToada: () => void;
  onClose: () => void;
  onNext: () => void;
  showToast: (msg: string) => void;
}

export const WizardStep1Spatial: React.FC<WizardStep1SpatialProps> = ({
  wizardLang,
  placedInstruments,
  hasToada,
  onToggleToada,
  onClose,
  onNext,
  showToast,
}) => {
  const { userProfile } = useAuth();
  const dispositions = useDispositionStore((state) => state.dispositions);
  const syncCloudDispositions = useDispositionStore((state) => state.syncCloudDispositions);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [placeSize, setPlaceSize] = useState({ width: 0, height: 0 });

  const { placeRef, ghostRef, dismissZoneRef, handlePalettePointerDown, handlePlacedPointerDown, handlePointerMove, handlePointerUp } =
    useWizardDragDrop(wizardLang, showToast);

  useEffect(() => {
    if (userProfile?.uid) {
      syncCloudDispositions(userProfile.uid, userProfile.groupId, userProfile.mestreId, userProfile.role, userProfile.canWriteSequenciador);
    }
  }, [userProfile?.uid, userProfile?.groupId, userProfile?.mestreId, userProfile?.role, userProfile?.canWriteSequenciador, syncCloudDispositions]);

  useEffect(() => {
    if (!placeRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries?.length) setPlaceSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
    });
    observer.observe(placeRef.current);
    return () => observer.disconnect();
  }, [placeRef]);

  return (
    <div className="fixed inset-0 bg-[#f4ecd8] z-[200] flex flex-col p-4 md:p-8 select-none font-sans overflow-hidden" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <div ref={ghostRef} className="pointer-events-none fixed items-center justify-center flex-col select-none" style={{ display: 'none', zIndex: 50 }} />
      <div ref={dismissZoneRef} className="absolute top-18 left-1/2 -translate-x-1/2 border-3 border-[#1a1a1a] bg-[#e2d7be] px-6 py-2.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] z-30 transition-all duration-200 pointer-events-none opacity-0 select-none flex items-center gap-2 font-cactus font-bold uppercase text-xs md:text-sm" style={{ transform: 'translate(-50%, -150%)' }}>
        <span className="text-sm md:text-base"></span>
        <span>{t[wizardLang].congedier}</span>
      </div>

      <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3 mb-4 flex-shrink-0">
        <div>
          <h2 className="font-cactus text-2xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider leading-none">{t[wizardLang].title}</h2>
          <p className="text-[#1a1a1a]/70 text-[10px] md:text-xs mt-1 font-cactus font-bold tracking-wide uppercase">
            {t[wizardLang].step1Sub} ({placedInstruments.length} {wizardLang === 'fr' ? 'instrument(s)' : 'instrumento(s)'})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsSaveModalOpen(true)} disabled={placedInstruments.length === 0} className="px-2.5 md:px-3 py-1.5 bg-[#2e5339] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <span></span>
            <span>{t[wizardLang].enregistrerDisposition}</span>
          </button>
          <button type="button" onClick={() => setIsLoadModalOpen(true)} className="px-2.5 md:px-3 py-1.5 bg-[#d7cfbb] hover:bg-[#ece4d0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 cursor-pointer">
            <span></span>
            <span>{t[wizardLang].dispositionsTitle}</span>
            <span className="px-1.5 py-0.2 bg-[#8b2a1a] text-[#f4ecd8] rounded-full text-[9px] font-mono font-bold leading-none">{dispositions.length}</span>
          </button>
          <button onClick={onClose} className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs">
            {t[wizardLang].annuler}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        <WizardInstrumentsRack wizardLang={wizardLang} hasToada={hasToada} onToggleToada={onToggleToada} onPalettePointerDown={handlePalettePointerDown} />
        <WizardStageCanvas placeRef={placeRef} placeSize={placeSize} placedInstruments={placedInstruments} wizardLang={wizardLang} onPlacedPointerDown={handlePlacedPointerDown} />
      </div>

      <div className="mt-4 pt-3 border-t-2 border-[#1a1a1a] flex justify-between items-center flex-shrink-0">
        <div className="text-[10px] md:text-xs text-[#1a1a1a]/70 font-cactus uppercase font-bold">{t[wizardLang].infoRetirer}</div>
        <button onClick={onNext} className="px-6 py-2.5 bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(139,42,26,0.5)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider">
          {t[wizardLang].suivant}
        </button>
      </div>

      <SaveDispositionModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} lang={wizardLang} onSuccess={(p) => showToast(wizardLang === 'fr' ? `Disposition « ${p} » enregistrée !` : `Disposição « ${p} » salva!`)} />
      <LoadDispositionModal isOpen={isLoadModalOpen} onClose={() => setIsLoadModalOpen(false)} lang={wizardLang} onLoaded={(p) => showToast(wizardLang === 'fr' ? `Disposition « ${p} » chargée sur La Place !` : `Disposição « ${p} » carregada no Palco!`)} />
    </div>
  );
};
