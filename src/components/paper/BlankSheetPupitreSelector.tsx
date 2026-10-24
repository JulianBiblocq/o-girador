/**
 * Sélecteur de pupitres, liaisons/bus et lignes libres pour fiches Cordel (< 140 lignes).
 */
import React, { useState } from 'react';
import { resolvePupitreAbbr, resolvePupitreDisplayName, saveCustomPupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { Edit2, Link } from 'lucide-react';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

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
    { label: `${tPaper(lang, 'linkAlfaias')} (Al)`, active: linkAlfaias, toggle: () => onToggleLinkAlfaias(!linkAlfaias) },
    { label: `${tPaper(lang, 'busCaixas')} (Cx+Tr)`, active: busCaixas, toggle: () => onToggleBusCaixas(!busCaixas) },
    { label: `${tPaper(lang, 'busSementes')} (Ab+Mi)`, active: busSementes, toggle: () => onToggleBusSementes(!busSementes) },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] text-xs text-[var(--cordel-text)]">
      {/* 1. BOUTONS DE LIAISON & BUS */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[var(--cordel-border)]/30">
        <span className="font-cactus font-bold uppercase text-[10px] text-[#f59e0b]">
          {lang === 'fr' ? 'Groupements :' : 'Agrupamentos :'}
        </span>
        {groupBtns.map((b, i) => (
          <button key={i} type="button" onClick={b.toggle} className={`px-2 py-0.5 border font-cactus font-bold text-[10px] cursor-pointer flex items-center gap-1 ${b.active ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'}`}>
            <Link size={10} /> <span>{b.label}</span>
          </button>
        ))}
      </div>

      <div className="text-[10px] font-bold text-[var(--cordel-text-muted)]">
        • {tPaper(lang, 'pupitreLegendHint')}
      </div>

      {/* 2. LISTE DES PUPITRES */}
      <div className="flex flex-wrap gap-1.5">
        {displayedKeys.map((k) => {
          const isSelected = pupitres.includes(k);
          const abbr = customAbbrs[k] || resolvePupitreAbbr(k);
          const name = resolvePupitreDisplayName(k, lang);
          return (
            <div key={k} className="flex items-center shadow-[1px_1px_0px_var(--cordel-border)]">
              <button type="button" onClick={() => onTogglePupitre(k)} className={`px-2 py-1 text-[10px] border-2 cursor-pointer font-bold transition-colors ${isSelected ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:bg-[#b94a2c]/20'}`}>
                {abbr} ({name})
              </button>
              {editingCode === k ? (
                <input type="text" autoFocus defaultValue={abbr} maxLength={4} onBlur={(e) => handleEditAbbr(k, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditAbbr(k, (e.target as any).value)} className="w-10 px-1 py-0.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-mono text-[10px] border-2 border-[var(--cordel-border)] uppercase" />
              ) : (
                <button type="button" onClick={() => setEditingCode(k)} title={lang === 'fr' ? 'Modifier l\'abréviation (2 lettres)' : 'Modificar abreviação'} className="px-1 py-1 bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c]/30 border-y-2 border-r-2 border-[var(--cordel-border)] cursor-pointer text-[var(--cordel-card-btn-text)]">
                  <Edit2 size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. SOUS-LIGNE ALFAIAS & LIGNES LIBRES */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 pb-1 border-t border-[var(--cordel-border)]/30 min-h-[32px]">
        {pupitres.includes('al') && linkAlfaias && (
          <label className="flex items-center gap-1.5 font-bold text-[10px] cursor-pointer">
            <input type="checkbox" checked={includeVarLine} onChange={(e) => onToggleIncludeVarLine(e.target.checked)} className="accent-[#8b2a1a]" />
            <span>{tPaper(lang, 'includeVarLine')}</span>
          </label>
        )}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="font-cactus font-bold uppercase text-[#f59e0b]">
            + {tPaper(lang, 'freeLines')} [____] :
          </span>
          {[0, 1, 2, 4, 8].map((num) => (
            <button key={num} type="button" onClick={() => onChangeFreeLinesCount(num)} className={`px-1.5 py-0.5 border text-[10px] font-bold cursor-pointer ${freeLinesCount === num ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'}`}>
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
