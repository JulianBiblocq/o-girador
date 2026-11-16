import React from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { LUTHERIE_DRUM_ROLES } from '../../utils/audio/lutherieFactoryPresets';
import { BaqueLutherieBench } from '../oficina/BaqueLutherieBench';
import { t } from './wizardConstants';
import { Language } from '../../types';

interface WizardStep2TuningProps {
  wizardLang: Language;
}

export const WizardStep2Tuning: React.FC<WizardStep2TuningProps> = ({ wizardLang }) => {
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const alfaiaGroupingMode = useWizardStore((state) => state.alfaiaGroupingMode);
  const setAlfaiaGroupingMode = useWizardStore((state) => state.setAlfaiaGroupingMode);

  const hasPlacedAlfaias = placedInstruments.some(
    (i) => i.instrumentType === 'marcante' || i.instrumentType === 'meiao' || i.instrumentType === 'repique'
  );

  const hasTuneableDrums = placedInstruments.some((i) =>
    (LUTHERIE_DRUM_ROLES as readonly string[]).includes(i.instrumentType)
  );

  return (
    <>
      {hasPlacedAlfaias && (
        <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border-strong)] p-4 md:p-5 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3 rounded-sm">
          <h3 className="font-cactus text-base md:text-lg font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider border-b border-[var(--cordel-border)] pb-1">
            {t[wizardLang].jeuAlfaias}
          </h3>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] md:text-xs text-[var(--cordel-text-muted)] font-cactus font-bold uppercase">
              {t[wizardLang].commentAlfaias}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setAlfaiaGroupingMode('bloc')}
                className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)] ${
                  alfaiaGroupingMode === 'bloc'
                    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
                    : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-[var(--cordel-border-strong)] hover:border-[var(--cordel-accent-readable)]'
                }`}
              >
                <div className="text-xs md:text-sm mb-1">{t[wizardLang].enBloc}</div>
                <div className="text-[10px] leading-tight mt-1 opacity-85">{t[wizardLang].enBlocDesc}</div>
              </button>
              <button
                type="button"
                onClick={() => setAlfaiaGroupingMode('distinct')}
                className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)] ${
                  alfaiaGroupingMode === 'distinct'
                    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
                    : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-[var(--cordel-border-strong)] hover:border-[var(--cordel-accent-readable)]'
                }`}
              >
                <div className="text-xs md:text-sm mb-1">{t[wizardLang].phrasesDistinctes}</div>
                <div className="text-[10px] leading-tight mt-1 opacity-85">{t[wizardLang].phrasesDistinctesDesc}</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {hasTuneableDrums && (
        <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border-strong)] p-4 md:p-5 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3.5 rounded-sm">
          <div className="border-b border-[var(--cordel-border)] pb-1.5">
            <h3 className="font-cactus text-base md:text-lg font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider">
              {t[wizardLang].afinacaoTitle}
            </h3>
            <p className="text-[10px] md:text-xs text-[var(--cordel-text-muted)]">{t[wizardLang].afinacaoDesc}</p>
          </div>
          <BaqueLutherieBench lang={wizardLang} mode="wizard" />
        </div>
      )}
    </>
  );
};
