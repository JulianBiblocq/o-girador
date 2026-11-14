/**
 * BusDynamicsHeader.tsx — En-tête identitaire Cordel de `BusDynamicsModal` (< 120 lignes).
 * Pastille couleur + nom du Bus, Power `[ON/OFF]`, Polarité miroir `[Ø 180°]`, `[Réinitialiser]`, `[X]` & bandeau Éco.
 */
import React from 'react';
import type { BusDynamicsModalStrings } from './busDynamicsModalI18n';

interface BusDynamicsHeaderProps {
  busTitle: string;
  busColor: string;
  enabled: boolean;
  phaseInverted: boolean;
  disableFx: boolean;
  s: BusDynamicsModalStrings;
  onTogglePower: () => void;
  onTogglePolarity: () => void;
  onResetArchetype: () => void;
  onClose: () => void;
}

export const BusDynamicsHeader: React.FC<BusDynamicsHeaderProps> = ({
  busTitle, busColor, enabled, phaseInverted, disableFx, s,
  onTogglePower, onTogglePolarity, onResetArchetype, onClose,
}) => {
  const lit = enabled && !disableFx;
  return (
    <div className="flex flex-col w-full bg-[var(--master-header-bg)] text-[var(--master-header-text)] border-b-[3px] border-[var(--cordel-border)] shrink-0 select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0 border-2 border-[var(--master-border)] rounded-none"
            style={{ backgroundColor: busColor }}
          />
          <div className="flex flex-col min-w-0">
            <span className="font-cactus font-black text-sm md:text-base tracking-widest uppercase truncate">
              {busTitle}
            </span>
            <span className="text-[9.5px] font-cactus uppercase tracking-wider opacity-75 truncate">
              {s.modalSubtitle}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid="bus-dynamics-power-btn"
            aria-pressed={enabled}
            title={s.powerTitle}
            onClick={onTogglePower}
            className={`px-2.5 py-1 border rounded-none font-cactus font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
              lit
                ? 'bg-[var(--fx-comp-accent)] text-[var(--fx-comp-active-text)] border-[var(--fx-comp-accent)]'
                : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="pointer-events-none">
              <path d="M12 3v8" />
              <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
            <span>{enabled ? s.powerOnLabel : s.powerOffLabel}</span>
          </button>

          <button
            type="button"
            data-testid="bus-dynamics-polarity-btn"
            aria-pressed={phaseInverted}
            title={s.polarityBtnTitle}
            onClick={onTogglePolarity}
            className={`px-2 py-1 border rounded-none font-mono font-black text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${
              phaseInverted
                ? 'bg-[var(--polarity-active-bg)] text-[var(--polarity-active-text)] border-[var(--polarity-active-bg)]'
                : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none">
              <circle cx="12" cy="12" r="7" />
              <path d="M5 19 L19 5" />
            </svg>
            <span>{s.polarityBtnLabel}</span>
          </button>

          <button
            type="button"
            data-testid="bus-dynamics-reset-btn"
            title={s.resetTitle}
            onClick={onResetArchetype}
            className="px-2.5 py-1 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>{s.resetBtn}</span>
          </button>

          <button
            type="button"
            data-testid="bus-dynamics-close-btn"
            title={s.closeTitle}
            onClick={onClose}
            className="p-1 bg-[var(--cordel-wood)] hover:opacity-90 text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)] rounded-none transition-opacity cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="pointer-events-none">
              <path d="M18 6 L6 18 M6 6 L18 18" />
            </svg>
          </button>
        </div>
      </div>

      {disableFx && (
        <div data-testid="bus-dynamics-eco-banner" className="w-full px-3 py-1.5 bg-[var(--vu-level-warn)] text-[var(--cordel-ink-dark)] font-cactus font-bold text-[10px] uppercase tracking-wider border-t border-[var(--cordel-ink-dark)]">
          {s.ecoBanner}
        </div>
      )}
    </div>
  );
};

