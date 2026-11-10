import React from 'react';
import { usePerformanceStore } from '../stores/usePerformanceStore';
import { useSequencerStore } from '../stores/useSequencerStore';

const TIER_FILL = ['bg-[var(--eco-tier-off)]', 'bg-[var(--eco-tier-1)]', 'bg-[var(--eco-tier-2)]'] as const;

/**
 * Voyant plein du palier Eco (jetons --eco-tier-* de theme-tokens.css), lisible sur le bouton
 * sombre de L'Atelier : vert = Eco Off, ocre = Palier 1 (visuel), orange cuivre = Palier 2 (audio).
 */
export const MiniTelemetryBadge: React.FC = () => {
  const lang = useSequencerStore((state) => state.lang) || 'fr';
  const isEcoMode = useSequencerStore((state) => Boolean(state.isEcoMode));
  const isStrictAudio = useSequencerStore((state) => Boolean(state.isEcoMode && state.ecoConfig?.disableFx && state.ecoConfig?.disableEq));
  const ram = usePerformanceStore((state) => state.ram);
  const cores = usePerformanceStore((state) => state.cores);

  const tier = !isEcoMode ? 0 : isStrictAudio ? 2 : 1;
  const isFr = lang === 'fr';
  const tierLabel = isFr
    ? ['Mode Éco désactivé — son et affichage complets', 'Mode Éco actif : affichage allégé, son 100 % intact', 'Mode Éco strict : affichage et effets audio allégés'][tier]
    : ['Modo Eco desativado — som e exibição completos', 'Modo Eco ativo: exibição leve, som 100 % intacto', 'Modo Eco estrito: exibição e efeitos de áudio aliviados'][tier];
  const ramLabel = ram !== undefined ? `${ram} ${isFr ? 'Go' : 'GB'}` : 'N/A';
  const hwLabel = `RAM : ${ramLabel} — ${isFr ? 'Cœurs CPU' : 'Núcleos CPU'} : ${cores ?? 'N/A'}`;

  return (
    <span
      className={`w-2.5 h-2.5 rounded-full shrink-0 inline-block ${TIER_FILL[tier]}`}
      title={`${tierLabel}\n${hwLabel}`}
      aria-label={tierLabel}
      data-testid="eco-tier-badge"
      data-eco-tier={tier}
    />
  );
};
