import React from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
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
    ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'].includes(i.instrumentType)
  );

  return (
    <>
      {hasPlacedAlfaias && (
        <div className="bg-[var(--cordel-bg)] border-3 border-[var(--cordel-text)] p-4 md:p-5 shadow-[4px_4px_0_var(--cordel-text)] flex flex-col gap-3 rounded-sm">
          <h3 className="font-cactus text-lg md:text-xl font-bold text-[var(--cordel-wood)] uppercase tracking-wider border-b border-[var(--cordel-text)]/20 pb-1">
            {t[wizardLang].jeuAlfaias}
          </h3>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] md:text-xs text-[var(--cordel-text)] font-cactus font-bold uppercase">
              {t[wizardLang].commentAlfaias}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setAlfaiaGroupingMode('bloc')}
                className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0px_var(--cordel-text)] ${
                  alfaiaGroupingMode === 'bloc'
                    ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-[var(--cordel-text)]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-text)]'
                }`}
              >
                <div className="text-xs md:text-sm mb-1">{t[wizardLang].enBloc}</div>
                <div className="text-[9px] leading-tight mt-1 opacity-75">{t[wizardLang].enBlocDesc}</div>
              </button>
              <button
                type="button"
                onClick={() => setAlfaiaGroupingMode('distinct')}
                className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0px_var(--cordel-text)] ${
                  alfaiaGroupingMode === 'distinct'
                    ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-[var(--cordel-text)]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-text)]'
                }`}
              >
                <div className="text-xs md:text-sm mb-1">{t[wizardLang].phrasesDistinctes}</div>
                <div className="text-[9px] leading-tight mt-1 opacity-75">{t[wizardLang].phrasesDistinctesDesc}</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {hasTuneableDrums && (
        <div className="bg-[var(--cordel-bg)] border-3 border-[var(--cordel-text)] p-4 md:p-5 shadow-[4px_4px_0_var(--cordel-text)] flex flex-col gap-4 rounded-sm">
          <div className="border-b border-[var(--cordel-text)]/20 pb-2">
            <h3 className="font-cactus text-lg md:text-xl font-bold text-[var(--cordel-wood)] uppercase tracking-wider">
              {t[wizardLang].afinacaoTitle}
            </h3>
            <p className="text-[10px] md:text-xs text-[var(--cordel-text)]/70">{t[wizardLang].afinacaoDesc}</p>
          </div>
          <BaqueLutherieBench lang={wizardLang} mode="wizard" />
        </div>
      )}
    </>
  );
};
