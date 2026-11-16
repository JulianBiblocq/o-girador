import React from 'react';
import { X } from 'lucide-react';
import { Language } from '../../types';
import { t } from './wizardConstants';

interface WizardHeaderStepperProps {
  wizardLang: Language;
  step: number;
  canAdvance: boolean;
  onSelectStep: (targetStep: number) => void;
  onBlockedAdvance: () => void;
  onToggleLang: () => void;
  onClose: () => void;
}

export const WizardHeaderStepper: React.FC<WizardHeaderStepperProps> = ({
  wizardLang,
  step,
  canAdvance,
  onSelectStep,
  onBlockedAdvance,
  onToggleLang,
  onClose,
}) => {
  const steps = [
    { num: 1, label: t[wizardLang].step1Short },
    { num: 2, label: t[wizardLang].step2Short },
    { num: 3, label: t[wizardLang].step3Short },
  ];

  const subtitle =
    step === 1
      ? t[wizardLang].step1Sub
      : step === 2
        ? t[wizardLang].step2Sub
        : t[wizardLang].step3Sub;

  const handleStepClick = (targetNum: number) => {
    if (targetNum === 1 || canAdvance) onSelectStep(targetNum);
    else onBlockedAdvance();
  };

  return (
    <div className="flex flex-wrap justify-between items-center gap-2 border-b-2 border-[var(--cordel-border-strong)] pb-2.5 mb-3 flex-shrink-0">
      <div className="min-w-0">
        <h2 className="font-cactus text-lg md:text-2xl font-bold text-[var(--cordel-text)] uppercase tracking-wider leading-none">
          {t[wizardLang].title}
        </h2>
        <p className="text-[10px] md:text-xs text-[var(--cordel-text-muted)] font-cactus font-bold uppercase tracking-wide mt-0.5 truncate">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-1.5 order-3 sm:order-2 w-full sm:w-auto justify-center">
        {steps.map((item, idx) => {
          const isActive = step === item.num;
          const isLocked = item.num > 1 && !canAdvance;
          return (
            <React.Fragment key={item.num}>
              <button
                type="button"
                onClick={() => handleStepClick(item.num)}
                className={`px-2.5 py-1 border-2 font-cactus font-bold uppercase text-[10px] md:text-xs tracking-wide transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
                    : isLocked
                      ? 'bg-[var(--cordel-surface)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)] opacity-60'
                      : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-[var(--cordel-border-strong)] hover:border-[var(--cordel-accent-readable)]'
                }`}
              >
                <span className="font-mono font-bold">{item.num}.</span>
                <span className="hidden md:inline">{item.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <span className="text-[var(--cordel-text-muted)] text-xs font-bold select-none">·</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center gap-2 order-2 sm:order-3">
        <button
          type="button"
          onClick={onToggleLang}
          className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs"
        >
          {wizardLang === 'fr' ? 'BR' : 'FR'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-status-danger)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1 transition-colors"
        >
          <X size={14} />
          <span>{t[wizardLang].annuler}</span>
        </button>
      </div>
    </div>
  );
};
