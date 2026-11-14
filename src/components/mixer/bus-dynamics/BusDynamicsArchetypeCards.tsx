/**
 * BusDynamicsArchetypeCards.tsx — 4 Cartes d'Archétypes Maracatu à gravures SVG monochromes (< 120 lignes).
 * Affiche l'archétype actif ou le badge `Sur-mesure / Personalizado` lorsque `archetype === 'custom'`.
 */
import React from 'react';
import { BUS_COMPRESSOR_ARCHETYPES } from '../../../audio/effects/busCompressorArchetypes';
import type { BusCompressorArchetypeId, BusCompressorPresetArchetypeId } from '../../../audio/effects/busCompressorTypes';
import type { BusDynamicsModalStrings } from './busDynamicsModalI18n';

interface BusDynamicsArchetypeCardsProps {
  activeArchetype: BusCompressorArchetypeId;
  onSelectArchetype: (arch: BusCompressorPresetArchetypeId) => void;
  s: BusDynamicsModalStrings;
}

const ArchetypeWoodcutIcon: React.FC<{ id: BusCompressorPresetArchetypeId }> = ({ id }) => {
  if (id === 'alfaias_glue') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="7" ry="2.2" />
        <path d="M5 5v14c0 1.2 3.1 2.2 7 2.2s7-1 7-2.2V5" />
        <path d="M5 8h14M5 16h14M7 8l3 8 4-8 3 8" />
      </svg>
    );
  }
  if (id === 'caixas_carpet') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="7.5" rx="8" ry="2.5" />
        <path d="M4 7.5v8c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-8" />
        <path d="M6 12h12M7 14h10M8 4l6 4M16 4l-6 4" />
      </svg>
    );
  }
  if (id === 'sementes_control') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3h4l1 4a6.5 6.5 0 1 1-6 0l1-4Z" />
        <path d="M7 11h10M6.5 15h11M9.5 8l5 10M14.5 8l-5 10" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="6" height="10" rx="3" />
      <path d="M4 11a5 5 0 0 0 10 0M9 16v4M6 20h6" />
      <path d="M16.5 7.5a5 5 0 0 1 0 7M19.5 5a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
};

export const BusDynamicsArchetypeCards: React.FC<BusDynamicsArchetypeCardsProps> = ({
  activeArchetype, onSelectArchetype, s,
}) => {
  const cards: Array<{ id: BusCompressorPresetArchetypeId; title: string; desc: string }> = [
    { id: 'alfaias_glue', title: s.archAlfaiasTitle, desc: s.archAlfaiasDesc },
    { id: 'caixas_carpet', title: s.archCaixasTitle, desc: s.archCaixasDesc },
    { id: 'sementes_control', title: s.archSementesTitle, desc: s.archSementesDesc },
    { id: 'toada_presence', title: s.archToadaTitle, desc: s.archToadaDesc },
  ];

  return (
    <div className="flex flex-col gap-1.5 select-none">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-cactus font-black uppercase tracking-wider opacity-85">
          {s.archetypesSectionTitle}
        </span>
        {activeArchetype === 'custom' && (
          <span
            data-testid="bus-dynamics-custom-badge"
            className="px-2 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)] font-cactus font-black text-[9.5px] uppercase tracking-wider rounded-none"
          >
            {s.customBadge}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cards.map((card) => {
          const isSelected = activeArchetype === card.id;
          const nom = BUS_COMPRESSOR_ARCHETYPES[card.id];
          return (
            <button
              key={card.id}
              type="button"
              data-testid={`bus-archetype-card-${card.id}`}
              aria-pressed={isSelected}
              onClick={() => onSelectArchetype(card.id)}
              className={`p-2 border-2 rounded-none text-left flex flex-col justify-between gap-1.5 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[var(--fx-comp-accent)] text-[var(--fx-comp-active-text)] border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)]'
                  : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[var(--fx-comp-accent)]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 w-full">
                <ArchetypeWoodcutIcon id={card.id} />
                {isSelected && (
                  <span className="px-1.5 py-0.5 bg-[var(--cordel-ink-dark)] text-[var(--cordel-parchment-bg)] font-mono font-bold text-[8.5px] uppercase rounded-none">
                    {s.activeBadge}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-cactus font-black text-[11px] uppercase tracking-wide leading-tight">{card.title}</span>
                <span className="text-[9.5px] leading-snug opacity-85">{card.desc}</span>
              </div>
              <span className="text-[8.5px] font-mono font-bold opacity-80 border-t border-current/25 pt-1">
                {`SC ${nom.sidechainHpfHz}Hz · ${nom.ratio}:1 · ${nom.mixPct}%`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

