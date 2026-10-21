/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 1 Mobile : Scan Photo, Fiches Vierges A4 & Relecture Grille (< 130 lignes).
 */
import React, { useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { PaperPreset, PaperStepValue, PaperSequenceItem } from '../../../types/paperWorkshop.types';
import { ALL_PAPER_PRESETS } from '../../../utils/paper/paperTranscribedPresets';
import { getActiveSongPaperPreset } from '../../../utils/paper/paperActiveSongExtractor';
import { factorizeSequence } from '../../paper/SequenceTagBuilder';
import { usePaperVigilanceStore } from '../../../stores/usePaperVigilanceStore';
import { resolvePupitreAbbr } from '../../../utils/paper/paperNomenclatureHelper';
import { injectPaperScoreToStore } from '../../../utils/paper/injectPaperScoreToStore';
import { MobileQuickStrokePopover } from './MobileQuickStrokePopover';
import { MobilePaperScanActionsBar } from './MobilePaperScanActionsBar';
import { PaperLegendInAppModal } from '../../paper/PaperLegendInAppModal';
import { PaperDictionaryInAppModal } from '../../paper/PaperDictionaryInAppModal';
import { MobileLiveCameraBox } from './MobileLiveCameraBox';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  onOpenBlankSheets?: () => void;
  onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  lang?: 'fr' | 'pt';
}

