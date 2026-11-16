import React from 'react';
import { WorkspaceTemplateOptions } from '../../types';

interface OptionsCheckboxesProps {
  options: WorkspaceTemplateOptions;
  toggleOption: (key: keyof WorkspaceTemplateOptions) => void;
  lang: string;
}

export const WorkspaceTemplateOptionsCheckboxes: React.FC<OptionsCheckboxesProps> = ({
  options,
  toggleOption,
  lang,
}) => {
  const isPt = lang === 'pt';
  const items: { key: keyof WorkspaceTemplateOptions; label: string }[] = [
    {
      key: 'includeStructure',
      label: isPt
        ? 'Estrutura do batuque & Bus (vínculos mestre/escravos, subgrupos)'
        : 'Structure du batuque & Bus (liens maître/esclaves, sous-groupes)',
    },
    {
      key: 'includeDisplayOrder',
      label: isPt
        ? 'Ordens de exibição (mesa de mixagem & Roda)'
        : "Ordres d'affichage (table de mixage & Roda)",
    },
    {
      key: 'includeVolumePan',
      label: isPt ? 'Níveis de volume & Panoramas' : 'Niveaux de volume & Panoramiques',
    },
    {
      key: 'includeEQ',
      label: isPt
        ? 'Equalizações (pistas individuais & Master EQ)'
        : 'Égalisations (pistes individuelles & Master EQ)',
    },
    {
      key: 'includeFX',
      label: isPt
        ? 'Efeitos (envios das pistas & Master FX Rack)'
        : 'Effets (départs des pistes & Master FX Rack)',
    },
  ];

  return (
    <div className="flex flex-col gap-2 border-t-2 border-[var(--cordel-border)] pt-3 text-[var(--cordel-text)]">
      <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text-muted)]">
        {isPt ? 'Elementos a incluir :' : 'Éléments à inclure :'}
      </span>
      {items.map((it) => (
        <label key={it.key} className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85 select-none">
          <input
            type="checkbox"
            checked={Boolean(options[it.key])}
            onChange={() => toggleOption(it.key)}
            className="w-4 h-4 accent-[var(--cordel-wood)] cursor-pointer"
          />
          <span className="font-medium text-[11px]">{it.label}</span>
        </label>
      ))}
    </div>
  );
};
