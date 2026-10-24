/**
 * Onglet 1 Mobile : Scan Photo, Relecture Rapide & Sauvegarde Cloud (< 125 lignes).
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowRight, Check, Cloud } from 'lucide-react';
import { PaperPreset, PaperStepValue, PaperSequenceItem } from '../../../types/paperWorkshop.types';
import { ALL_PAPER_PRESETS } from '../../../utils/paper/paperTranscribedPresets';
import { getActiveSongPaperPreset } from '../../../utils/paper/paperActiveSongExtractor';
import { factorizeSequence } from '../../paper/SequenceTagBuilder';
import { usePaperVigilanceStore } from '../../../stores/usePaperVigilanceStore';
import { injectPaperScoreToStore } from '../../../utils/paper/injectPaperScoreToStore';
import { PaperInjectOptions } from '../../../utils/paper/paperTrackBuilder';
import { PaperInjectOptionsBar } from '../../paper/PaperInjectOptionsBar';
import { scanAndRegisterDoubtPoints } from '../../../utils/paper/paperScanDoubtDetector';
import { disambiguateAllPresetPatterns } from '../../../utils/paper/paperRoleDisambiguator';
import { MobileQuickStrokePopover } from './MobileQuickStrokePopover';
import { MobilePaperScanActionsBar } from './MobilePaperScanActionsBar';
import { MobilePaperScanGrid } from './MobilePaperScanGrid';
import { PaperLegendInAppModal } from '../../paper/PaperLegendInAppModal';
import { PaperDictionaryInAppModal } from '../../paper/PaperDictionaryInAppModal';
import { MobileLiveCameraBox } from './MobileLiveCameraBox';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { tMobile } from '../../../i18n/mobileTranslations';
import { usePaperScanDrafts } from '../../../hooks/paper/usePaperScanDrafts';
import { autoSaveDraftOnInject } from '../../../utils/paper/paperScanCloudStorage';

interface Props { onOpenBlankSheets?: () => void; onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void; lang?: 'fr' | 'pt'; }

export const MobilePaperScanTab: React.FC<Props> = ({ onOpenBlankSheets, onOpenPaperWorkshop, lang: propLang }) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const initialPreset = useMemo(() => getActiveSongPaperPreset(lang) || ALL_PAPER_PRESETS[0], [lang]);
  const [selectedPreset] = useState<PaperPreset>(() => initialPreset);
  const [editablePatterns, setEditablePatterns] = useState(() => disambiguateAllPresetPatterns(JSON.parse(JSON.stringify(initialPreset.patterns))));
  const [sequenceItems] = useState<PaperSequenceItem[]>(() => factorizeSequence(initialPreset.defaultSequence));
  const [activePopover, setActivePopover] = useState<{ secName: string; pupitreKey: string; stepIndex: number; val: PaperStepValue } | null>(null);
  const [injectOpts, setInjectOpts] = useState<PaperInjectOptions>({ linkAlfaias: true, linkCaixas: true, caixasLinkMode: 'caixa_tarol' });
  const [isLegendOpen, setIsLegendOpen] = useState(false), [isDictOpen, setIsDictOpen] = useState(false), [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [filterDoubtsOnly, setFilterDoubtsOnly] = useState(false);
  const scoreId = selectedPreset.id || selectedPreset.name.toLowerCase().replace(/\s+/g, '_');
  const allPoints = usePaperVigilanceStore((s) => s.points);
  const vigilancePoints = useMemo(() => allPoints.filter((p) => p.scoreId === scoreId), [allPoints, scoreId]);
  const togglePoint = usePaperVigilanceStore((s) => s.togglePoint);
  const clearAllForScore = usePaperVigilanceStore((s) => s.clearAllForScore);
  const longPressTimerRef = useRef<number | null>(null), isLongPressRef = useRef(false);
  const { saveCurrentDraft, isSavingDraft } = usePaperScanDrafts(scoreId);

  useEffect(() => { scanAndRegisterDoubtPoints(scoreId, editablePatterns); usePaperVigilanceStore.getState().setActivePreviewScoreId(scoreId); }, [scoreId, editablePatterns]);

  const handleCellPointerDown = (secName: string, pupitreKey: string, stepIndex: number, val: PaperStepValue) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => { isLongPressRef.current = true; setActivePopover({ secName, pupitreKey, stepIndex, val }); }, 400);
  };
  const handleCellPointerUp = (secName: string, pupitreKey: string, stepIndex: number) => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    if (!isLongPressRef.current) togglePoint(scoreId, secName, pupitreKey, stepIndex);
  };

  const handleUpdateStroke = (sName: string, pKey: string, sIdx: number, newSt: PaperStepValue) => {
    setEditablePatterns((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev)); if (!copy[sName]) copy[sName] = {};
      if (!copy[sName][pKey]) copy[sName][pKey] = Array(16).fill(0); copy[sName][pKey][sIdx] = newSt; return copy;
    });
    const pt = vigilancePoints.find((p) => p.sectionName === sName && p.roleKey === pKey && p.stepIndex === sIdx);
    if (pt) usePaperVigilanceStore.getState().removePoint(pt.id);
  };

  const handleSaveDraft = async () => {
    const flattened = sequenceItems.flatMap((it) => Array(it.repeatCount).fill(it.sectionName));
    await saveCurrentDraft(selectedPreset.name, { preset: { ...selectedPreset, patterns: editablePatterns, defaultSequence: flattened }, orderedSectionNames: Object.keys(editablePatterns), vigilancePoints, injectOptions: injectOpts }, 'mobile');
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: lang === 'fr' ? 'Import sauvegardé sur le Cloud — prêt à être repris sur PC' : 'Importação salva na Nuvem — pronta para continuar no PC' } }));
  };

  const handleInject = () => {
    const flattened = sequenceItems.flatMap((it) => Array(it.repeatCount).fill(it.sectionName));
    const res = injectPaperScoreToStore({ ...selectedPreset, patterns: editablePatterns }, flattened, new Set(), lang, false, injectOpts);
    if (res.success) { autoSaveDraftOnInject(selectedPreset.name, useSequencerStore.getState()); useSequencerStore.getState().setMobileViewMode('percussion'); }
  };

  const handleOpenWorkshop = () => (onOpenPaperWorkshop ? onOpenPaperWorkshop('scanner') : onOpenBlankSheets?.());
  const [secName, pupitreMap] = (Object.entries(editablePatterns)[0] || ['Intro', {}]) as [string, Record<string, PaperStepValue[]>];
  const displayedPupitres = useMemo(() => {
    const entries = Object.entries(pupitreMap);
    if (!filterDoubtsOnly) return entries.slice(0, 6);
    return entries.filter(([pKey]) => vigilancePoints.some((p) => p.sectionName === secName && p.roleKey === pKey));
  }, [pupitreMap, filterDoubtsOnly, vigilancePoints, secName]);

  return (
    <div className="flex-1 flex flex-col p-2.5 gap-2.5 overflow-y-auto custom-scrollbar select-none text-[var(--cordel-text)] relative">
      <MobilePaperScanActionsBar onTakePhoto={() => setIsLiveCameraOpen(true)} onOpenWorkshop={handleOpenWorkshop} onOpenLegend={() => setIsLegendOpen(true)} onOpenDictionary={() => setIsDictOpen(true)} lang={lang} />
      <div className="bg-[var(--cordel-surface)]/95 backdrop-blur-[1px] border-2 border-[var(--cordel-border)] p-2 flex flex-col gap-1.5 shadow-[2px_2px_0px_#000]">
        <div className="flex items-center justify-between text-[11px] font-cactus">
          <span className="font-extrabold text-[#8b2a1a] dark:text-[#f59e0b] truncate">{selectedPreset.name} — {secName}</span>
          {vigilancePoints.length > 0 ? (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => setFilterDoubtsOnly((v) => !v)} className={`px-1.5 py-0.5 border border-black font-bold text-[9px] cursor-pointer ${filterDoubtsOnly ? 'bg-[#d97706] text-white' : 'bg-[#fef3c7] text-[#1a1a1a]'}`}>
                {filterDoubtsOnly ? (lang === 'fr' ? 'Tout' : 'Tudo') : `${lang === 'fr' ? 'Doutes' : 'Dúvidas'} (${vigilancePoints.length})`}
              </button>
              <button type="button" onClick={() => clearAllForScore(scoreId)} className="px-1.5 py-0.5 bg-[#15803d] text-white border border-black font-bold text-[9px] flex items-center gap-1 cursor-pointer">
                <Check size={10} /> <span>{lang === 'fr' ? 'Valider' : 'Validar'}</span>
              </button>
            </div>
          ) : <span className="text-[var(--cordel-text-muted)] text-[9px]">Tap: {tMobile(lang, 'vigilancePoint')} | Long: Frappe</span>}
        </div>
        <MobilePaperScanGrid
          displayedPupitres={displayedPupitres}
          secName={secName}
          vigilancePoints={vigilancePoints}
          lang={lang}
          onCellPointerDown={handleCellPointerDown}
          onCellPointerUp={handleCellPointerUp}
        />
      </div>
      <PaperInjectOptionsBar preset={{ ...selectedPreset, patterns: editablePatterns }} options={injectOpts} onChange={setInjectOpts} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_#000] gap-2">
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-cactus w-full sm:w-auto">
          {sequenceItems.slice(0, 3).map((it, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-[var(--cordel-bg)] border border-[#8b2a1a] dark:border-[#f59e0b]/60 text-[#8b2a1a] dark:text-[#f59e0b] font-bold whitespace-nowrap shadow-xs">{(it.sectionName || '').replace(/Partie/g, lang === 'fr' ? 'Partie' : 'Parte')} ×{it.repeatCount}</span>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto">
          <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft} className="flex-1 sm:flex-initial px-2 py-1.5 bg-[#f4ecd8] hover:bg-[#e2d5b8] text-[#1a1a1a] border border-[#1a1a1a] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0px_#1a1a1a] cursor-pointer">
            <Cloud size={11} className="text-[#1a1a1a] shrink-0" />
            <span className="whitespace-nowrap">{isSavingDraft ? (lang === 'fr' ? 'Sauvegarde...' : 'Salvando...') : (lang === 'fr' ? 'Sauver (Cloud)' : 'Salvar (Nuvem)')}</span>
          </button>
          <button onClick={handleInject} className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-[#15803d] text-white font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#000] shrink-0 cursor-pointer hover:bg-black">
            <span className="whitespace-nowrap">{tMobile(lang, 'injectScore')}</span> <ArrowRight size={11} className="shrink-0" />
          </button>
        </div>
      </div>
      {activePopover && <MobileQuickStrokePopover pupitreKey={activePopover.pupitreKey} stepIndex={activePopover.stepIndex} currentValue={activePopover.val} onSelectStroke={(newSt) => handleUpdateStroke(activePopover.secName, activePopover.pupitreKey, activePopover.stepIndex, newSt)} onClose={() => setActivePopover(null)} lang={lang} />}
      <PaperLegendInAppModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} lang={lang} />
      <PaperDictionaryInAppModal isOpen={isDictOpen} onClose={() => setIsDictOpen(false)} lang={lang} />
      <MobileLiveCameraBox isOpen={isLiveCameraOpen} onClose={() => setIsLiveCameraOpen(false)} defaultFacingMode="environment" captureFormat="fullscreen-doc" onCapture={() => scanAndRegisterDoubtPoints(scoreId, editablePatterns)} lang={lang} isModal />
    </div>
  );
};
