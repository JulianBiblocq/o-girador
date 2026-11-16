import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useWizardStore } from '../../stores/useWizardStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAuth } from '../../contexts/AuthContext';
import { uploadMestreSignal } from '../../cloudSignals';
import { CordelImageEditor } from '../CordelImageEditor';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';
import { Language, RhythmSignal } from '../../types';
import { CordelOptions } from '../../utils/cordelEffect';
import { t } from './wizardConstants';
import { WizardLivePreviewBar } from './WizardLivePreviewBar';
import { WizardStep3StructureSelector } from './WizardStep3StructureSelector';
import { WizardStep2SongInfo } from './WizardStep2SongInfo';
import { WizardStep2Signs } from './WizardStep2Signs';
import { WizardLivePreviewController } from './audio/useWizardLivePreview';

interface WizardStep2IdentityProps {
  wizardLang: Language;
  preview: WizardLivePreviewController;
  customSignalsMap: Record<string, RhythmSignal>;
  onBack: () => void;
  onGenerate: () => void;
  onSaveCustomSignal: (signal: RhythmSignal) => void;
}

export const WizardStep2Identity: React.FC<WizardStep2IdentityProps> = ({
  wizardLang,
  preview,
  customSignalsMap,
  onBack,
  onGenerate,
  onSaveCustomSignal,
}) => {
  const { userProfile } = useAuth();
  const bpm = useWizardStore((state) => state.bpm);
  const toggleSignId = useWizardStore((state) => state.toggleSignId);

  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);

  const handlePhotoBoothSave = (d: {
    name: string; image: string; frames: string[]; rawFrames?: string[];
    cordelOptions?: CordelOptions; frameOverrides?: Record<number, Partial<CordelOptions>>;
    beatsCount: number; mirrorHorizontal?: boolean;
  }) => {
    const localSig: RhythmSignal = {
      id: d.image, name: d.name, image: d.image, frames: d.frames,
      rawFrames: d.rawFrames, cordelOptions: d.cordelOptions,
      frameOverrides: d.frameOverrides, beatsCount: d.beatsCount, mirrorHorizontal: d.mirrorHorizontal,
    };
    onSaveCustomSignal(localSig);
    toggleSignId(d.image);
    setIsPhotoBoothOpen(false);
    if (userProfile?.uid) {
      void uploadMestreSignal(
        userProfile.uid, d.name, d.image, d.frames, d.beatsCount,
        d.mirrorHorizontal, d.rawFrames, d.cordelOptions, d.frameOverrides
      ).then((res) => {
        if (res.success && res.signal) {
          const cur = useSequencerStore.getState().mestreSignals || [];
          useSequencerStore.getState().setMestreSignals([res.signal, ...cur]);
        }
      }).catch(() => {});
    }
  };

  const handleSignalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setRawSignalFrames([ev.target?.result as string]);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const modalRoot = document.getElementById('modal-root') || document.body;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {rawSignalFrames.length > 0 &&
        createPortal(
          <div data-wizard-submodal="true" className="fixed inset-0 bg-black/70 z-[100028] flex items-center justify-center p-4">
            <div className="bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-3 border-[var(--cordel-border-strong)] p-4 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_var(--cordel-shadow-color)]">
              <CordelImageEditor
                frames={rawSignalFrames}
                lang={wizardLang}
                onComplete={(res) => {
                  onSaveCustomSignal({ id: res, name: 'Signe', image: res });
                  toggleSignId(res);
                  setRawSignalFrames([]);
                }}
                onCancel={() => setRawSignalFrames([])}
              />
            </div>
          </div>,
          modalRoot
        )}

      <MusicalPhotoBoothModal isOpen={isPhotoBoothOpen} onClose={() => setIsPhotoBoothOpen(false)} onSave={handlePhotoBoothSave} initialBpm={bpm} lang={wizardLang} />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full pb-6">
          <WizardLivePreviewBar wizardLang={wizardLang} preview={preview} />
          <WizardStep3StructureSelector wizardLang={wizardLang} />
          <WizardStep2SongInfo wizardLang={wizardLang} />
          <WizardStep2Signs
            wizardLang={wizardLang}
            customSignalsMap={customSignalsMap}
            onOpenPhotoBooth={() => setIsPhotoBoothOpen(true)}
            onSignalFileChange={handleSignalFileChange}
          />
        </div>
      </div>

      <div className="flex justify-between items-center gap-3 border-t-2 border-[var(--cordel-border-strong)] pt-3 mt-2 flex-shrink-0 max-w-3xl mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>{t[wizardLang].retour}</span>
        </button>

        <button
          type="button"
          onClick={onGenerate}
          className="px-6 py-3 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-3 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer font-cactus font-bold uppercase text-sm md:text-base tracking-wider flex items-center gap-2 transition-colors"
        >
          <CheckCircle2 size={18} />
          <span>{t[wizardLang].faireSonner}</span>
        </button>
      </div>
    </div>
  );
};
