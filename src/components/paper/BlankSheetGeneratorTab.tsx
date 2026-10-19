/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 1 : Générateur des fiches vierges Cordel et Aperçu A4 (< 145 lignes).
 */
import React, { useState } from 'react';
import { BlankSheetType, GridMode } from '../../types/paperWorkshop.types';
import { exportBlankSheetToPdf, printCompletePaperLegend } from '../../utils/paper/blankSheetPdfExport';
import { BlankSheetPupitreSelector } from './BlankSheetPupitreSelector';
import { BlankSheetLivePreview } from './BlankSheetLivePreview';
import { Printer, BookOpen, PenTool } from 'lucide-react';

export const BlankSheetGeneratorTab: React.FC<{ lang: 'fr' | 'pt' }> = ({ lang }) => {
  const [sheetType, setSheetType] = useState<BlankSheetType>('sections');
  const [gridMode, setGridMode] = useState<GridMode>('4/4');
  const [pupitres, setPupitres] = useState<string[]>(['al', 'cx', 'gg', 'ab', 'mi']);
  const [linkAlfaias, setLinkAlfaias] = useState(true);
  const [busCaixas, setBusCaixas] = useState(false);
  const [busSementes, setBusSementes] = useState(false);
  const [includeVarLine, setIncludeVarLine] = useState(true);
  const [freeLinesCount, setFreeLinesCount] = useState(0);

  const [conductorTitle, setConductorTitle] = useState('');
  const [conductorBpm, setConductorBpm] = useState<number | undefined>(undefined);
  const [conductorMeasures, setConductorMeasures] = useState(32);
  const [hasDoubleSections, setHasDoubleSections] = useState(true);
  const [hasToadaLine, setHasToadaLine] = useState(true);

  const togglePupitre = (code: string) => {
    setPupitres((p) => (p.includes(code) ? (p.length > 1 ? p.filter((c) => c !== code) : p) : [...p, code]));
  };

  const handlePrint = () => {
    exportBlankSheetToPdf({
      sheetType, gridMode, pupitres, includeVariationLine: includeVarLine, freeLinesCount, conductorMeasures,
      conductorTitle: conductorTitle ? `${conductorTitle} ${conductorBpm ? `| ♩=${conductorBpm}` : ''}` : undefined,
      hasDoubleSections, hasToadaLine,
    }, lang);
  };

  return (
    <div className="flex flex-col gap-2 text-xs font-sans text-[#1a1a1a]">
      <div className="flex flex-col gap-1 p-2 bg-black/10 border-2 border-[var(--cordel-border,#1a1a1a)]">
        <label className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">
          {lang === 'fr' ? '1. Type de Fiche Vierge' : '1. Tipo de Folha em Branco'}
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          {[
            { id: 'isolated', fr: 'Feuille A — Patterns Isolés', pt: 'Folha A — Padrões Isolados' },
            { id: 'sections', fr: 'Feuille B — Multi-Instruments', pt: 'Folha B — Multi-Instrumentos' },
            { id: 'sequence', fr: 'Feuille C — Conducteur', pt: 'Folha C — Condutor Sequência' },
            { id: 'universal', fr: 'Feuille D — 100% Vierge', pt: 'Folha D — 100% Livre', isUni: true },
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => { setSheetType(item.id as BlankSheetType); if (item.isUni && gridMode !== 'free_landscape') setGridMode('free_portrait'); }} className={`p-1.5 text-left border-2 cursor-pointer shadow-[2px_2px_0px_#1a1a1a] flex items-center gap-1 ${sheetType === item.id ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-black' : 'bg-[#f4ecd8] text-[#1a1a1a] font-semibold border-[#1a1a1a]'}`}>
              {item.isUni && <PenTool className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="truncate">{lang === 'fr' ? item.fr : item.pt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 flex flex-col gap-2">
          {sheetType === 'universal' ? (
            <div className="flex flex-col gap-1.5 p-2 bg-black/10 border-2 border-[#1a1a1a]">
              <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a] flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5" /> {lang === 'fr' ? 'Options Feuille Universelle (Tout à la main) :' : 'Opções Folha Universal :'}
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="font-bold text-[10px]">{lang === 'fr' ? 'Format carreaux :' : 'Formato :'}</span>
                {[
                  { id: 'free_portrait', l: lang === 'fr' ? '24 carreaux (Portrait)' : '24 casas (Retrato)' },
                  { id: 'free_landscape', l: lang === 'fr' ? '32 carreaux (Paysage)' : '32 casas (Paisagem)' },
                ].map((m) => (
                  <button key={m.id} type="button" onClick={() => setGridMode(m.id as GridMode)} className={`px-2 py-0.5 text-[10px] border cursor-pointer ${gridMode === m.id ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-black' : 'bg-[#f4ecd8] text-[#1a1a1a] border-black/30'}`}>{m.l}</button>
                ))}
              </div>
              <p className="text-[10px] italic text-black/70 m-0">
                {lang === 'fr' ? 'Grands carreaux libres avec cases marge [____], cases [×__] et 2 lignes conducteur en bas.' : 'Casas livres com margem [____], casas [×__] e 2 linhas condutor.'}
              </p>
            </div>
          ) : sheetType === 'sequence' ? (
            <div className="flex flex-col gap-1.5 p-2 bg-black/10 border-2 border-[#1a1a1a]">
              <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">Options Conducteur (Feuille C) :</span>
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" placeholder={lang === 'fr' ? 'Titre du Morceau' : 'Título'} value={conductorTitle} onChange={(e) => setConductorTitle(e.target.value)} className="p-1 bg-white border border-black font-cactus text-xs" />
                <input type="number" placeholder="BPM (ex: 96)" value={conductorBpm || ''} onChange={(e) => setConductorBpm(Number(e.target.value) || undefined)} className="p-1 bg-white border border-black font-mono text-xs" />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <label className="flex items-center gap-1 cursor-pointer font-bold text-[10px]">
                  <input type="checkbox" checked={hasDoubleSections} onChange={(e) => setHasDoubleSections(e.target.checked)} className="accent-[#8b2a1a]" />
                  <span>{lang === 'fr' ? 'Double ligne Sections' : 'Linha dupla Seções'}</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-[10px]">
                  <input type="checkbox" checked={hasToadaLine} onChange={(e) => setHasToadaLine(e.target.checked)} className="accent-[#8b2a1a]" />
                  <span>{lang === 'fr' ? 'Ligne Toada / Chant' : 'Linha Toada'}</span>
                </label>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1 p-2 bg-black/10 border-2 border-[#1a1a1a]">
                <label className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">{lang === 'fr' ? '2. Mode de Grille (16 pas)' : '2. Modo da Grelha'}</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {[{ id: '4/4', l: '4/4 (16p)' }, { id: '2/4', l: '2/4 (8p)' }, { id: '3/4', l: '3/4 (12p)' }, { id: '12/8', l: '12/8' }, { id: 'free_portrait', l: 'Libre 24' }, { id: 'free_landscape', l: 'Libre 32' }].map((m) => (
                    <button key={m.id} type="button" onClick={() => setGridMode(m.id as GridMode)} className={`py-1 text-[10px] border cursor-pointer ${gridMode === m.id ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-black' : 'bg-[#f4ecd8] text-[#1a1a1a] border-black/30'}`}>{m.l}</button>
                  ))}
                </div>
              </div>
              <BlankSheetPupitreSelector
                pupitres={pupitres} onTogglePupitre={togglePupitre} linkAlfaias={linkAlfaias} onToggleLinkAlfaias={setLinkAlfaias}
                busCaixas={busCaixas} onToggleBusCaixas={setBusCaixas} busSementes={busSementes} onToggleBusSementes={setBusSementes}
                includeVarLine={includeVarLine} onToggleIncludeVarLine={setIncludeVarLine} freeLinesCount={freeLinesCount} onChangeFreeLinesCount={setFreeLinesCount} lang={lang}
              />
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-0.5">
            <button type="button" onClick={handlePrint} className="flex-1 py-2 px-3 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black cursor-pointer">
              <Printer className="w-4 h-4" /> <span>{lang === 'fr' ? 'Imprimer la Fiche' : 'Imprimir Folha'}</span>
            </button>
            <button type="button" onClick={() => printCompletePaperLegend(lang)} className="py-2 px-3 bg-white text-black border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white cursor-pointer">
              <BookOpen className="w-4 h-4" /> <span>{lang === 'fr' ? 'Légende Complète A4' : 'Legenda A4'}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center items-start">
          <BlankSheetLivePreview
            sheetType={sheetType} gridMode={gridMode} pupitres={pupitres} includeVarLine={includeVarLine} freeLinesCount={freeLinesCount}
            conductorMeasures={conductorMeasures} conductorTitle={conductorTitle} hasDoubleSections={hasDoubleSections} hasToadaLine={hasToadaLine} lang={lang}
          />
        </div>
      </div>
    </div>
  );
};
