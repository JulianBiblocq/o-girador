/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Affichage des cartes de rythmes et variations avec grilles 4 temps (< 140 lignes).
 */
import React from 'react';
import { DictItem } from '../../utils/paper/paperDictionaryData';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { FileText, Copy, Check } from 'lucide-react';

interface Props {
  entries: DictItem[];
  lang: 'fr' | 'pt';
  onPrefillFamily?: (family: string) => void;
}

export const PaperDictionaryCardList: React.FC<Props> = ({ entries, lang, onPrefillFamily }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyFormula = (formula: string, id: string) => {
    navigator.clipboard?.writeText(formula);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderStepsGrid = (steps: any[]) => (
    <div className="grid grid-cols-16 flex-1 border border-black/80 text-[10px] font-mono font-bold text-center">
      {Array.from({ length: 16 }, (_, i) => {
        const val = steps[i] === 0 || !steps[i] ? '' : String(steps[i]);
        const isEven = Math.floor(i / 4) % 2 === 1;
        const isBeatEnd = (i + 1) % 4 === 0 && i !== 15;
        return (
          <div
            key={i}
            className={`h-5 flex items-center justify-center ${isBeatEnd ? 'border-r-2 border-black' : 'border-r border-black/30'} ${
              isEven ? 'bg-[#f7f5ed]' : 'bg-white'
            } ${val ? 'text-[#8b2a1a]' : 'text-transparent'}`}
          >
            {val || '•'}
          </div>
        );
      })}
    </div>
  );

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center font-cactus text-sm text-[var(--cordel-text-muted)]">
        {lang === 'fr' ? 'Aucun rythme trouvé dans cette catégorie.' : 'Nenhum ritmo encontrado nesta categoria.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      {entries.map((item) => {
        const formula = `${item.name.toUpperCase().replace(/\s*\(.*?\)/g, '')} x4 + Var (1-2) alfaia`;
        return (
          <div key={item.id} className="bg-white/90 border-2 border-black shadow-[3px_3px_0px_#000] p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-black/30 pb-1">
              <div className="flex items-center gap-2">
                <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">{item.name}</span>
                <span className="px-1.5 py-0.5 text-[8.5px] font-mono bg-[#f4ecd8] border border-black/40 text-black">
                  {item.family}
                </span>
              </div>
              {onPrefillFamily && (
                <button
                  type="button"
                  onClick={() => onPrefillFamily(item.family)}
                  className="px-2 py-0.5 text-[9.5px] font-cactus font-bold bg-[#8b2a1a] text-[#f4ecd8] border border-black flex items-center gap-1 cursor-pointer hover:bg-[#6c1f13]"
                >
                  <FileText className="w-3 h-3" />
                  <span>{lang === 'fr' ? 'Pré-remplir A4' : 'Preencher A4'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-4 pl-8 text-center font-mono font-bold text-[8px] text-gray-500">
                <span>T1</span><span>T2</span><span>T3</span><span>T4</span>
              </div>
              {Object.entries(item.patterns).map(([pup, steps]) => (
                <div key={pup} className="flex items-center gap-1">
                  <span className="w-7 font-mono font-bold text-[9.5px] bg-[#eee] text-black border border-black text-center shrink-0">
                    {resolvePupitreAbbr(pup)}
                  </span>
                  {renderStepsGrid(steps)}
                </div>
              ))}
            </div>

            {item.variations && item.variations.length > 0 && (
              <div className="border-t border-black/20 pt-1.5 flex flex-col gap-1">
                <span className="font-cactus font-bold text-[10px] text-gray-700">
                  {lang === 'fr' ? 'Variations numérotées :' : 'Variações numeradas :'}
                </span>
                {item.variations.map((v) => (
                  <div key={`${v.pupitre}_${v.varIndex}`} className="flex items-center gap-1">
                    <span className="w-14 font-mono text-[8.5px] font-bold bg-[#fbfbfb] text-[#8b2a1a] border border-black/30 text-center shrink-0">
                      Var {v.varIndex} ({v.pupitre})
                    </span>
                    {renderStepsGrid(v.steps)}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#fcfaf4] border border-black/30 p-1.5 flex items-center justify-between text-[9px] font-mono">
              <span className="text-gray-700 truncate">
                {lang === 'fr' ? 'Formule conducteur :' : 'Fórmula condutor :'} <strong>"{formula}"</strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopyFormula(formula, item.id)}
                className="px-1.5 py-0.5 bg-white border border-black/40 text-black flex items-center gap-1 cursor-pointer hover:bg-black hover:text-white"
              >
                {copiedId === item.id ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Copy className="w-2.5 h-2.5" />}
                <span>{copiedId === item.id ? (lang === 'fr' ? 'Copié' : 'Copiado') : (lang === 'fr' ? 'Copier' : 'Copiar')}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
