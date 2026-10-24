import React, { useState } from 'react';
import { PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { PaperStepValidationPopover } from './PaperStepValidationPopover';
import { PaperPatternCard } from './PaperPatternCard';
import { PaperPatternOverrideModal } from './PaperPatternOverrideModal';
import { AlertTriangle, Check } from 'lucide-react';
import { PaperSectionItem } from '../../utils/paper/paperSectionRenamer';

interface Props {
  scoreId?: string;
  sections?: PaperSectionItem[];
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>;
  reusableSections: Set<string>;
  onToggleReusable: (sectionName: string) => void;
  onRenameSection?: (secId: string, newName: string) => void;
  onUpdateStep?: (secName: string, roleKey: string, stepIndex: number, newVal: PaperStepValue) => void;
  globalBpm?: number;
  globalTimeSig?: string;
  metricOverrides?: Record<string, PatternMetricOverride>;
  onSaveOverride?: (patName: string, override?: PatternMetricOverride) => void;
  lang: 'fr' | 'pt';
}

export const PaperPatternPreviewGrid: React.FC<Props> = ({
  scoreId, sections, patterns, reusableSections, onToggleReusable, onRenameSection, onUpdateStep,
  globalBpm = 96, globalTimeSig = '4/4', metricOverrides = {}, onSaveOverride, lang,
}) => {
  const sectionItems = React.useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.map((s) => ({
        id: s.id,
        secName: s.name,
        pupitreMap: patterns[s.id] || patterns[s.name] || {},
      }));
    }
    return Object.entries(patterns).map(([secName, pupitreMap], idx) => ({
      id: `sec-${idx}`,
      secName,
      pupitreMap,
    }));
  }, [sections, patterns]);

  const previewScoreId = usePaperVigilanceStore((s) => s.activePreviewScoreId);
  const activeScoreId = scoreId || previewScoreId || '';
  const allPoints = usePaperVigilanceStore((s) => s.points);
  const points = React.useMemo(() => allPoints.filter((p) => p.scoreId === activeScoreId), [allPoints, activeScoreId]);
  const removePoint = usePaperVigilanceStore((s) => s.removePoint);
  const togglePoint = usePaperVigilanceStore((s) => s.togglePoint);
  const clearAllForScore = usePaperVigilanceStore((s) => s.clearAllForScore);

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
            {lang === 'fr' ? 'Relecture des motifs :' : 'Revisão dos motivos :'}
          </span>
          {points.length > 0 && <span className="px-1.5 py-0.5 bg-[#fef3c7] text-[#b45309] border border-[#d97706] font-bold text-[9px] rounded flex items-center gap-1"><AlertTriangle size={10} /> {points.length} {lang === 'fr' ? 'point(s) à vérifier' : 'ponto(s) para rever'}</span>}
        </div>
        {points.length > 0 && <button type="button" onClick={() => clearAllForScore(activeScoreId)} className="px-2 py-0.5 bg-[#15803d] text-white border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000]"><Check size={11} /> <span>{lang === 'fr' ? 'Tout valider' : 'Validar tudo'}</span></button>}
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 pb-3">
        {sectionItems.map((item) => (
          <PaperPatternCard
            key={item.id}
            secName={item.secName}
            onRename={(newName) => onRenameSection?.(item.id, newName)}
            pupitreMap={item.pupitreMap}
            isReusable={reusableSections.has(item.secName) || reusableSections.has(item.id)}
            onToggleReusable={() => onToggleReusable(item.secName)}
            points={points}
            onCellClick={(role, idx, val) => handleCellClick(item.secName, role, idx, val)}
            globalBpm={globalBpm}
            globalTimeSig={globalTimeSig}
            override={metricOverrides[item.secName] || metricOverrides[item.id]}
            onOpenOverrideModal={() => setOverrideModalPattern(item.secName)}
            lang={lang}
          />
        ))}
      </div>

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
          isOpen={Boolean(overrideModalPattern)}
          onClose={() => setOverrideModalPattern(null)}
          patternName={overrideModalPattern}
          globalBpm={globalBpm}
          globalTimeSig={globalTimeSig}
          currentOverride={metricOverrides[overrideModalPattern]}
          onSaveOverride={(pName, ov) => onSaveOverride?.(pName, ov)}
          lang={lang}
        />
      )}
    </div>
  );
};
