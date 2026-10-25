import React, { useState } from 'react';
import { PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { PaperStepValidationPopover } from './PaperStepValidationPopover';
import { PaperPatternCard } from './PaperPatternCard';
import { PaperPatternOverrideModal } from './PaperPatternOverrideModal';
import { AlertTriangle, Check, Camera, Filter } from 'lucide-react';
import { PaperSectionItem } from '../../utils/paper/paperSectionRenamer';

interface Props {
  scoreId?: string;
  sections?: PaperSectionItem[];
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>;
  reusableSections: Set<string>;
  onToggleReusable: (sectionName: string) => void;
  onRenameSection?: (secId: string, newName: string) => void;
  onUpdateStep?: (secName: string, roleKey: string, stepIndex: number, newVal: PaperStepValue) => void;
  onRescanPattern?: (secName: string) => void;
  onAddNewScannedPattern?: () => void;
  globalBpm?: number;
  globalTimeSig?: string;
  metricOverrides?: Record<string, PatternMetricOverride>;
  onSaveOverride?: (patName: string, override?: PatternMetricOverride) => void;
  isSectionHighlighted?: (secId?: string, secName?: string) => boolean;
  lang: 'fr' | 'pt';
}

export const PaperPatternPreviewGrid: React.FC<Props> = ({
  scoreId, sections, patterns, reusableSections, onToggleReusable, onRenameSection, onUpdateStep,
  onRescanPattern, onAddNewScannedPattern, globalBpm = 96, globalTimeSig = '4/4', metricOverrides = {},
  onSaveOverride, isSectionHighlighted, lang,
}) => {
  const isFr = lang === 'fr';
  const [filterDoubtsOnly, setFilterDoubtsOnly] = useState(false);
  const sectionItems = React.useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.map((s) => ({ id: s.id, secName: s.name, pupitreMap: patterns[s.id] || patterns[s.name] || {} }));
    }
    return Object.entries(patterns).map(([secName, pupitreMap], idx) => ({ id: `sec-${idx}`, secName, pupitreMap }));
  }, [sections, patterns]);

  const previewScoreId = usePaperVigilanceStore((s) => s.activePreviewScoreId);
  const activeScoreId = scoreId || previewScoreId || '';
  const allPoints = usePaperVigilanceStore((s) => s.points);
  const points = React.useMemo(() => allPoints.filter((p) => p.scoreId === activeScoreId), [allPoints, activeScoreId]);
  const removePoint = usePaperVigilanceStore((s) => s.removePoint);
  const togglePoint = usePaperVigilanceStore((s) => s.togglePoint);
  const clearAllForScore = usePaperVigilanceStore((s) => s.clearAllForScore);

  const displayedSections = React.useMemo(() => {
    if (!filterDoubtsOnly || points.length === 0) return sectionItems;
    return sectionItems.filter((it) => points.some((p) => p.sectionName === it.secName));
  }, [filterDoubtsOnly, points, sectionItems]);

  const [popover, setPopover] = useState<{ sec: string; role: string; idx: number; val: PaperStepValue; isVig: boolean } | null>(null);
  const [overrideModalPattern, setOverrideModalPattern] = useState<string | null>(null);

  const handleCellClick = (sec: string, role: string, idx: number, val: PaperStepValue) => {
    setPopover({ sec, role, idx, val, isVig: points.some((p) => p.sectionName === sec && p.roleKey === role && p.stepIndex === idx) });
  };

  const handleSelect = (newVal?: PaperStepValue) => {
    if (!popover) return;
    if (newVal !== undefined) onUpdateStep?.(popover.sec, popover.role, popover.idx, newVal);
    const pt = points.find((p) => p.sectionName === popover.sec && p.roleKey === popover.role && p.stepIndex === popover.idx);
    if (pt) removePoint(pt.id);
    setPopover(null);
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-black/5 border border-black/30 font-sans text-xs">
      <div className="flex flex-wrap justify-between items-center border-b border-black/20 pb-1 gap-1">
        <div className="flex items-center gap-2">
          <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a] dark:text-[#f59e0b]">
            {isFr ? 'Relecture des motifs :' : 'Revisão dos motivos :'}
          </span>
          {points.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterDoubtsOnly((prev) => !prev)}
              className={`px-1.5 py-0.5 border font-bold text-[9px] rounded flex items-center gap-1 cursor-pointer transition-colors ${
                filterDoubtsOnly ? 'bg-[#d97706] text-white border-black' : 'bg-[#fef3c7] text-[#b45309] border-[#d97706]'
              }`}
            >
              <Filter size={10} />
              <span>{filterDoubtsOnly ? (isFr ? 'Toute la grille' : 'Toda a grelha') : `${points.length} ${isFr ? 'doute(s) (Filtrer)' : 'dúvida(s)'}`}</span>
            </button>
          )}
        </div>
        {points.length > 0 && <button type="button" onClick={() => clearAllForScore(activeScoreId)} className="px-2 py-0.5 bg-[#15803d] text-white border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000]"><Check size={11} /> <span>{isFr ? 'Tout valider' : 'Validar tudo'}</span></button>}
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 pb-1">
        {displayedSections.map((item) => (
          <PaperPatternCard
            key={item.id} secName={item.secName} secId={item.id} onRename={(newName) => onRenameSection?.(item.id, newName)}
            pupitreMap={item.pupitreMap} isReusable={reusableSections.has(item.secName) || reusableSections.has(item.id)}
            onToggleReusable={() => onToggleReusable(item.secName)} points={points}
            onCellClick={(role, idx, val) => handleCellClick(item.secName, role, idx, val)}
            globalBpm={globalBpm} globalTimeSig={globalTimeSig} override={metricOverrides[item.secName] || metricOverrides[item.id]}
            onOpenOverrideModal={() => setOverrideModalPattern(item.secName)}
            onRescan={onRescanPattern ? () => onRescanPattern(item.secName) : undefined}
            isHighlighted={isSectionHighlighted?.(item.id, item.secName)} lang={lang}
          />
        ))}
      </div>

      {onAddNewScannedPattern && (
        <button
          type="button"
          onClick={onAddNewScannedPattern}
          className="w-full py-1.5 px-3 bg-[#f4ecd8] hover:bg-[#e2d5b8] text-[#1a1a1a] font-cactus font-bold text-xs uppercase border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:translate-y-0.5"
        >
          <Camera size={13} className="text-[#1a1a1a] shrink-0" />
          <span>{isFr ? '+ Scanner / Ajouter un motif seul' : '+ Escanear / Adicionar padrão'}</span>
        </button>
      )}

      {popover && (
        <PaperStepValidationPopover
          roleKey={popover.role} stepIndex={popover.idx} currentValue={popover.val} isVigilance={popover.isVig}
          onValidateCurrent={() => handleSelect()} onSelectStroke={(st) => handleSelect(st)}
          onToggleVigilance={() => { togglePoint(activeScoreId, popover.sec, popover.role, popover.idx); setPopover(null); }}
          onClose={() => setPopover(null)} lang={lang}
        />
      )}

      {overrideModalPattern && (
        <PaperPatternOverrideModal
          isOpen={Boolean(overrideModalPattern)} onClose={() => setOverrideModalPattern(null)}
          patternName={overrideModalPattern} globalBpm={globalBpm} globalTimeSig={globalTimeSig}
          currentOverride={metricOverrides[overrideModalPattern]} onSaveOverride={(pName, ov) => onSaveOverride?.(pName, ov)} lang={lang}
        />
      )}
    </div>
  );
};
