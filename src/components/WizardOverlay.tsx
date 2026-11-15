import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { Language, RhythmSignal } from '../types';
import { useWizardStore } from '../stores/useWizardStore';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { t } from './wizard/wizardConstants';
import { WizardStep1Spatial } from './wizard/WizardStep1Spatial';
import { WizardStep2Identity } from './wizard/WizardStep2Identity';
import { useWizardGeneration } from './wizard/useWizardGeneration';
import { stopAllWizardSpatialNodes } from './wizard/audio/wizardSpatialPreview';

interface WizardOverlayProps {
  onClose: () => void;
  lang: Language;
}

export const WizardOverlay: React.FC<WizardOverlayProps> = ({ onClose, lang }) => {
  const { userProfile } = useAuth();
  const wizardLang = useWizardStore((s) => s.wizardLang);
  const toggleWizardLang = useWizardStore((s) => s.toggleWizardLang);
  const step = useWizardStore((s) => s.step);
  const setStep = useWizardStore((s) => s.setStep);
  const placedInstruments = useWizardStore((s) => s.placedInstruments);
  const hasToada = useWizardStore((s) => s.hasToada);
  const toggleToada = useWizardStore((s) => s.toggleToada);
  const initFromUserProfile = useWizardStore((s) => s.initFromUserProfile);

  const sequencer = useSequencer();
  const [localToast, setLocalToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [customSignalsMap, setCustomSignalsMap] = useState<Record<string, RhythmSignal>>({});

  useEffect(() => {
    if (wizardLang !== lang) toggleWizardLang();
  }, [lang]);

  useEffect(() => {
    initFromUserProfile({ groupName: userProfile?.groupName, displayName: userProfile?.displayName });
  }, [userProfile?.groupName, userProfile?.displayName, initFromUserProfile]);

  useEffect(() => () => { stopAllWizardSpatialNodes(); }, []);

  const showLocalToast = (message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setLocalToast(message);
    toastTimeoutRef.current = window.setTimeout(() => { setLocalToast(null); toastTimeoutRef.current = null; }, 3500);
  };

  const handleSafeClose = () => {
    stopAllWizardSpatialNodes();
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-wizard-submodal="true"]')) return;
      if (document.querySelector('.z-\\[100030\\], .z-\\[100040\\], .z-\\[100050\\]')) return;
      handleSafeClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { generateRodaFromWizard } = useWizardGeneration(wizardLang, customSignalsMap, sequencer);
  const modalRoot = document.getElementById('modal-root') || document.body;

  return createPortal(
    <>
      {localToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100045] max-w-md w-full px-4 pointer-events-none">
          <div className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-3 border-[var(--cordel-border-strong)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] px-4 py-3 rounded-sm flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <div className="flex-1 text-xs font-bold leading-snug font-cactus uppercase tracking-wide">{localToast}</div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] z-[100020] flex flex-col p-3 md:p-6 select-none font-sans overflow-hidden">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b-2 border-[var(--cordel-border-strong)] pb-2.5 mb-3 flex-shrink-0">
          <h2 className="font-cactus text-xl md:text-2xl font-bold text-[var(--cordel-text)] uppercase tracking-wider leading-none">
            {t[wizardLang].title}
          </h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleWizardLang} className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs">
              {wizardLang === 'fr' ? 'BR' : 'FR'}
            </button>
            <button type="button" onClick={handleSafeClose} className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-status-danger)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1 transition-colors">
              <X size={14} />
              <span>{t[wizardLang].annuler}</span>
            </button>
          </div>
        </div>

        {step === 1 ? (
          <WizardStep1Spatial
            wizardLang={wizardLang}
            placedInstruments={placedInstruments}
            hasToada={hasToada}
            onToggleToada={toggleToada}
            onToggleLang={toggleWizardLang}
            onClose={handleSafeClose}
            onNext={() => setStep(2)}
            showToast={showLocalToast}
          />
        ) : (
          <WizardStep2Identity
            wizardLang={wizardLang}
            onBack={() => setStep(1)}
            onToggleLang={toggleWizardLang}
            onGenerate={generateRodaFromWizard}
            onSaveCustomSignal={(sig) => setCustomSignalsMap((prev) => ({ ...prev, [sig.id]: sig }))}
          />
        )}
      </div>
    </>,
    modalRoot
  );
};
