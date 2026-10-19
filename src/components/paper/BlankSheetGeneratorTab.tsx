/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 1 : Générateur des 3 fiches vierges Cordel et Légende A4 (< 145 lignes).
 */
import React, { useState } from 'react';
import { BlankSheetOptions, BlankSheetType, GridMode, PupitreCode } from '../../types/paperWorkshop.types';
import { exportBlankSheetToPdf } from '../../utils/paper/blankSheetPdfExport';
import { printLegendOnly } from '../../utils/exportTablature';
import { PUPITRES_REGISTRY, generateMemoFooterText } from '../../utils/paper/paperLegendHelper';
import { Printer, BookOpen } from 'lucide-react';

export const BlankSheetGeneratorTab: React.FC<{ lang: 'fr' | 'pt' }> = ({ lang }) => {
  const [sheetType, setSheetType] = useState<BlankSheetType>('sections');
  const [gridMode, setGridMode] = useState<GridMode>('4/4');
  const [pupitres, setPupitres] = useState<PupitreCode[]>(['al', 'cx', 'gg', 'ab', 'mi']);
  const [includeVarLine, setIncludeVarLine] = useState(true);

  const togglePupitre = (code: PupitreCode) => {
    setPupitres((prev) => (prev.includes(code) ? (prev.length > 1 ? prev.filter((c) => c !== code) : prev) : [...prev, code]));
  };

  const handlePrintSheet = () => {
    const options: BlankSheetOptions = {
      sheetType,
      gridMode,
      pupitres,
      includeVariationLine: includeVarLine,
    };
    exportBlankSheetToPdf(options, lang);
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans text-[var(--cordel-text,#1a1a1a)]">
      {/* 1. CHOIX DE LA FEUILLE */}
      <div className="flex flex-col gap-1.5 p-3 bg-black/10 border-2 border-[var(--cordel-border,#1a1a1a)]">
        <label className="font-cactus font-bold uppercase text-[12px] text-[#d99b26] tracking-wide">
          {lang === 'fr' ? '1. Type de Fiche Vierge' : '1. Tipo de Folha em Branco'}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            { id: 'isolated', fr: 'Feuille A — Patterns Isolés', pt: 'Folha A — Padrões Isolados' },
            { id: 'sections', fr: 'Feuille B — Multi-Instruments', pt: 'Folha B — Multi-Instrumentos' },
            { id: 'sequence', fr: 'Feuille C — Conducteur Séquence', pt: 'Folha C — Condutor de Sequência' },
          ].map((item) => {
            const isSel = sheetType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSheetType(item.id as BlankSheetType)}
                className={`p-2.5 text-left border-2 cursor-pointer transition-colors shadow-[2px_2px_0px_#1a1a1a] ${
                  isSel
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-black'
                    : 'bg-[#f4ecd8] text-[#1a1a1a] font-semibold border-[#1a1a1a] hover:bg-[#fff9ea]'
                }`}
              >
                {lang === 'fr' ? item.fr : item.pt}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MODE DE GRILLE & PUPITRES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Mode de Grille */}
        <div className="flex flex-col gap-1.5 p-3 bg-black/10 border-2 border-[var(--cordel-border,#1a1a1a)]">
          <label className="font-cactus font-bold uppercase text-[12px] text-[#d99b26] tracking-wide">
            {lang === 'fr' ? '2. Mode de Grille' : '2. Modo da Grelha'}
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: '4/4', label: '4/4 (16 pas)' },
              { id: '2/4', label: '2/4 (8 pas)' },
              { id: '3/4', label: '3/4 (12 pas)' },
              { id: '12/8', label: '12/8 (12 pas)' },
              { id: 'free_portrait', label: lang === 'fr' ? 'Libre 24 (Port.)' : 'Livre 24 (Ret.)' },
              { id: 'free_landscape', label: lang === 'fr' ? 'Libre 32 (Pays.)' : 'Livre 32 (Pais.)' },
            ].map((m) => {
              const isSel = gridMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGridMode(m.id as GridMode)}
                  className={`py-1.5 px-1 text-[10px] border-2 cursor-pointer transition-colors shadow-[1px_1px_0px_#1a1a1a] ${
                    isSel
                      ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-black'
                      : 'bg-[#f4ecd8] text-[#1a1a1a] font-semibold border-[#1a1a1a] hover:bg-[#fff9ea]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pupitres Cochables */}
        <div className="flex flex-col gap-1.5 p-3 bg-black/10 border-2 border-[var(--cordel-border,#1a1a1a)]">
          <label className="font-cactus font-bold uppercase text-[12px] text-[#d99b26] tracking-wide">
            {lang === 'fr' ? '3. Pupitres à imprimer' : '3. Naipes para imprimir'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PUPITRES_REGISTRY.map((p) => {
              const active = pupitres.includes(p.code);
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => togglePupitre(p.code)}
                  className={`px-2 py-1 text-[10px] border-2 cursor-pointer transition-colors shadow-[1px_1px_0px_#1a1a1a] ${
                    active
                      ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-black'
                      : 'bg-[#f4ecd8] text-[#1a1a1a] font-semibold border-[#1a1a1a] hover:bg-[#fff9ea]'
                  }`}
                >
                  {p.code.toUpperCase()} ({lang === 'fr' ? p.nameFr : p.namePt})
                </button>
              );
            })}
          </div>
          {pupitres.includes('al') && (
            <label className="flex items-center gap-1.5 mt-1.5 font-bold text-[10px] cursor-pointer text-[#1a1a1a]">
              <input type="checkbox" checked={includeVarLine} onChange={(e) => setIncludeVarLine(e.target.checked)} className="accent-[#8b2a1a]" />
              <span>{lang === 'fr' ? 'Sous-ligne Alfaias [+1 ligne Variation ↳Me/Rp]' : 'Sublinha Alfaias [+1 linha Variação ↳Me/Rp]'}</span>
            </label>
          )}
        </div>
      </div>

      {/* 3. ACTIONS D'IMPRESSION */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handlePrintSheet}
          className="flex-1 py-2 px-3 bg-[var(--cordel-wood,#8b2a1a)] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{lang === 'fr' ? 'Imprimer la Fiche Sélectionnée' : 'Imprimir Folha Selecionada'}</span>
        </button>
        <button
          type="button"
          onClick={() => printLegendOnly()}
          className="py-2 px-3 bg-white text-black border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>{lang === 'fr' ? 'Légende Complète A4' : 'Legenda Completa A4'}</span>
        </button>
      </div>

      {/* 4. BANDEAU MÉMO INFÉRIEUR */}
      <div className="p-2 border border-black/20 bg-white/60 font-mono text-[9px] text-[#444] rounded-sm truncate">
        {generateMemoFooterText(pupitres, lang)}
      </div>
    </div>
  );
};
