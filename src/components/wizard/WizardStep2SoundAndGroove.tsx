import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Language } from '../../types';
import { t } from './wizardConstants';
import { WizardLivePreviewBar } from './WizardLivePreviewBar';
import { WizardStep2Foundation } from './WizardStep2Foundation';
import { WizardStep2Tuning } from './WizardStep2Tuning';
import { WizardStep2Balanco } from './WizardStep2Balanco';
import { WizardLivePreviewController } from './audio/useWizardLivePreview';

interface WizardStep2SoundAndGrooveProps {
  wizardLang: Language;
  preview: WizardLivePreviewController;
  onBack: () => void;
  onNext: () => void;
}

export const WizardStep2SoundAndGroove: React.FC<WizardStep2SoundAndGrooveProps> = ({
  wizardLang,
  preview,
  onBack,
  onNext,
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full pb-6">
          <WizardLivePreviewBar wizardLang={wizardLang} preview={preview} />
          <WizardStep2Foundation wizardLang={wizardLang} />
          <WizardStep2Tuning wizardLang={wizardLang} />
          <WizardStep2Balanco wizardLang={wizardLang} />
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
          onClick={onNext}
          className="px-5 py-2.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer font-cactus font-bold uppercase text-xs md:text-sm tracking-wider flex items-center gap-1.5 transition-colors"
        >
          <span>{t[wizardLang].suivant}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
