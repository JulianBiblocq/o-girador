/**
 * Section des cases a cocher pour l'application a la carte d'un gabarit (< 80 lignes).
 */
import React from 'react';
import { ApplyWorkspaceTemplateOptions, Language } from '../../types';

interface Props {
  options: ApplyWorkspaceTemplateOptions;
  setOptions: React.Dispatch<React.SetStateAction<ApplyWorkspaceTemplateOptions>>;
  lang: Language;
}

export const ApplyTemplateCheckboxesSection: React.FC<Props> = ({ options, setOptions, lang }) => {
  const toggle = (key: keyof ApplyWorkspaceTemplateOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const items = [
    { key: 'includeStructure' as const, label: lang === 'pt' ? 'Estrutura do batuque & Bus (vínculos mestre/escravos, subgrupos)' : 'Structure du batuque & Bus (liens maître/esclaves, sous-groupes)' },
    { key: 'includeDisplayOrder' as const, label: lang === 'pt' ? 'Ordens de exibição (mesa de mixagem & Roda)' : "Ordres d'affichage (table de mixage & Roda)" },
    { key: 'includeVolumePan' as const, label: lang === 'pt' ? 'Níveis de volume & Panoramas' : 'Niveaux de volume & Panoramiques' },
    { key: 'includeEQ' as const, label: lang === 'pt' ? 'Equalizações (bandas EQ & filtros)' : 'Égalisations (bandes EQ & filtres)' },
    { key: 'includeFX' as const, label: lang === 'pt' ? 'Efeitos (envios das pistas & Master FX Rack)' : 'Départs & retours d\'effets (FX / Reverb)' },
  ];

  return (
    <div className="flex flex-col gap-1.5 border-t-2 border-[#1a1a1a]/20 pt-2.5">
      <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[#1a1a1a]/80">
        {lang === 'pt' ? 'Elementos a aplicar na música atual :' : 'Éléments à appliquer au morceau en cours :'}
      </span>
      {items.map((it) => (
        <label key={it.key} className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85 select-none text-[#1a1a1a]">
          <input
            type="checkbox"
            checked={Boolean(options[it.key])}
            onChange={() => toggle(it.key)}
            className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
          />
          <span className="font-medium text-[11px]">{it.label}</span>
        </label>
      ))}

      <div className="mt-1 pt-1.5 border-t border-[#1a1a1a]/15 flex flex-col gap-0.5">
        <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85 select-none text-[#8b2a1a]">
          <input
            type="checkbox"
            checked={options.removeExtraTracks}
            onChange={() => toggle('removeExtraTracks')}
            className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
          />
          <span className="font-bold text-[11px]">
            {lang === 'pt' ? 'Retirar instrumentos ausentes do gabarito' : 'Retirer les instruments absents du gabarit'}
          </span>
        </label>
        <span className="text-[10px] text-[#1a1a1a]/60 font-sans pl-6">
          {lang === 'pt'
            ? 'Remove da música as pistas de percussão ausentes do gabarito — preserva sempre as vozes'
            : 'Supprime du morceau les pistes percussions absentes du gabarit — conserve toujours les pistes vocales'}
        </span>
      </div>
    </div>
  );
};
