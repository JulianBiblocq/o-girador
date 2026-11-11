/**
 * BusCompHeaderControl.tsx — Mini-contrôleur `[⏻] COMP/GR [▸]` de la barre d'insert des Bus (< 100 lignes).
 * Tient dans la hauteur exacte de la barre (h-[18px] dans h-5) : 0 px de décalage vertical avec les pistes.
 * Sélecteurs Zustand atomiques par `trackId` (0 abonnement global à `tracks`).
 */
import React, { useCallback } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useBusDynamicsUiStore } from '../../../stores/busDynamicsUiStore';
import { BusCompMixSlider } from './BusCompMixSlider';
import { getArchetypeDefaultMix } from './busCompMixGesture';
import { getArchetypeLabel, getBusDynamicsStrings } from './busDynamicsI18n';

interface BusCompHeaderControlProps {
  trackId: number;
  lang: string;
  isPlaying: boolean;
  /** Ouverture du panneau PC Studio (Mission 3.C) ; par défaut : micro-store UI lu par ConsoleMixer. */
  onOpenBusDynamics?: (trackId: number) => void;
}

const BusCompHeaderControlComponent: React.FC<BusCompHeaderControlProps> = ({ trackId, lang, isPlaying, onOpenBusDynamics }) => {
  const comp = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === trackId)?.busCompressor, [trackId]));
  const ecoDisableFx = useSequencerStore((s) => Boolean(s.ecoConfig?.disableFx));
  const studioPanelsEnabled = useBusDynamicsUiStore((s) => s.studioPanelsEnabled);
  const s = getBusDynamicsStrings(lang);

  const enabled = Boolean(comp?.enabled);
  const lit = enabled && !ecoDisableFx;
  const mixPct = comp?.mixPct ?? getArchetypeDefaultMix(undefined);
  const stateLabel = enabled ? (ecoDisableFx ? s.compStateEco : s.compStateOn) : s.compStateOff;
  const archLabel = comp ? getArchetypeLabel(s, comp.archetype) : s.archAuto;
  const title = `${s.compLabel} — ${stateLabel}\n${s.compArchetype} : ${archLabel}\n${s.compMix} : ${mixPct} %\n${s.compGesture}`;

  const powerClass = lit
    ? 'bg-[var(--fx-comp-accent)] text-[var(--fx-comp-active-text)] border-[var(--fx-comp-accent)]'
    : enabled
      ? 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/40 border-[var(--cordel-border)]/30 opacity-60'
      : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/70 border-[var(--cordel-border)]/30';

  return (
    <div className="flex-1 min-w-0 h-[18px] flex items-center gap-[2px]">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().toggleBusCompressor(trackId); }}
        aria-pressed={enabled}
        aria-label={s.compPowerTitle}
        title={`${s.compPowerTitle} — ${stateLabel} (${archLabel})`}
        className={`w-4 h-[18px] shrink-0 flex items-center justify-center rounded-sm cordel-border-sm cursor-pointer transition-colors ${powerClass}`}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="pointer-events-none">
          <path d="M12 3v8" />
          <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
        </svg>
      </button>

      <BusCompMixSlider
        trackId={trackId}
        mixPct={mixPct}
        lit={lit}
        grActive={isPlaying && lit}
        label={s.compLabel}
        title={title}
      />

      {studioPanelsEnabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            (onOpenBusDynamics ?? useBusDynamicsUiStore.getState().openBusDynamics)(trackId);
          }}
          aria-label={s.compOpenPanel}
          title={s.compOpenPanel}
          className="w-[14px] h-[18px] shrink-0 flex items-center justify-center rounded-sm cordel-border-sm cursor-pointer bg-[var(--cordel-bg)] text-[var(--cordel-text)]/70 border-[var(--cordel-border)]/30"
        >
          <svg width="7" height="10" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
            <path d="M2 2 L6 6 L2 10" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const BusCompHeaderControl = React.memo(BusCompHeaderControlComponent);

