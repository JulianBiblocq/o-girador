/**
 * Onglet 1 : Générateur des fiches vierges Cordel et Aperçu A4 (< 140 lignes).
 */
import React, { useState } from 'react';
import { BlankSheetType, GridMode } from '../../types/paperWorkshop.types';
import { exportBlankSheetToPdf, printCompletePaperLegend } from '../../utils/paper/blankSheetPdfExport';
import { BlankSheetPupitreSelector } from './BlankSheetPupitreSelector';
import { BlankSheetLivePreview } from './BlankSheetLivePreview';
import { BlankSheetPrefillSelector } from './BlankSheetPrefillSelector';
import { BlankSheetActionButtons } from './BlankSheetActionButtons';
import { PaperLegendInAppModal } from './PaperLegendInAppModal';
import { PaperDictionaryInAppModal } from './PaperDictionaryInAppModal';
import { PenTool } from 'lucide-react';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

export const BlankSheetGeneratorTab: React.FC<{ lang: 'fr' | 'pt' }> = ({ lang }) => {
  const [sheetType, setSheetType] = useState<BlankSheetType>('sections');
  const [gridMode, setGridMode] = useState<GridMode>('4/4');
  const [pupitres, setPupitres] = useState<string[]>(['al', 'cx', 'gg', 'ab', 'mi']);
  const [linkAlfaias, setLinkAlfaias] = useState(true);
  const [busCaixas, setBusCaixas] = useState(false);
  const [busSementes, setBusSementes] = useState(false);
  const [includeVarLine, setIncludeVarLine] = useState(true);
  const [freeLinesCount, setFreeLinesCount] = useState(0);
  const [prefillFamily, setPrefillFamily] = useState<string>('');

  const [conductorTitle, setConductorTitle] = useState('');
  const [conductorBpm, setConductorBpm] = useState<number | undefined>(undefined);
  const [conductorMeasures, setConductorMeasures] = useState(32);
  const [hasDoubleSections, setHasDoubleSections] = useState(true);
  const [hasToadaLine, setHasToadaLine] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);

  const togglePupitre = (code: string) => {
    setPupitres((p) => (p.includes(code) ? (p.length > 1 ? p.filter((c) => c !== code) : p) : [...p, code]));
  };

  const handlePrint = () => {
    exportBlankSheetToPdf({
      sheetType, gridMode, pupitres, includeVariationLine: includeVarLine, freeLinesCount, conductorMeasures,
      conductorTitle: conductorTitle ? `${conductorTitle} ${conductorBpm ? `| =${conductorBpm}` : ''}` : undefined,
      hasDoubleSections, hasToadaLine, bpm: conductorBpm,
      linkAlfaias, busCaixas, busSementes, prefillFamily: prefillFamily || undefined,
    }, lang);
  };

  const sheetTypes = [
    { id: 'isolated', label: tPaper(lang, 'sheetA') },
    { id: 'sections', label: tPaper(lang, 'sheetB') },
    { id: 'sequence', label: tPaper(lang, 'sheetC') },
    { id: 'universal', label: tPaper(lang, 'sheetD'), isUni: true },
  ];

  return (
    <div className="flex flex-col gap-2 text-xs font-sans text-[var(--cordel-text)]">
      <div className="flex flex-col gap-1 p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
        <label className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">{tPaper(lang, 'step1Type')}</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          {sheetTypes.map((item) => (
            <button key={item.id} type="button" onClick={() => { setSheetType(item.id as BlankSheetType); if (item.isUni && gridMode !== 'free_landscape') setGridMode('free_portrait'); }} className={`p-1.5 text-left border-2 cursor-pointer shadow-[2px_2px_0px_var(--cordel-border)] flex items-center gap-1 ${sheetType === item.id ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-semibold border-[var(--cordel-border)]'}`}>
              {item.isUni && <PenTool className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <BlankSheetPrefillSelector selectedFamily={prefillFamily} onSelectFamily={setPrefillFamily} lang={lang} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 flex flex-col gap-2">
          {sheetType === 'universal' ? (
            <div className="flex flex-col gap-1.5 p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
              <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a] flex items-center gap-1"><PenTool className="w-3.5 h-3.5" /> {tPaper(lang, 'optionsUniversal')}</span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="font-bold text-[10px]">{tPaper(lang, 'formatCarreaux')}</span>
                {[{ id: 'free_portrait', l: tPaper(lang, 'freePortrait24') }, { id: 'free_landscape', l: tPaper(lang, 'freeLandscape32') }].map((m) => (
                  <button key={m.id} type="button" onClick={() => setGridMode(m.id as GridMode)} className={`px-2 py-0.5 text-[10px] border cursor-pointer ${gridMode === m.id ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'}`}>{m.l}</button>
                ))}
              </div>
              <p className="text-[10px] italic text-[var(--cordel-text-muted)] m-0">{tPaper(lang, 'descUniversal')}</p>
            </div>
          ) : sheetType === 'sequence' ? (
            <div className="flex flex-col gap-1.5 p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
              <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">{tPaper(lang, 'optionsConductor')}</span>
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" placeholder={tPaper(lang, 'songTitlePlaceholder')} value={conductorTitle} onChange={(e) => setConductorTitle(e.target.value)} className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus text-xs" />
                <input type="number" placeholder="BPM (ex: 96)" value={conductorBpm || ''} onChange={(e) => setConductorBpm(Number(e.target.value) || undefined)} className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-mono text-xs" />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <label className="flex items-center gap-1 cursor-pointer font-bold text-[10px]"><input type="checkbox" checked={hasDoubleSections} onChange={(e) => setHasDoubleSections(e.target.checked)} className="accent-[#8b2a1a]" /> <span>{tPaper(lang, 'doubleLineSections')}</span></label>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-[10px]"><input type="checkbox" checked={hasToadaLine} onChange={(e) => setHasToadaLine(e.target.checked)} className="accent-[#8b2a1a]" /> <span>{tPaper(lang, 'toadaLine')}</span></label>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1 p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
                <label className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">{tPaper(lang, 'step2GridMode')}</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {[{ id: '4/4', l: '4/4 (16p)' }, { id: '2/4', l: '2/4 (8p)' }, { id: '3/4', l: '3/4 (12p)' }, { id: '12/8', l: '12/8' }, { id: 'free_portrait', l: 'Libre 24' }, { id: 'free_landscape', l: 'Libre 32' }].map((m) => (
                    <button key={m.id} type="button" onClick={() => setGridMode(m.id as GridMode)} className={`py-1 text-[10px] border cursor-pointer ${gridMode === m.id ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'}`}>{m.l}</button>
                  ))}
                </div>
              </div>
              <BlankSheetPupitreSelector pupitres={pupitres} onTogglePupitre={togglePupitre} linkAlfaias={linkAlfaias} onToggleLinkAlfaias={setLinkAlfaias} busCaixas={busCaixas} onToggleBusCaixas={setBusCaixas} busSementes={busSementes} onToggleBusSementes={setBusSementes} includeVarLine={includeVarLine} onToggleIncludeVarLine={setIncludeVarLine} freeLinesCount={freeLinesCount} onChangeFreeLinesCount={setFreeLinesCount} lang={lang} />
            </>
          )}
          <BlankSheetActionButtons onPrint={handlePrint} onOpenDictionary={() => setIsDictOpen(true)} onOpenLegend={() => setIsLegendOpen(true)} onPrintLegendA4={() => printCompletePaperLegend(lang)} lang={lang} />
        </div>

        <div className="flex justify-center items-start">
          <BlankSheetLivePreview sheetType={sheetType} gridMode={gridMode} pupitres={pupitres} includeVarLine={includeVarLine} freeLinesCount={freeLinesCount} conductorMeasures={conductorMeasures} conductorTitle={conductorTitle} hasDoubleSections={hasDoubleSections} hasToadaLine={hasToadaLine} lang={lang} />
        </div>
      </div>

      <PaperLegendInAppModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} lang={lang} />
      <PaperDictionaryInAppModal isOpen={isDictOpen} onClose={() => setIsDictOpen(false)} onSelectFamily={(fam) => setPrefillFamily(fam)} lang={lang} />
    </div>
  );
};
