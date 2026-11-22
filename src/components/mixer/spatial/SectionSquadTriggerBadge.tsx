/**
 * SectionSquadTriggerBadge.tsx — Badge compact `[ 👥 ×N ]` ouvrant `SectionStagePlacementPopover` (< 70 lignes).
 */
import React, { useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { instrumentsConfig } from '../../../data';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { isNeutralDefaultSectionPlayers, isSectionEnsembleEligible } from '../../../constants/sectionEnsembleLimits';
import { SectionStagePlacementPopover } from '../../SectionStagePlacementPopover';

interface SectionSquadTriggerBadgeProps {
  trackId: number;
  compact?: boolean;
}

export const SectionSquadTriggerBadge: React.FC<SectionSquadTriggerBadgeProps> = ({
  trackId,
  compact = false,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const track = useSequencerStore((s) => s.tracks.find((t) => t.id === trackId));
  const lang = useSequencerStore((s) => s.lang);

  if (!track || track.isBusFolder || track.isLinkFolder) return null;
  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst || !isSectionEnsembleEligible(inst.id, inst.type)) return null;

  const count = track.sectionPlayers?.length || 1;
  const isActive = !isNeutralDefaultSectionPlayers(track.sectionPlayers);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (anchorRect) {
      setAnchorRect(null);
    } else if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-testid={`section-squad-badge-${trackId}`}
        onClick={handleToggle}
        title={lang === 'fr' ? `Placement du Pupitre (La Place) — ×${count}` : `Posição do Naipe (A Praça) — ×${count}`}
        className={`cordel-border-sm cordel-button font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 ${
          compact ? 'h-[18px] px-1 text-[9px]' : 'h-7 px-2 text-[11px]'
        } ${
          isActive || anchorRect
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
            : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
        }`}
      >
        <Users size={compact ? 10 : 12} className="shrink-0" />
        <span>×{count}</span>
      </button>
      {anchorRect && (
        <SectionStagePlacementPopover
          trackId={trackId}
          anchorRect={anchorRect}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
  );
};
