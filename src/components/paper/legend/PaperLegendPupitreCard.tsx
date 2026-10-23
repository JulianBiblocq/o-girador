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
  <div className="p-2.5 bg-white border-2 border-black shadow-[2px_2px_0px_#1a1a1a] flex flex-col justify-between">
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-black/20 pb-1 mb-1.5">
        <span className="font-cactus font-bold text-sm text-[#8b2a1a] uppercase">{p.title}</span>
        <span className="text-[10px] text-black/60 italic truncate ml-1">{p.subtitle}</span>
      </div>
      {p.warning && (
        <div className="flex items-center gap-1.5 p-1 mb-1.5 bg-[#fef3c7] border border-[#d97706] text-[#92400e] text-[9.5px] font-bold">
          <AlertTriangle size={13} className="shrink-0 text-[#b45309]" />
          <span>{p.warning}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {p.strokes.map((st) => (
          <div key={st.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-9 px-1 py-0.5 bg-[#f4ecd8] border border-black font-mono font-black text-center text-[#8b2a1a] shrink-0 text-[11px]">
              {st.key}
            </span>
            <span className="text-black/80 font-medium text-[10px] leading-tight truncate">{st.desc}</span>
          </div>
        ))}
      </div>
    </div>
    {p.note && <div className="mt-1 text-[9px] font-bold text-[#8b2a1a] italic">{p.note}</div>}
  </div>
);
