import React from 'react';
import { ChevronRight, ExternalLink, Globe, Grid3X3, Layers, RotateCcw } from 'lucide-react';
import { Language } from '../../types';
import { OficinaGrooveTier } from '../../stores/useSequencerSettingsStore';

interface GrooveScopeOption {
  id: number;
  label: string;
}

export type GrooveEffectiveSource = 'global-root' | 'inherited-global' | 'inherited-track' | 'local-override';

interface OficinaGrooveScopeBarProps {
  lang: Language;
  tier: OficinaGrooveTier;
  onTierChange: (tier: OficinaGrooveTier) => void;
  trackOptions: GrooveScopeOption[];
  selectedTrackId: number | null;
  onTrackChange: (trackId: number) => void;
  patternOptions: GrooveScopeOption[];
  selectedPatternId: number | null;
  onPatternChange: (patternId: number) => void;
  effectiveSource: GrooveEffectiveSource;
  effectiveSummary: string;
  canResetInheritance: boolean;
  onResetInheritance: () => void;
  onOpenInEditor: () => void;
}

export const OficinaGrooveScopeBar: React.FC<OficinaGrooveScopeBarProps> = ({
  lang, tier, onTierChange, trackOptions, selectedTrackId, onTrackChange,
  patternOptions, selectedPatternId, onPatternChange, effectiveSource,
  effectiveSummary, canResetInheritance, onResetInheritance, onOpenInEditor,
}) => {
  const isFr = lang === 'fr';
  const hasTracks = trackOptions.length > 0;
  const tierBtn = (t: OficinaGrooveTier, disabled = false) =>
    `px-3 py-2 font-cactus font-bold text-xs uppercase border-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] disabled:opacity-45 disabled:cursor-not-allowed ${
      tier === t
        ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
        : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-card-btn-border)] hover:bg-[var(--cordel-surface-elevated)]'
    } ${disabled ? 'pointer-events-none' : ''}`;

  const badgeLabel =
    effectiveSource === 'local-override' ? (isFr ? 'Surchargé localement' : 'Sobrescrito localmente')
    : effectiveSource === 'inherited-track' ? (isFr ? 'Hérité de la Piste' : 'Herdado da Faixa')
    : effectiveSource === 'inherited-global' ? (isFr ? 'Hérité du Global' : 'Herdado do Global')
    : (isFr ? 'Racine du Morceau Global' : 'Raiz da Música Global');

  const badgeTone = effectiveSource === 'local-override'
    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
    : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)] border-[var(--cordel-border)]';

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] rounded-sm shadow-[3px_3px_0px_var(--cordel-shadow-color)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          <button type="button" data-testid="groove-tier-global" onClick={() => onTierChange('global')} className={tierBtn('global')}>
            <Globe size={13} className="shrink-0" /> <span>{isFr ? '1. Morceau Global' : '1. Música Global'}</span>
          </button>
          <ChevronRight size={13} className="text-[var(--cordel-text-muted)] hidden sm:block shrink-0" />
          <button type="button" data-testid="groove-tier-track" disabled={!hasTracks} onClick={() => onTierChange('track')} className={tierBtn('track', !hasTracks)}>
            <Layers size={13} className="shrink-0" /> <span>{isFr ? '2. Piste / Pupitre' : '2. Faixa / Naipe'}</span>
          </button>
          <ChevronRight size={13} className="text-[var(--cordel-text-muted)] hidden sm:block shrink-0" />
          <button type="button" data-testid="groove-tier-pattern" disabled={!hasTracks} onClick={() => onTierChange('pattern')} className={tierBtn('pattern', !hasTracks)}>
            <Grid3X3 size={13} className="shrink-0" /> <span>{isFr ? '3. Motif' : '3. Padrão'}</span>
          </button>
        </div>

        {tier !== 'global' && selectedTrackId !== null && (
          <button
            type="button" data-testid="groove-open-editor-btn" onClick={onOpenInEditor}
            className="px-3 py-1.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity shadow-[2px_2px_0px_var(--cordel-shadow-color)]"
          >
            <ExternalLink size={13} className="shrink-0" />
            <span>{isFr ? "Ouvrir dans l'Éditeur de Motif" : 'Abrir no Editor de Padrão'}</span>
          </button>
        )}
      </div>

      {tier !== 'global' && hasTracks && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--cordel-border)]">
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-[var(--cordel-text-muted)]">
            <span>{isFr ? 'Pupitre / Piste inspectée :' : 'Naipe / Faixa inspecionada :'}</span>
            <select
              data-testid="groove-scope-track-select" value={selectedTrackId !== null ? String(selectedTrackId) : ''}
              onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) onTrackChange(v); }}
              className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              {trackOptions.map((opt) => <option key={opt.id} value={String(opt.id)}>{opt.label}</option>)}
            </select>
          </label>
          {tier === 'pattern' && (
            <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-[var(--cordel-text-muted)]">
              <span>{isFr ? 'Motif inspecté :' : 'Padrão inspecionado :'}</span>
              <select
                data-testid="groove-scope-pattern-select" value={selectedPatternId !== null ? String(selectedPatternId) : ''}
                onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) onPatternChange(v); }}
                className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                {patternOptions.map((opt) => <option key={opt.id} value={String(opt.id)}>{opt.label}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--cordel-border)]">
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="groove-priority-badge" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-xs ${badgeTone}`}>
            {badgeLabel}
          </span>
          <span className="text-xs font-mono font-bold text-[var(--cordel-text)]">{effectiveSummary}</span>
        </div>
        {canResetInheritance && (
          <button
            type="button" data-testid="groove-reset-inheritance-btn" onClick={onResetInheritance}
            className="px-2.5 py-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-card-btn-border)] text-[11px] font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)]"
          >
            <RotateCcw size={12} className="shrink-0" />
            <span>{isFr ? "Réinitialiser l'héritage" : 'Redefinir herança'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
