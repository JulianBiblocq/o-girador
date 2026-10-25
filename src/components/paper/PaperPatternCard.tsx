/**
 * Carte d'un motif individuel dans la grille de relecture avec métrique déverrouillée (< 115 lignes).
 */
import React from 'react';
import { PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { PaperPatternCardHeader } from './PaperPatternCardHeader';
import { PaperPatternRow } from './PaperPatternRow';

interface Props {
  secName: string;
  secId?: string;
  onRename?: (newName: string) => void;
  pupitreMap: Partial<Record<string, PaperStepValue[]>>;
  isReusable: boolean;
  onToggleReusable: () => void;
  points: any[];
  onCellClick: (role: string, idx: number, val: PaperStepValue) => void;
  onShiftRow?: (role: string, newSteps: PaperStepValue[]) => void;
  globalTimeSig: string;
  override?: PatternMetricOverride;
  onOpenOverrideModal: () => void;
  onRescan?: () => void;
  isHighlighted?: boolean;
  lang: 'fr' | 'pt';
}

export const PaperPatternCard: React.FC<Props> = ({
  secName, secId, onRename, pupitreMap, isReusable, onToggleReusable, points, onCellClick,
  onShiftRow, globalTimeSig, override, onOpenOverrideModal, onRescan, isHighlighted, lang,
}) => {
  const [selectedCell, setSelectedCell] = React.useState<{ role: string; idx: number } | null>(null);
  const isFr = lang === 'fr';

  const nativeSteps = React.useMemo(() => {
    const lengths = Object.values(pupitreMap).filter(Array.isArray).map((a) => (a as any[]).length);
    return lengths.length > 0 ? Math.max(...lengths) : 16;
  }, [pupitreMap]);

  const displaySteps = override?.steps || nativeSteps;
  const displaySig = override?.timeSignature || (displaySteps === 8 ? '2/4' : (displaySteps === 12 ? '12/8' : globalTimeSig)) || '4/4';
  const isOverridden = Boolean(override?.isLocked || override?.timeSignature || override?.steps);
  const numBeats = Math.max(1, Math.floor(displaySteps / 4));

  const handleShiftRow = (roleKey: string, dir: -1 | 1, currentSteps: PaperStepValue[]) => {
    const next = [...currentSteps];
    const len = next.length;
    let startIdx = 0;
    if (selectedCell && selectedCell.role === roleKey && selectedCell.idx >= 0 && selectedCell.idx < len) {
      startIdx = selectedCell.idx;
      setSelectedCell({ role: roleKey, idx: Math.max(0, Math.min(len - 1, startIdx + dir)) });
    }
    const endIdx = len - 1;
    if (dir === 1) {
      for (let i = endIdx; i > startIdx; i--) next[i] = next[i - 1];
      next[startIdx] = 0;
    } else {
      for (let i = startIdx; i < endIdx; i++) next[i] = next[i + 1];
      next[endIdx] = 0;
    }
    onShiftRow?.(roleKey, next);
  };

  return (
    <div
      data-paper-section-id={secId || secName}
      data-paper-section-name={secName}
      className={`p-2 pb-3 bg-[#fdfbf7] dark:bg-[#fdfbf7] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] transition-all duration-500 ${
        isHighlighted ? 'ring-4 ring-[#d99b26] shadow-[0_0_20px_rgba(217,155,38,0.6)]' : ''
      }`}
    >
      <PaperPatternCardHeader
        secName={secName} onRename={onRename} displaySig={displaySig} displaySteps={displaySteps}
        isOverridden={isOverridden} onOpenOverrideModal={onOpenOverrideModal}
        onRescan={onRescan} isReusable={isReusable} onToggleReusable={onToggleReusable} isHighlighted={isHighlighted} lang={lang}
      />

      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-6 shrink-0" />
        <div className="grid flex-1 text-[9px] font-cactus font-bold text-[#8b2a1a] text-center" style={{ gridTemplateColumns: `repeat(${numBeats}, minmax(0, 1fr))` }}>
          <span>T1</span><span>T2</span>{numBeats >= 3 && <span>T3</span>}{numBeats >= 4 && <span>T4</span>}
        </div>
        <span className="w-10 shrink-0" />
      </div>

      <div className="flex flex-col gap-1">
        {Object.entries(pupitreMap).map(([pupitreKey, steps]) => (
          <PaperPatternRow
            key={pupitreKey}
            pupitreKey={pupitreKey}
            steps={steps}
            displaySteps={displaySteps}
            secName={secName}
            points={points}
            selectedCell={selectedCell}
            onSelectCell={(role, idx, val) => {
              setSelectedCell({ role, idx });
              onCellClick(role, idx, val);
            }}
            onShiftRow={handleShiftRow}
            isFr={isFr}
          />
        ))}
      </div>
    </div>
  );
};
