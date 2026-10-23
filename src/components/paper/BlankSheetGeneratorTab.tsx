/**
 * Onglet 1 : Générateur Grille 32x25 A4 Paysage & Raccourcis (< 120 lignes).
 */
import React, { useState } from 'react';
import { exportBlankSheetToPdf, printCompletePaperLegend } from '../../utils/paper/blankSheetPdfExport';
import { BlankSheetPupitreSelector } from './BlankSheetPupitreSelector';
import { BlankSheetLivePreview } from './BlankSheetLivePreview';
import { BlankSheetPrefillSelector } from './BlankSheetPrefillSelector';
import { BlankSheetActionButtons } from './BlankSheetActionButtons';
import { BlankSheetGrid32ModeSelector } from './BlankSheetGrid32ModeSelector';
import { PaperLegendInAppModal } from './PaperLegendInAppModal';
import { PaperDictionaryInAppModal } from './PaperDictionaryInAppModal';
import { CheckCircle2 } from 'lucide-react';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

export const BlankSheetGeneratorTab: React.FC<{ lang: 'fr' | 'pt' }> = ({ lang }) => {
  const [grid32Mode, setGrid32Mode] = useState<'blank' | 'prefill'>('blank');
  const [pupitres, setPupitres] = useState<string[]>(['al', 'cx', 'gg', 'ab', 'mi']);
  const [linkAlfaias, setLinkAlfaias] = useState(true);
  const [busCaixas, setBusCaixas] = useState(false);
  const [busSementes, setBusSementes] = useState(false);
  const [includeVarLine, setIncludeVarLine] = useState(true);
  const [freeLinesCount, setFreeLinesCount] = useState(0);
  const [prefillFamily, setPrefillFamily] = useState<string>('');

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);

  const togglePupitre = (code: string) => {
    setPupitres((p) => (p.includes(code) ? (p.length > 1 ? p.filter((c) => c !== code) : p) : [...p, code]));
  };

  const handlePrint = () => {
    exportBlankSheetToPdf({
      sheetType: 'grid32',
      grid32Mode,
      gridMode: 'free_landscape',
      pupitres,
      includeVariationLine: includeVarLine,
      freeLinesCount,
      linkAlfaias,
      busCaixas,
      busSementes,
      prefillFamily: prefillFamily || undefined,
    }, lang);
  };

  return (
    <div className="flex flex-col gap-2 text-xs font-sans text-[var(--cordel-text)]">
      {/* 1. SÉLECTION DU MODE DE LA GRILLE 32x25 */}
      <BlankSheetGrid32ModeSelector grid32Mode={grid32Mode} onChangeMode={setGrid32Mode} lang={lang} />

      {/* 2. RACCOURCIS & CONFIGURATION DES PUPITRES (TOUJOURS VISIBLE & MODIFIABLE) */}
      <div className="flex flex-col gap-1 p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
        <div className="flex items-center gap-1.5 font-cactus font-bold uppercase text-[10.5px] text-[#8b2a1a]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{lang === 'fr' ? 'Raccourcis d’instruments personnalisables (1 à 3 lettres) :' : 'Abreviações de instrumentos personalizáveis (1 a 3 letras) :'}</span>
        </div>
        <p className="text-[10px] text-[var(--cordel-text-muted)] italic m-0">{tPaper(lang, 'abbrNotice')}</p>
        <BlankSheetPupitreSelector
          pupitres={pupitres}
          onTogglePupitre={togglePupitre}
          linkAlfaias={linkAlfaias}
          onToggleLinkAlfaias={setLinkAlfaias}
          busCaixas={busCaixas}
          onToggleBusCaixas={setBusCaixas}
          busSementes={busSementes}
          onToggleBusSementes={setBusSementes}
          includeVarLine={includeVarLine}
          onToggleIncludeVarLine={setIncludeVarLine}
          freeLinesCount={freeLinesCount}
          onChangeFreeLinesCount={setFreeLinesCount}
          lang={lang}
        />
      </div>

      {grid32Mode === 'prefill' && (
        <BlankSheetPrefillSelector selectedFamily={prefillFamily} onSelectFamily={setPrefillFamily} lang={lang} />
      )}

      {/* 3. ACTIONS & APERÇU DIRECT A4 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 flex flex-col gap-2">
          <BlankSheetActionButtons
            onPrint={handlePrint}
            onOpenDictionary={() => setIsDictOpen(true)}
            onOpenLegend={() => setIsLegendOpen(true)}
            onPrintLegendA4={() => printCompletePaperLegend(lang)}
            lang={lang}
          />
        </div>

        <div className="flex justify-center items-start">
          <BlankSheetLivePreview
            sheetType="grid32"
            gridMode="free_landscape"
            pupitres={pupitres}
            includeVarLine={includeVarLine}
            freeLinesCount={freeLinesCount}
            lang={lang}
          />
        </div>
      </div>

      <PaperLegendInAppModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} lang={lang} />
      <PaperDictionaryInAppModal isOpen={isDictOpen} onClose={() => setIsDictOpen(false)} onSelectFamily={(fam) => setPrefillFamily(fam)} lang={lang} />
    </div>
  );
};
