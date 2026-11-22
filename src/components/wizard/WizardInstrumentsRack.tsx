import React from 'react';
import { Check, Plus } from 'lucide-react';
import { ASSETS_BASE_URL } from '../../data';
import { AVAILABLE_INSTRUMENTS, t } from './wizardConstants';
import { PlacedInstrument } from '../../stores/useWizardStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { Language } from '../../types';

interface WizardInstrumentsRackProps {
  wizardLang: Language;
  hasToada: boolean;
  hasApito: boolean;
  placedInstruments: PlacedInstrument[];
  onToggleToada: () => void;
  onToggleApito: () => void;
  onPalettePointerDown: (e: React.PointerEvent<HTMLDivElement>, type: string) => void;
}

export const WizardInstrumentsRack: React.FC<WizardInstrumentsRackProps> = ({
  wizardLang,
  hasToada,
  hasApito,
  placedInstruments,
  onToggleToada,
  onToggleApito,
  onPalettePointerDown,
}) => {
  const resolveLabel = useInstrumentLabel();
  const apitoLabel = resolveLabel('apito') || 'Apito';

  return (
    <div className="flex-shrink-0 flex flex-col gap-2 md:w-56 min-h-0">
      <button
        type="button"
        onClick={onToggleToada}
        className={`flex items-center gap-2.5 p-2 border-2 shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors cursor-pointer rounded-sm select-none text-left ${
          hasToada
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
            : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[var(--cordel-accent-readable)]'
        }`}
      >
        <div
          className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 ${
            hasToada
              ? 'border-[var(--cordel-on-accent)] bg-black/25 text-[var(--cordel-on-accent)]'
              : 'border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-transparent'
          }`}
        >
          {hasToada ? <Check size={13} className="stroke-[3]" /> : null}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-cactus font-bold uppercase leading-tight truncate">
            {t[wizardLang].inclureChant}
          </span>
          <span className={`text-[9px] leading-tight truncate ${hasToada ? 'text-[var(--cordel-on-accent)]/85' : 'text-[var(--cordel-text-muted)]'}`}>
            {t[wizardLang].activerToada}
          </span>
        </div>
      </button>

      <button
        type="button"
        data-testid="wizard-rack-apito-toggle"
        aria-pressed={hasApito}
        onClick={onToggleApito}
        className={`flex items-center gap-2.5 p-2 border-2 shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors cursor-pointer rounded-sm select-none text-left ${
          hasApito
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
            : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[var(--cordel-accent-readable)]'
        }`}
      >
        <img
          src={`${ASSETS_BASE_URL}icones/apito.svg`}
          alt=""
          className={`w-6 h-6 object-contain p-0.5 rounded-full bg-[var(--cordel-paper-surface)] border border-[var(--cordel-border-strong)] shrink-0 ${hasApito ? 'opacity-100' : 'opacity-65'}`}
        />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[11px] font-cactus font-bold uppercase leading-tight truncate">
            {hasApito ? t[wizardLang].avecApito : apitoLabel}
          </span>
          <span className={`text-[9px] leading-tight truncate ${hasApito ? 'text-[var(--cordel-on-accent)]/85' : 'text-[var(--cordel-text-muted)]'}`}>
            {t[wizardLang].apitoMestreSub}
          </span>
        </div>
        {hasApito && <Check size={13} className="stroke-[3] shrink-0" />}
      </button>

      <div className="flex-1 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2 bg-[var(--cordel-surface)] border-2 border-dashed border-[var(--cordel-border)] rounded-sm custom-scrollbar">
        <div className="hidden md:block text-[9px] uppercase font-cactus font-bold text-[var(--cordel-text-muted)] pb-1 border-b border-[var(--cordel-border)]/40 mb-0.5">
          {t[wizardLang].instrumentsGlissables}
        </div>
        {AVAILABLE_INSTRUMENTS.map((inst) => {
          const count = placedInstruments.filter((p) => p.instrumentType === inst.id).length;
          const displayLabel = resolveLabel(inst.id) || inst.label;
          return (
            <div
              key={inst.id}
              onPointerDown={(e) => onPalettePointerDown(e, inst.id)}
              className="flex-shrink-0 flex md:flex-row flex-col items-center justify-between gap-1.5 md:gap-2.5 p-2 bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-bg)] border-2 shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-grab select-none rounded-sm text-center md:text-left touch-none group md:w-full min-w-[78px] md:min-w-0 transition-colors"
              style={{ borderColor: inst.color }}
            >
              <div className="flex md:flex-row flex-col items-center gap-1.5 md:gap-2.5 min-w-0">
                <img
                  src={inst.iconImg}
                  className="w-7 h-7 object-contain group-hover:scale-110 duration-200 pointer-events-none p-0.5 rounded-full bg-[var(--cordel-paper-surface)] shrink-0"
                  style={{ border: `2px solid ${inst.color}` }}
                  alt=""
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)] leading-tight truncate">
                    {displayLabel}
                  </span>
                  <span className="hidden md:inline text-[8px] text-[var(--cordel-text-muted)] leading-none mt-0.5">
                    {inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique'
                      ? 'Alfaia'
                      : wizardLang === 'pt' ? 'Percussão' : 'Percussion'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {count > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] rounded-full leading-none">
                    ×{count}
                  </span>
                )}
                <Plus size={12} className="hidden md:block text-[var(--cordel-text-muted)] group-hover:text-[var(--cordel-accent-readable)]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
