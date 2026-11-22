import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Save, FolderOpen, Sliders, X, ArrowRight } from 'lucide-react';
import { PlacedInstrument, useWizardStore } from '../../stores/useWizardStore';
import { useDispositionStore } from '../../stores/useDispositionStore';
import { useAuth } from '../../contexts/AuthContext';
import { Language } from '../../types';
import { t } from './wizardConstants';
import { playWizardSpatialHit } from './audio/wizardSpatialPreview';
import { useWizardDragDrop } from './useWizardDragDrop';
import { WizardInstrumentsRack } from './WizardInstrumentsRack';
import { WizardStageCanvas } from './WizardStageCanvas';
import { WizardExpressFormationsBar } from './WizardExpressFormationsBar';
import { SaveDispositionModal } from './SaveDispositionModal';
import { LoadDispositionModal } from './LoadDispositionModal';
import { BaqueLutherieBench } from '../oficina/BaqueLutherieBench';

interface WizardStep1SpatialProps {
  wizardLang: Language;
  placedInstruments: PlacedInstrument[];
  hasToada: boolean;
  hasApito: boolean;
  onToggleToada: () => void;
  onToggleApito: () => void;
  onToggleLang: () => void;
  onClose: () => void;
  onNext: () => void;
  showToast: (msg: string) => void;
}

export const WizardStep1Spatial: React.FC<WizardStep1SpatialProps> = ({
  wizardLang, placedInstruments, hasToada, hasApito, onToggleToada, onToggleApito, onToggleLang, onClose, onNext, showToast,
}) => {
  const { userProfile } = useAuth();
  const removePlacedInstrument = useWizardStore((s) => s.removePlacedInstrument);
  const dispositions = useDispositionStore((s) => s.dispositions);
  const syncCloudDispositions = useDispositionStore((s) => s.syncCloudDispositions);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isLutherieOpen, setIsLutherieOpen] = useState(false);
  const [placeSize, setPlaceSize] = useState({ width: 0, height: 0 });

  const { placeRef, ghostRef, dismissZoneRef, handlePalettePointerDown, handlePlacedPointerDown, handlePointerMove, handlePointerUp } =
    useWizardDragDrop(wizardLang, showToast);
  const handleToggleMestreApito = () => { if (!hasApito) playWizardSpatialHit('apito', 50, 100); onToggleApito(); };

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

  const handleContinue = () => {
    if (placedInstruments.length === 0 && !hasToada && !hasApito) { showToast(t[wizardLang].poseAuMoinsUn); return; }
    onNext();
  };

  const modalRoot = document.getElementById('modal-root') || document.body;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative select-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <div ref={ghostRef} className="pointer-events-none fixed items-center justify-center flex-col select-none" style={{ display: 'none', zIndex: 100025 }} />
      <div ref={dismissZoneRef} className="fixed top-16 left-1/2 -translate-x-1/2 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] px-5 py-2 shadow-[4px_4px_0px_var(--cordel-shadow-color)] z-[100024] transition-all duration-200 pointer-events-none opacity-0 select-none flex items-center gap-2 font-cactus font-bold uppercase text-xs" style={{ transform: 'translate(-50%, -150%)' }}>
        <LogOut size={15} />
        <span>{t[wizardLang].congedier}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 flex-shrink-0">
        <div className="text-[11px] font-cactus font-bold uppercase text-[var(--cordel-text-muted)]">
          {t[wizardLang].step1Sub} • <span className="text-[var(--cordel-accent-readable)]">{placedInstruments.length + (hasApito ? 1 : 0)} {wizardLang === 'fr' ? 'instrument(s)' : 'instrumento(s)'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setIsLutherieOpen(true)} className="px-2.5 py-1 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
            <Sliders size={13} />
            <span>{wizardLang === 'fr' ? 'Afinação & Lutherie' : 'Afinação & Lutheria'}</span>
          </button>
          <button type="button" onClick={() => setIsSaveModalOpen(true)} disabled={placedInstruments.length === 0 && !hasApito} className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors">
            <Save size={13} />
            <span>{t[wizardLang].enregistrerDisposition}</span>
          </button>
          <button type="button" onClick={() => setIsLoadModalOpen(true)} className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
            <FolderOpen size={13} />
            <span>{t[wizardLang].dispositionsTitle}</span>
            <span className="px-1.5 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] rounded-full text-[9px] font-mono font-bold leading-none">{dispositions.length}</span>
          </button>
          <button type="button" onClick={onToggleLang} className="hidden" aria-hidden="true">{wizardLang}</button>
          <button type="button" onClick={onClose} className="hidden" aria-hidden="true">{t[wizardLang].annuler}</button>
        </div>
      </div>

      <WizardExpressFormationsBar wizardLang={wizardLang} placedCount={placedInstruments.length} showToast={showToast} />

      <div className="flex-1 flex flex-col md:flex-row gap-3.5 min-h-0 mt-2.5">
        <WizardInstrumentsRack wizardLang={wizardLang} hasToada={hasToada} hasApito={hasApito} placedInstruments={placedInstruments} onToggleToada={onToggleToada} onToggleApito={handleToggleMestreApito} onPalettePointerDown={handlePalettePointerDown} />
        <WizardStageCanvas placeRef={placeRef} placeSize={placeSize} placedInstruments={placedInstruments} hasToada={hasToada} hasApito={hasApito} wizardLang={wizardLang} onToggleApito={handleToggleMestreApito} onPlacedPointerDown={handlePlacedPointerDown} onRemovePlaced={removePlacedInstrument} />
      </div>

      <div className="mt-3 pt-2.5 border-t-2 border-[var(--cordel-border)] flex flex-wrap justify-between items-center gap-2 flex-shrink-0">
        <div className="text-[10px] md:text-xs text-[var(--cordel-text-muted)] font-cactus font-bold">{t[wizardLang].infoRetirer}</div>
        <button type="button" onClick={handleContinue} className="px-6 py-2 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider flex items-center gap-2 transition-colors">
          <span>{t[wizardLang].suivant}</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {isLutherieOpen && createPortal(
        <div data-wizard-submodal="true" className="fixed inset-0 z-[100028] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsLutherieOpen(false); }}>
          <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] shadow-[8px_8px_0px_var(--cordel-shadow-color)] max-w-5xl w-full max-h-[85vh] overflow-y-auto p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border-strong)] pb-2">
              <h3 className="font-cactus font-bold uppercase text-base md:text-lg text-[var(--cordel-accent-readable)]">
                {wizardLang === 'fr' ? 'Banc de Lutherie & Accordage du Baque' : 'Bancada de Lutheria & Afinação do Baque'}
              </h3>
              <button type="button" onClick={() => setIsLutherieOpen(false)} className="p-1.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>
            <BaqueLutherieBench lang={wizardLang} mode="wizard" />
          </div>
        </div>,
        modalRoot
      )}

      <SaveDispositionModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} lang={wizardLang} onSuccess={(p) => showToast(wizardLang === 'fr' ? `Disposition « ${p} » enregistrée !` : `Disposição « ${p} » salva!`)} />
      <LoadDispositionModal isOpen={isLoadModalOpen} onClose={() => setIsLoadModalOpen(false)} lang={wizardLang} onLoaded={(p) => showToast(wizardLang === 'fr' ? `Disposition « ${p} » chargée sur La Place !` : `Disposição « ${p} » carregada no Palco!`)} />
    </div>
  );
};
