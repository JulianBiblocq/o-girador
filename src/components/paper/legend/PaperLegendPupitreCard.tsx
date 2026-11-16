/**
 * Carte d'affichage d'un pupitre dans la légende (< 50 lignes).
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface PupitreLegendData {
  code: string;
  title: string;
  subtitle: string;
  warning?: string;
  strokes: Array<{ key: string; desc: string }>;
  note?: string;
}

export const PaperLegendPupitreCard: React.FC<{ p: PupitreLegendData }> = ({ p }) => (
  <div className="p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] flex flex-col justify-between">
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-[var(--cordel-border)]/40 pb-1 mb-1.5">
        <span className="font-cactus font-bold text-sm text-[var(--cordel-accent-readable)] uppercase">{p.title}</span>
        <span className="text-[10px] text-[var(--cordel-text-muted)] italic truncate ml-1">{p.subtitle}</span>
      </div>
      {p.warning && (
        <div className="flex items-center gap-1.5 p-1 mb-1.5 bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-gold)] text-[var(--cordel-text)] text-[9.5px] font-bold">
          <AlertTriangle size={13} className="shrink-0 text-[var(--cordel-gold)]" />
          <span>{p.warning}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
        {p.strokes.map((st) => (
          <div key={st.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="min-w-10 px-1 py-0.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border-strong)] font-mono font-black text-center text-[var(--cordel-accent-readable)] shrink-0 text-[10.5px]">
              {st.key}
            </span>
            <span className="text-[var(--cordel-text)] font-medium text-[10px] leading-tight">{st.desc}</span>
          </div>
        ))}
      </div>
    </div>
    {p.note && <div className="mt-1.5 text-[9.5px] font-bold text-[var(--cordel-accent-readable)] italic">{p.note}</div>}
  </div>
);
