import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Language, RhythmSignal } from '../types';
import { useWizardStore } from '../stores/useWizardStore';
import { useSequencer } from '../contexts/SequencerContext';
import { WizardStep1Spatial } from './wizard/WizardStep1Spatial';
import { WizardStep2Identity } from './wizard/WizardStep2Identity';
import { useWizardGeneration } from './wizard/useWizardGeneration';

interface WizardOverlayProps {
  onClose: () => void;
  lang: Language;
}

export const WizardOverlay: React.FC<WizardOverlayProps> = ({ onClose, lang }) => {
  const wizardLang = useWizardStore((state) => state.wizardLang);
  const toggleWizardLang = useWizardStore((state) => state.toggleWizardLang);
  const step = useWizardStore((state) => state.step);
  const setStep = useWizardStore((state) => state.setStep);
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const hasToada = useWizardStore((state) => state.hasToada);
  const toggleToada = useWizardStore((state) => state.toggleToada);

  const sequencer = useSequencer();
  const [localToast, setLocalToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [customSignalsMap, setCustomSignalsMap] = useState<Record<string, RhythmSignal>>({});

  useEffect(() => {
    if (wizardLang !== lang) toggleWizardLang();
  }, [lang, wizardLang, toggleWizardLang]);

  const showLocalToast = (message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setLocalToast(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setLocalToast(null);
      toastTimeoutRef.current = null;
    }, 4000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { generateRodaFromWizard } = useWizardGeneration(wizardLang, customSignalsMap, sequencer);

  const modalRoot = document.getElementById('modal-root') || document.body;

  const toastElement = localToast && (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-bounce">
      <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] p-4 rounded-sm flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1 text-xs md:text-sm font-bold text-[#8b2a1a] leading-tight font-cactus uppercase tracking-wide">
          {localToast}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <>
      {toastElement}
      {step === 1 ? (
        <WizardStep1Spatial
          wizardLang={wizardLang}
          placedInstruments={placedInstruments}
          hasToada={hasToada}
          onToggleToada={toggleToada}
          onClose={onClose}
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
    </>,
    modalRoot
  );
};
