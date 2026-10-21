/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 1 Mobile : Scan Photo, Fiches Vierges A4 & Relecture Grille (< 140 lignes).
 */

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, FileText, ArrowRight } from 'lucide-react';
import { PaperPreset, PaperStepValue, PaperSequenceItem } from '../../../types/paperWorkshop.types';
import { ALL_PAPER_PRESETS } from '../../../utils/paper/paperTranscribedPresets';
import { factorizeSequence } from '../../paper/SequenceTagBuilder';
import { usePaperVigilanceStore } from '../../../stores/usePaperVigilanceStore';
import { resolvePupitreAbbr } from '../../../utils/paper/paperNomenclatureHelper';
import { injectPaperScoreToStore } from '../../../utils/paper/injectPaperScoreToStore';
import { MobileQuickStrokePopover } from './MobileQuickStrokePopover';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  onOpenBlankSheets?: () => void;
  onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  lang?: 'fr' | 'pt';
}

export const MobilePaperScanTab: React.FC<Props> = ({ onOpenBlankSheets, onOpenPaperWorkshop, lang = 'pt' }) => {
  const [selectedPreset] = useState<PaperPreset>(ALL_PAPER_PRESETS[0]);
  const [editablePatterns, setEditablePatterns] = useState(() => JSON.parse(JSON.stringify(ALL_PAPER_PRESETS[0].patterns)));
  const [sequenceItems] = useState<PaperSequenceItem[]>(() => factorizeSequence(ALL_PAPER_PRESETS[0].defaultSequence));
  const [activePopover, setActivePopover] = useState<{ secName: string; pupitreKey: string; stepIndex: number; val: PaperStepValue } | null>(null);

  const vigilancePoints = usePaperVigilanceStore((s) => s.points), togglePoint = usePaperVigilanceStore((s) => s.togglePoint);
  const longPressTimerRef = useRef<number | null>(null), isLongPressRef = useRef(false);

  const handleCellPointerDown = (secName: string, pupitreKey: string, stepIndex: number, val: PaperStepValue) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      setActivePopover({ secName, pupitreKey, stepIndex, val });
    }, 400);
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

  const handleOpenSheets = () => {
    if (onOpenBlankSheets) onOpenBlankSheets();
    else onOpenPaperWorkshop?.('sheets');
  };

  const firstSec = Object.entries(editablePatterns)[0] || ['Intro', {}];
  const [secName, pupitreMap] = firstSec as [string, Record<string, PaperStepValue[]>];

  return (
    <div className="flex-1 flex flex-col p-2.5 gap-2.5 overflow-y-auto custom-scrollbar select-none">
      <div className="grid grid-cols-3 gap-1.5 shrink-0">
        <label className="h-9 px-1 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 cursor-pointer">
          <Camera size={13} className="text-[#b94a2c]" />
          <span>{tMobile(lang, 'takePhoto')}</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" />
        </label>
        <label className="h-9 px-1 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 cursor-pointer">
          <ImageIcon size={13} className="text-[#d4a017]" />
          <span>{tMobile(lang, 'gallery')}</span>
          <input type="file" accept="image/*" className="hidden" />
        </label>
        <button onClick={handleOpenSheets} className="h-9 px-1 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5">
          <FileText size={13} className="text-[#2a9d8f]" />
          <span>{tMobile(lang, 'blankSheets')}</span>
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-[var(--cordel-border)] p-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-cactus">
          <span className="text-[#d4af37] font-bold">{selectedPreset.name} — {secName}</span>
          <span className="text-[var(--cordel-text)]/70 text-[9px]">Tap: {tMobile(lang, 'vigilancePoint')} | Long: Frappe</span>
        </div>
        <div className="flex flex-col gap-1">
          {Object.entries(pupitreMap).slice(0, 6).map(([pupitreKey, steps]) => {
            const stepArr = Array.isArray(steps) ? steps : Array(16).fill(0);
            return (
              <div key={pupitreKey} className="flex items-center gap-1">
                <span className="w-5 font-mono font-bold text-[9px] bg-black/40 text-[var(--cordel-text)] text-center shrink-0 border border-[var(--cordel-border)]/40">
                  {resolvePupitreAbbr(pupitreKey)}
                </span>
                <div className="grid grid-cols-16 flex-1 border border-[var(--cordel-border)]/60">
                  {stepArr.map((st, i) => {
                    const val = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st ? '·' : String(st));
                    const isPoint = vigilancePoints.some((p) => p.sectionName === secName && p.roleKey === pupitreKey && p.stepIndex === i);
                    return (
                      <button
                        key={i} type="button"
                        onPointerDown={() => handleCellPointerDown(secName, pupitreKey, i, st)}
                        onPointerUp={() => handleCellPointerUp(secName, pupitreKey, i)}
                        className={`h-5 text-[9px] font-mono font-bold flex items-center justify-center transition-all ${
                          i % 4 === 3 ? 'border-r-2 border-[var(--cordel-border)]' : 'border-r border-[var(--cordel-border)]/30'
                        } ${isPoint ? 'bg-[#b94a2c] text-[#f4ecd8] ring-1 ring-[#f4ecd8]' : val !== '·' ? 'bg-[#2a9d8f] text-white' : 'bg-[#121212] text-[var(--cordel-text)]/30'}`}
                      >
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

      <div className="flex items-center justify-between p-2 bg-[#1a1a1a] border border-[var(--cordel-border)]">
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-cactus">
          {sequenceItems.slice(0, 3).map((it, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-[#b94a2c]/20 border border-[#b94a2c] text-[#b94a2c] whitespace-nowrap">
              {it.sectionName} ×{it.repeatCount}
            </span>
          ))}
        </div>
        <button onClick={handleInject} className="px-2 py-1 bg-[#27ae60] text-white font-cactus font-bold text-[10px] uppercase flex items-center gap-1 shadow-[1px_1px_0px_#000] shrink-0">
          <span>{tMobile(lang, 'injectScore')}</span>
          <ArrowRight size={11} />
        </button>
      </div>

      {activePopover && (
        <MobileQuickStrokePopover
          pupitreKey={activePopover.pupitreKey} stepIndex={activePopover.stepIndex} currentValue={activePopover.val}
          onSelectStroke={(newSt) => handleUpdateStroke(activePopover.secName, activePopover.pupitreKey, activePopover.stepIndex, newSt)}
          onClose={() => setActivePopover(null)} lang={lang}
        />
      )}
    </div>
  );
};