export const MobilePaperScanTab: React.FC<Props> = ({ onOpenBlankSheets, onOpenPaperWorkshop, lang: propLang }) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const initialPreset = React.useMemo(() => getActiveSongPaperPreset(lang) || ALL_PAPER_PRESETS[0], [lang]);
  const [selectedPreset] = useState<PaperPreset>(() => initialPreset);
  const [editablePatterns, setEditablePatterns] = useState(() => JSON.parse(JSON.stringify(initialPreset.patterns)));
  const [sequenceItems] = useState<PaperSequenceItem[]>(() => factorizeSequence(initialPreset.defaultSequence));
  const [activePopover, setActivePopover] = useState<{ secName: string; pupitreKey: string; stepIndex: number; val: PaperStepValue } | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  const vigilancePoints = usePaperVigilanceStore((s) => s.points), togglePoint = usePaperVigilanceStore((s) => s.togglePoint);
  const longPressTimerRef = useRef<number | null>(null), isLongPressRef = useRef(false);

  const handleCellPointerDown = (secName: string, pupitreKey: string, stepIndex: number, val: PaperStepValue) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => { isLongPressRef.current = true; setActivePopover({ secName, pupitreKey, stepIndex, val }); }, 400);
  };

  const handleCellPointerUp = (secName: string, pupitreKey: string, stepIndex: number) => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    if (!isLongPressRef.current) togglePoint(secName, pupitreKey, stepIndex);
  };

  const handleUpdateStroke = (secName: string, pupitreKey: string, stepIndex: number, newStroke: PaperStepValue) => {
    setEditablePatterns((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[secName]) copy[secName] = {};
      if (!copy[secName][pupitreKey]) copy[secName][pupitreKey] = Array(16).fill(0);
      copy[secName][pupitreKey][stepIndex] = newStroke;
      return copy;
    });
  };

  const handleInject = () => {
    const flattened = sequenceItems.flatMap((it) => Array(it.repeatCount).fill(it.sectionName));
    injectPaperScoreToStore({ ...selectedPreset, patterns: editablePatterns }, flattened, new Set(), lang, false);
  };

  const handleOpenSheets = () => (onOpenBlankSheets ? onOpenBlankSheets() : onOpenPaperWorkshop?.('sheets'));
  const [secName, pupitreMap] = (Object.entries(editablePatterns)[0] || ['Intro', {}]) as [string, Record<string, PaperStepValue[]>];

  return (
    <div className="flex-1 flex flex-col p-2.5 gap-2.5 overflow-y-auto custom-scrollbar select-none text-[var(--cordel-text)] relative">
      <MobilePaperScanActionsBar onTakePhoto={() => setIsLiveCameraOpen(true)} onOpenSheets={handleOpenSheets} onOpenLegend={() => setIsLegendOpen(true)} onOpenDictionary={() => setIsDictOpen(true)} lang={lang} />

      <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] p-2 flex flex-col gap-1.5 shadow-[2px_2px_0px_#000]">
        <div className="flex items-center justify-between text-[11px] font-cactus">
          <span className="font-bold text-[#8b2a1a]">{selectedPreset.name} — {secName}</span>
          <span className="text-[var(--cordel-text-muted)] text-[9px]">Tap: {tMobile(lang, 'vigilancePoint')} | Long: Frappe</span>
        </div>
        <div className="flex items-center gap-1 pl-6">
          <div className="grid grid-cols-4 flex-1 text-center font-mono font-bold text-[8.5px] text-[var(--cordel-text-muted)]">
            <span>T1</span><span>T2</span><span>T3</span><span>T4</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {Object.entries(pupitreMap).slice(0, 6).map(([pupitreKey, steps]) => {
            const stepArr = Array.isArray(steps) ? steps : Array(16).fill(0);
            return (
              <div key={pupitreKey} className="flex items-center gap-1">
                <span className="w-5 font-mono font-bold text-[9px] bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] text-center shrink-0 border border-[var(--cordel-border)]">
                  {resolvePupitreAbbr(pupitreKey)}
                </span>
                <div className="grid grid-cols-16 flex-1 border border-[var(--cordel-border)]">
                  {stepArr.map((st, i) => {
                    const val = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st ? '•' : String(st));
                    const isPoint = vigilancePoints.some((p) => p.sectionName === secName && p.roleKey === pupitreKey && p.stepIndex === i);
                    const isEven = Math.floor(i / 4) % 2 === 1;
                    return (
                      <button key={i} type="button" onPointerDown={() => handleCellPointerDown(secName, pupitreKey, i, st)} onPointerUp={() => handleCellPointerUp(secName, pupitreKey, i)} className={`h-5 text-[9px] font-mono font-bold flex items-center justify-center transition-all ${i % 4 === 3 ? 'border-r-2 border-[var(--cordel-border)]' : 'border-r border-[var(--cordel-border)]/30'} ${isPoint ? 'bg-[#b94a2c] text-[#f4ecd8] ring-1 ring-[#f4ecd8]' : val !== '•' ? 'bg-[#2a9d8f] text-white' : isEven ? 'bg-[var(--cordel-beat-even)] text-[var(--cordel-text)]/50' : 'bg-[var(--cordel-beat-odd)] text-[var(--cordel-text)]/50'}`}>
                        {isPoint ? '▪' : val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_#000]">
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-cactus">
          {sequenceItems.slice(0, 3).map((it, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-[var(--cordel-bg)] border border-[#8b2a1a] text-[#8b2a1a] font-bold whitespace-nowrap">
              {(it.sectionName || '').replace(/Partie/g, lang === 'fr' ? 'Partie' : 'Parte')} ×{it.repeatCount}
            </span>
          ))}
        </div>
        <button onClick={handleInject} className="px-2.5 py-1.5 bg-[#15803d] text-white font-cactus font-bold text-[10px] uppercase flex items-center gap-1.5 shadow-[1px_1px_0px_#000] shrink-0 cursor-pointer hover:bg-black">
          <span>{tMobile(lang, 'injectScore')}</span> <ArrowRight size={11} />
        </button>
      </div>

      {activePopover && <MobileQuickStrokePopover pupitreKey={activePopover.pupitreKey} stepIndex={activePopover.stepIndex} currentValue={activePopover.val} onSelectStroke={(newSt) => handleUpdateStroke(activePopover.secName, activePopover.pupitreKey, activePopover.stepIndex, newSt)} onClose={() => setActivePopover(null)} lang={lang} />}
      <PaperLegendInAppModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} lang={lang} />
      <PaperDictionaryInAppModal isOpen={isDictOpen} onClose={() => setIsDictOpen(false)} lang={lang} />
      <MobileLiveCameraBox isOpen={isLiveCameraOpen} onClose={() => setIsLiveCameraOpen(false)} defaultFacingMode="environment" onCapture={() => {}} lang={lang} isModal />
    </div>
  );
};
