/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sélecteur de pupitres, liaisons/bus et lignes libres pour fiches Cordel (< 140 lignes).
 */
import React, { useState } from 'react';
import { resolvePupitreAbbr, resolvePupitreDisplayName, saveCustomPupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { Edit2, Link } from 'lucide-react';

interface Props {
  pupitres: string[];
  onTogglePupitre: (code: string) => void;
  linkAlfaias: boolean;
  onToggleLinkAlfaias: (val: boolean) => void;
  busCaixas: boolean;
  onToggleBusCaixas: (val: boolean) => void;
  busSementes: boolean;
  onToggleBusSementes: (val: boolean) => void;
  includeVarLine: boolean;
  onToggleIncludeVarLine: (val: boolean) => void;
  freeLinesCount: number;
  onChangeFreeLinesCount: (count: number) => void;
  lang: 'fr' | 'pt';
}

export const BlankSheetPupitreSelector: React.FC<Props> = ({
  pupitres, onTogglePupitre, linkAlfaias, onToggleLinkAlfaias,
  busCaixas, onToggleBusCaixas, busSementes, onToggleBusSementes,
  includeVarLine, onToggleIncludeVarLine, freeLinesCount, onChangeFreeLinesCount, lang,
}) => {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [customAbbrs, setCustomAbbrs] = useState<Record<string, string>>({});

  const displayedKeys: string[] = [
    ...(linkAlfaias ? ['al'] : ['mc', 'me', 'rp']),
    ...(busCaixas ? ['cx_tr'] : ['cx', 'tr']),
    'gg',
    ...(busSementes ? ['ab_mi'] : ['ab', 'mi']),
    'tb', 'ap', 'td',
  ];

  const handleEditAbbr = (key: string, val: string) => {
    setCustomAbbrs({ ...saveCustomPupitreAbbr(key, val) });
    setEditingCode(null);
  };

  const groupBtns = [
    { label: lang === 'fr' ? 'Lier Alfaias (Al)' : 'Ligar Alfaias (Al)', active: linkAlfaias, toggle: () => onToggleLinkAlfaias(!linkAlfaias) },
    { label: lang === 'fr' ? 'Bus Caixas (Cx+Tr)' : 'Bus Caixas (Cx+Tr)', active: busCaixas, toggle: () => onToggleBusCaixas(!busCaixas) },
    { label: lang === 'fr' ? 'Bus Sementes (Ab+Mi)' : 'Bus Sementes (Ab+Mi)', active: busSementes, toggle: () => onToggleBusSementes(!busSementes) },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 bg-black/10 border-2 border-[var(--cordel-border,#1a1a1a)] text-xs text-[#1a1a1a]">
      {/* 1. BOUTONS DE LIAISON & BUS */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-black/20">
        <span className="font-cactus font-bold uppercase text-[10px] text-[#8b2a1a]">Groupements :</span>
        {groupBtns.map((b, i) => (
          <button key={i} type="button" onClick={b.toggle} className={`px-2 py-0.5 border font-cactus font-bold text-[10px] cursor-pointer flex items-center gap-1 ${b.active ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-[#f4ecd8] text-[#1a1a1a] border-black/40'}`}>
            <Link size={10} /> <span>{b.label}</span>
          </button>
        ))}
      </div>

      <div className="text-[10px] font-bold text-[#1a1a1a]/80">
        {lang === 'fr' ? '• Rouge = sélectionné pour l\'impression  • Parchemin = non imprimé' : '• Vermelho = impresso  • Pergaminho = não impresso'}
      </div>

      {/* 2. LISTE DES PUPITRES */}
      <div className="flex flex-wrap gap-1.5">
        {displayedKeys.map((k) => {
          const isSelected = pupitres.includes(k);
          const abbr = customAbbrs[k] || resolvePupitreAbbr(k);
          const name = resolvePupitreDisplayName(k, lang);
          return (
            <div key={k} className="flex items-center shadow-[1px_1px_0px_#1a1a1a]">
              <button type="button" onClick={() => onTogglePupitre(k)} className={`px-2 py-1 text-[10px] border-2 cursor-pointer font-bold transition-colors ${isSelected ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a] hover:bg-[#fff9ea]'}`}>
                {abbr} ({name})
              </button>
              {editingCode === k ? (
                <input type="text" autoFocus defaultValue={abbr} maxLength={4} onBlur={(e) => handleEditAbbr(k, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditAbbr(k, (e.target as any).value)} className="w-10 px-1 py-0.5 bg-white text-black font-mono text-[10px] border-2 border-black uppercase" />
              ) : (
                <button type="button" onClick={() => setEditingCode(k)} title={lang === 'fr' ? 'Modifier l\'abréviation (2 lettres)' : 'Modificar abreviação'} className="px-1 py-1 bg-black/10 hover:bg-black/20 border-y-2 border-r-2 border-[#1a1a1a] cursor-pointer text-[#1a1a1a]">
                  <Edit2 size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. SOUS-LIGNE ALFAIAS & LIGNES LIBRES */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/20">
        {pupitres.includes('al') && linkAlfaias && (
          <label className="flex items-center gap-1.5 font-bold text-[10px] cursor-pointer">
            <input type="checkbox" checked={includeVarLine} onChange={(e) => onToggleIncludeVarLine(e.target.checked)} className="accent-[#8b2a1a]" />
            <span>{lang === 'fr' ? 'Sous-ligne Alfaias [+1 ligne ↳Me/Rp]' : 'Sublinha Alfaias [+1 linha ↳Me/Rp]'}</span>
          </label>
        )}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="font-cactus font-bold uppercase text-[#8b2a1a]">{lang === 'fr' ? '+ Lignes libres [____] :' : '+ Linhas livres [____] :'}</span>
          {[0, 1, 2, 4, 8].map((num) => (
            <button key={num} type="button" onClick={() => onChangeFreeLinesCount(num)} className={`px-1.5 py-0.5 border text-[10px] font-bold cursor-pointer ${freeLinesCount === num ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-[#f4ecd8] text-[#1a1a1a] border-black/40'}`}>
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
