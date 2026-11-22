/**
 * SectionSquadTriggerBadge.tsx — Badge compact `[ ×N ]` ouvrant `SectionSquadMiniMixerModal` (< 80 lignes).
 * Sélecteur Zustand primitif (`string`) : 0 re-render pendant le glisser de Fader/Pan de la tranche.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { instrumentsConfig } from '../../../data';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { isNeutralDefaultSectionPlayers, isSectionEnsembleEligible } from '../../../constants/sectionEnsembleLimits';
import type { TrackGroup } from '../../../types';
import { SectionSquadMiniMixerModal } from './SectionSquadMiniMixerModal';

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
  const selectBadgeMeta = useCallback((s: { tracks: TrackGroup[] }): string => {
    const track = s.tracks.find((t) => t.id === trackId);
    if (!track || track.isBusFolder || track.isLinkFolder) return '';
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || !isSectionEnsembleEligible(inst.id, inst.type)) return '';
    const count = track.sectionPlayers?.length || 1;
    const active = !isNeutralDefaultSectionPlayers(track.sectionPlayers) ? 1 : 0;
    return `${count}:${active}`;
  }, [trackId]);

  const badgeMeta = useSequencerStore(selectBadgeMeta);
  const lang = useSequencerStore((s) => s.lang);

  if (!badgeMeta) return null;
  const [countStr, activeStr] = badgeMeta.split(':');
  const count = Number(countStr) || 1;
  const isActive = activeStr === '1';

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (anchorRect) setAnchorRect(null);
    else if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-testid={`section-squad-badge-${trackId}`}
        onClick={handleToggle}
        title={lang === 'fr' ? `Mini-Mixeur du Pupitre — ×${count}` : `Mini-Mixer do Naipe — ×${count}`}
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
        <SectionSquadMiniMixerModal
          trackId={trackId}
          anchorRect={anchorRect}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
  );
};
