/**
 * LutherieBenchScopeHeader.tsx — Bandeau de filtrage (« Batuque actif » vs « Tous les instruments ») du Banc de Lutherie (< 45 lignes).
 */
import React from 'react';
import { Filter } from 'lucide-react';
import { LUTHERIE_DRUM_ROLES } from '../../utils/audio/lutheriePresetsStorage';

export interface LutherieBenchScopeHeaderProps {
  isFr: boolean;
  presentRolesCount: number;
  effectiveScope: 'active' | 'all';
  onSelectScope: (scope: 'active' | 'all') => void;
}

export const LutherieBenchScopeHeader: React.FC<LutherieBenchScopeHeaderProps> = React.memo(({
  isFr, presentRolesCount, effectiveScope, onSelectScope,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] px-3 py-2 shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
    <span className="font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 text-[var(--cordel-text)]">
      <Filter size={13} className="text-[var(--cordel-accent-readable)]" />
      <span>{isFr ? 'Affichage du Banc :' : 'Exibição da Bancada :'}</span>
    </span>
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button" data-testid="lutherie-filter-active" disabled={presentRolesCount === 0}
        onClick={() => onSelectScope('active')}
        className={`px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] cursor-pointer transition-colors disabled:opacity-40 ${effectiveScope === 'active' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}
      >
        {isFr ? `Batuque actif (${presentRolesCount})` : `Batuque ativo (${presentRolesCount})`}
      </button>
      <button
        type="button" data-testid="lutherie-filter-all" onClick={() => onSelectScope('all')}
        className={`px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] cursor-pointer transition-colors ${effectiveScope === 'all' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}
      >
        {isFr ? `Tous les instruments (${LUTHERIE_DRUM_ROLES.length})` : `Todos os instrumentos (${LUTHERIE_DRUM_ROLES.length})`}
      </button>
    </div>
  </div>
));

LutherieBenchScopeHeader.displayName = 'LutherieBenchScopeHeader';
