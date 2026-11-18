/**
 * LutherieEnsembleAcousticBar.tsx — Contrôles Maîtres Cordel « Chœur de Peaux », « Respiration de la Roda »
 * & Bascule d'écoute instantanée `[ Avant / Après ]` dans A Oficina (< 130 lignes).
 */
import React, { useMemo } from 'react';
import { ArrowLeftRight, Sparkles, Waves } from 'lucide-react';
import { computeRoleChorusSpreadSummary } from '../../audio/engine/skinChorusCalculator';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { LUTHERIE_DRUM_ROLES, LutherieDrumRole } from '../../utils/audio/lutheriePresetsStorage';
import type { DrumRoleBenchEntry } from './useBaqueLutherieState';

export interface LutherieEnsembleAcousticBarProps {
  lang: string;
  drumsByRole: Record<LutherieDrumRole, DrumRoleBenchEntry>;
}

const ROLE_SHORT_LABELS: Record<LutherieDrumRole, string> = {
  marcante: 'Marcante', meiao: 'Meião', repique: 'Repique',
  caixa: 'Caixa', tarol: 'Tarol', timbal: 'Timbal', gongue: 'Gonguê',
};

export const LutherieEnsembleAcousticBar: React.FC<LutherieEnsembleAcousticBarProps> = React.memo(({
  lang, drumsByRole,
}) => {
  const isFr = lang === 'fr';
  const skinChorusAmount = useSequencerStore((s) => s.skinChorusAmount);
  const rodaBreathingAmount = useSequencerStore((s) => s.rodaBreathingAmount);
  const isBypassed = useSequencerStore((s) => s.isEnsembleAcousticsBypassed);
  const setSkinChorusAmount = useSequencerStore((s) => s.setSkinChorusAmount);
  const setRodaBreathingAmount = useSequencerStore((s) => s.setRodaBreathingAmount);
  const toggleBypassed = useSequencerStore((s) => s.toggleEnsembleAcousticsBypassed);

  const chorusPct = Math.round((skinChorusAmount ?? 0.75) * 100);
  const breathingPct = Math.round((rodaBreathingAmount ?? 0.75) * 100);
  const effChorus = isBypassed ? 0 : (skinChorusAmount ?? 0.75);

  const activeChorusBadges = useMemo(() => {
    const items: Array<{ role: LutherieDrumRole; count: number; hzText: string }> = [];
    for (const role of LUTHERIE_DRUM_ROLES) {
      const entry = drumsByRole[role];
      const count = (entry?.tracks?.length || 0) > 0 ? entry.tracks.length : (entry?.placedCount ?? 0);
      if (count >= 2) {
        const sum = computeRoleChorusSpreadSummary(role, entry.tuning, count, effChorus);
        items.push({ role, count, hzText: `±${sum.maxHz.toFixed(2)} Hz` });
      }
    }
    return items;
  }, [drumsByRole, effChorus]);

  return (
    <div
      data-testid="lutherie-ensemble-acoustic-bar"
      className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] p-3 flex flex-col gap-2.5 shadow-[3px_3px_0px_var(--cordel-shadow-color)] select-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[var(--cordel-border)] pb-2">
        <div className="flex flex-col">
          <span className="font-cactus font-bold uppercase text-xs md:text-sm text-[var(--cordel-accent-readable)]">
            {isFr ? 'Acoustique d’Ensemble de la Roda' : 'Acústica de Conjunto da Roda'}
          </span>
          <span className="text-[10px] text-[var(--cordel-text-muted)]">
            {isFr
              ? 'Étagement fixe par formation (invariant Mute / Solo) : dispersion symétrique & respiration spectrale.'
              : 'Escalonamento fixo por formação (invariante a Mute / Solo) : dispersão simétrica & respiração espectral.'}
          </span>
        </div>

        <button
          type="button" data-testid="lutherie-ensemble-ab-toggle" onClick={toggleBypassed}
          title={isFr ? 'Comparer instantanément sans / avec traitement pendant la lecture' : 'Comparar instantaneamente sem / com processamento durante a reprodução'}
          className={`px-3 py-1.5 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors ${
            isBypassed
              ? 'bg-[var(--cordel-bg)] text-[var(--cordel-text-muted)]'
              : 'bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
          }`}
        >
          <ArrowLeftRight size={13} />
          <span>
            {isBypassed
              ? (isFr ? '[ Avant / Après ] : Brut (Avant)' : '[ Antes / Depois ] : Bruto (Antes)')
              : (isFr ? '[ Avant / Après ] : Actif (Après)' : '[ Antes / Depois ] : Ativo (Depois)')}
          </span>
        </button>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3.5 transition-opacity ${isBypassed ? 'opacity-55' : 'opacity-100'}`}>
        <div className="bg-[var(--cordel-bg)] border border-[var(--cordel-border)] p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
            <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-[var(--cordel-accent-readable)]" /><span>{isFr ? 'Chœur de Peaux' : 'Coro de Peles'}</span></span>
            <span className="font-mono font-bold text-[var(--cordel-accent-readable)]">{chorusPct}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={1} value={chorusPct}
            aria-label={isFr ? 'Chœur de Peaux' : 'Coro de Peles'}
            onChange={(e) => setSkinChorusAmount(Number(e.target.value) / 100)}
            className="w-full accent-[var(--cordel-accent)] cursor-pointer h-1.5"
          />
          <div className="flex flex-wrap items-center gap-1 min-h-[18px]">
            {activeChorusBadges.length === 0 ? (
              <span className="text-[9px] font-mono text-[var(--cordel-text-muted)]">
                {isFr ? '1 fût par rôle : 0.00 Hz (pureté fondamentale)' : '1 tambor por função : 0.00 Hz (pureza fundamental)'}
              </span>
            ) : (
              activeChorusBadges.map((b) => (
                <span key={b.role} data-testid={`chorus-hz-badge-${b.role}`} className="px-1.5 py-0.5 bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-border)] font-mono font-bold text-[9px] text-[var(--cordel-text)]">
                  {`${ROLE_SHORT_LABELS[b.role]} ×${b.count} : ${b.hzText}`}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="bg-[var(--cordel-bg)] border border-[var(--cordel-border)] p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
            <span className="flex items-center gap-1.5"><Waves size={12} className="text-[var(--cordel-accent-readable)]" /><span>{isFr ? 'Respiration de la Roda' : 'Respiração da Roda'}</span></span>
            <span className="font-mono font-bold text-[var(--cordel-accent-readable)]">{breathingPct}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={1} value={breathingPct}
            aria-label={isFr ? 'Respiration de la Roda' : 'Respiração da Roda'}
            onChange={(e) => setRodaBreathingAmount(Number(e.target.value) / 100)}
            className="w-full accent-[var(--cordel-accent)] cursor-pointer h-1.5"
          />
          <span className="text-[9px] font-mono text-[var(--cordel-text-muted)]">
            {isFr ? 'Emboîtement f0 automatique + poche 360 Hz (Gonguê / Toada)' : 'Encaixe f0 automático + bolso 360 Hz (Gonguê / Toada)'}
          </span>
        </div>
      </div>
    </div>
  );
});

LutherieEnsembleAcousticBar.displayName = 'LutherieEnsembleAcousticBar';
