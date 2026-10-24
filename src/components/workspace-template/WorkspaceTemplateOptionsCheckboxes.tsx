
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
  return (
    <div className="flex flex-col gap-2 border-t-2 border-[#1a1a1a]/20 pt-3">
      <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[#1a1a1a]/80">
        {lang === 'pt' ? 'Elementos a incluir :' : 'Éléments à inclure :'}
      </span>

      <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
        <input
          type="checkbox"
          checked={options.includeStructure}
          onChange={() => toggleOption('includeStructure')}
          className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
        />
        <span className="font-medium">
          {lang === 'pt'
            ? 'Estrutura do batuque & Bus (vínculos mestre/escravos, subgrupos)'
            : 'Structure du batuque & Bus (liens maître/esclaves, sous-groupes)'}
        </span>
      </label>

      <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
        <input
          type="checkbox"
          checked={options.includeDisplayOrder}
          onChange={() => toggleOption('includeDisplayOrder')}
          className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
        />
        <span className="font-medium">
          {lang === 'pt'
            ? 'Ordens de exibição (mesa de mixagem & Roda)'
            : "Ordres d'affichage (table de mixage & Roda)"}
        </span>
      </label>

      <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
        <input
          type="checkbox"
          checked={options.includeVolumePan}
          onChange={() => toggleOption('includeVolumePan')}
          className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
        />
        <span className="font-medium">
          {lang === 'pt' ? 'Níveis de volume & Panoramas' : 'Niveaux de volume & Panoramiques'}
        </span>
      </label>

      <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
        <input
          type="checkbox"
          checked={options.includeEQ}
          onChange={() => toggleOption('includeEQ')}
          className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
        />
        <span className="font-medium">
          {lang === 'pt'
            ? 'Equalizações (pistas individuais & Master EQ)'
            : 'Égalisations (pistes individuelles & Master EQ)'}
        </span>
      </label>

      <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
        <input
          type="checkbox"
          checked={options.includeFX}
          onChange={() => toggleOption('includeFX')}
          className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
        />
        <span className="font-medium">
          {lang === 'pt'
            ? 'Efeitos (envios das pistas & Master FX Rack)'
            : 'Effets (départs des pistes & Master FX Rack)'}
        </span>
      </label>
    </div>
  );
};
