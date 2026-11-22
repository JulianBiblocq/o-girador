import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Language, RhythmSignal } from '../types';
import { useWizardStore } from '../stores/useWizardStore';
import { useBalancoStore } from '../stores/useBalancoStore';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { t } from './wizard/wizardConstants';
import { WizardHeaderStepper } from './wizard/WizardHeaderStepper';
import { WizardStep1Spatial } from './wizard/WizardStep1Spatial';
import { WizardStep2SoundAndGroove } from './wizard/WizardStep2SoundAndGroove';
import { WizardStep2Identity } from './wizard/WizardStep2Identity';
import { useWizardGeneration } from './wizard/useWizardGeneration';
import { useWizardLivePreview } from './wizard/audio/useWizardLivePreview';
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
  const hasApito = useWizardStore((s) => s.hasApito);
  const toggleApito = useWizardStore((s) => s.toggleApito);
  const initFromUserProfile = useWizardStore((s) => s.initFromUserProfile);

  const sequencer = useSequencer();
  const livePreview = useWizardLivePreview(sequencer);
  const [localToast, setLocalToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [customSignalsMap, setCustomSignalsMap] = useState<Record<string, RhythmSignal>>({});

  useEffect(() => { if (wizardLang !== lang) toggleWizardLang(); }, [lang]);

  useEffect(() => {
    initFromUserProfile({ groupName: userProfile?.groupName, displayName: userProfile?.displayName });
    if (userProfile?.uid) {
      void useBalancoStore.getState().syncCloudPresets(
        userProfile.uid, userProfile.groupId, userProfile.role, userProfile.mestreId, userProfile.canWriteSequenciador
      );
    }
  }, [userProfile?.uid, userProfile?.groupName, userProfile?.displayName, initFromUserProfile]);

  useEffect(() => () => { stopAllWizardSpatialNodes(); }, []);

  const showLocalToast = (msg: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setLocalToast(msg);
    toastTimeoutRef.current = window.setTimeout(() => { setLocalToast(null); toastTimeoutRef.current = null; }, 3500);
  };

  const handleSafeClose = () => {
    livePreview.stopPreview();
    stopAllWizardSpatialNodes();
    onClose();
  };

  const handleSelectStep = (targetStep: number) => {
    if (targetStep === 1) livePreview.stopPreview();
    setStep(targetStep);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-wizard-submodal="true"], .z-\\[100030\\], .z-\\[100040\\], .z-\\[100050\\]')) return;
      handleSafeClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { generateRodaFromWizard } = useWizardGeneration(wizardLang, customSignalsMap, sequencer);
  const handleGenerate = () => { livePreview.stopPreview(); void generateRodaFromWizard(); };
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
        <WizardHeaderStepper
          wizardLang={wizardLang}
          step={step}
          canAdvance={placedInstruments.length > 0 || hasToada || hasApito}
          onSelectStep={handleSelectStep}
          onBlockedAdvance={() => showLocalToast(t[wizardLang].poseAuMoinsUn)}
          onToggleLang={toggleWizardLang}
          onClose={handleSafeClose}
        />

        {step === 1 ? (
          <WizardStep1Spatial wizardLang={wizardLang} placedInstruments={placedInstruments} hasToada={hasToada} hasApito={hasApito} onToggleToada={toggleToada} onToggleApito={toggleApito} onToggleLang={toggleWizardLang} onClose={handleSafeClose} onNext={() => handleSelectStep(2)} showToast={showLocalToast} />
        ) : step === 2 ? (
          <WizardStep2SoundAndGroove wizardLang={wizardLang} preview={livePreview} onBack={() => handleSelectStep(1)} onNext={() => handleSelectStep(3)} />
        ) : (
          <WizardStep2Identity wizardLang={wizardLang} preview={livePreview} customSignalsMap={customSignalsMap} onBack={() => handleSelectStep(2)} onGenerate={handleGenerate} onSaveCustomSignal={(sig) => setCustomSignalsMap((prev) => ({ ...prev, [sig.id]: sig }))} />
        )}
      </div>
    </>,
    modalRoot
  );
};
