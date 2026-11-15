/**
 * Wrapper d'un pas de percussion avec support Points de Vigilance (< 128 lignes).
 */
import React from 'react';
import { Pattern } from '../../../types';
import { PercussionStepCell } from './PercussionStepCell';
import { computeStepVisualProps } from './percussionWrapperHelpers';
import { usePaperVigilanceStore } from '../../../stores/usePaperVigilanceStore';
import { Check } from 'lucide-react';

interface PercussionStepWrapperProps {
  i: number;
  indexInGroup: number;
  isTriplet: boolean;
  isSextuplet: boolean;
  isOcto: boolean;
  pattern: Pattern;
  trackId: number;
  instrument: { id: string; colors: Record<string, string>; [key: string]: any };
  swingOffsets: Record<number, number>;
  activeVigilanceFocus: { id?: string; patternId?: number; stepIndex?: number; trackId?: number } | null;
  selectedStepIndices: number[];
  selectedStepIdx: number | null;
  selectedSubIndex: 0 | 1 | null;
  activeTool?: string;
  isMultiSelectActive: boolean;
  onMouseDown: (e: React.MouseEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  onMouseEnter: (i: number, e?: React.MouseEvent, subIndex?: 0 | 1) => void;
  onTouchStart: (e: React.TouchEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  onContextMenu: (e: React.MouseEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, i: number, val: any, subIndex?: 0 | 1) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  onSelectForSculpt: (i: number, subIndex?: 0 | 1) => void;
}

export const PercussionStepWrapper: React.FC<PercussionStepWrapperProps> = ({
  i, indexInGroup, isTriplet, isSextuplet, isOcto, pattern, trackId,
  instrument, swingOffsets, activeVigilanceFocus, selectedStepIndices,
  selectedStepIdx, selectedSubIndex, activeTool, isMultiSelectActive,
  onMouseDown, onMouseEnter, onTouchStart, onTouchMove, onTouchEnd,
  onContextMenu, onChange, onKeyDown, onSelectForSculpt,
}) => {
  const vis = computeStepVisualProps(pattern, instrument, swingOffsets, i);
  const isMultiSelected = selectedStepIndices.includes(i);

  const vigilancePoint = usePaperVigilanceStore((s) => {
    const activeScoreId = s.activeSequencerScoreId;
    if (!activeScoreId) return undefined;
    return s.points.find(
      (p) => p.scoreId === activeScoreId && (p.patternId ? p.patternId === pattern.id : p.trackId === trackId) && p.stepIndex === i
    );
  });
  const removePoint = usePaperVigilanceStore((s) => s.removePoint);

  let wrapperClasses = `relative flex flex-col items-center w-full min-w-0 flex-1 ${isMultiSelected ? 'z-20' : ''}`;
  let wrapperStyle: React.CSSProperties = {};
  if (isSextuplet) {
    wrapperClasses = `absolute flex flex-col items-center justify-center top-1.5 ${isMultiSelected || selectedStepIdx === i ? 'z-20' : 'z-10'} hover:z-20`;
    wrapperStyle = { width: '16.6%', left: `${indexInGroup * 16.6}%` };
  }

  const isVigilanceTarget = Boolean(activeVigilanceFocus && vigilancePoint && activeVigilanceFocus.id === vigilancePoint.id);

  return (
    <div
      className={`${wrapperClasses} ${
        isVigilanceTarget
          ? 'ring-2 ring-[var(--cordel-gold)] ring-offset-2 rounded animate-pulse z-20 bg-[var(--cordel-gold)]/20'
          : vigilancePoint
            ? 'ring-2 ring-[var(--cordel-gold)] ring-offset-1 rounded bg-[var(--cordel-gold)]/15 z-10'
            : ''
      }`}
      style={wrapperStyle}
    >
      <div className="absolute top-[12px] bottom-[15px] left-1/2 w-0 border-l border-dashed border-[var(--cordel-ink-dark)]/30 -translate-x-1/2 pointer-events-none z-0" />
      <div className="text-[8px] text-[var(--cordel-text-muted)] font-bold mb-0.5 z-10 relative">{i + 1}</div>

      {vigilancePoint && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removePoint(vigilancePoint.id);
          }}
          className="absolute -top-1.5 -right-1 z-30 p-0.5 bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] rounded-full border border-[var(--cordel-ink-dark)] shadow-xs cursor-pointer"
          title="Acquitter le point de vigilance"
        >
          <Check size={8} strokeWidth={3} />
        </button>
      )}

      <PercussionStepCell
        i={i} val={vis.val}
        volume={pattern?.volumes?.[i] ?? 70}
        decay={pattern?.decays?.[i] ?? 100}
        microtiming={pattern?.microtimings?.[i] ?? 0}
        isSelected={selectedStepIndices.includes(i)}
        isMultiSelected={isMultiSelected}
        isFocused={selectedStepIdx === i}
        selectedSubIndex={selectedStepIdx === i ? selectedSubIndex : null}
        activeTool={activeTool} shiftPx={vis.shiftPx} colorStyle={vis.colorStyle}
        splitLeftColor={vis.splitLeftColor} splitRightColor={vis.splitRightColor}
        splitLeftText={vis.splitLeftText} splitRightText={vis.splitRightText}
        isMultiSelectActive={isMultiSelectActive} isSextuplet={isSextuplet}
        isTriplet={isTriplet} isOcto={isOcto} indexInGroup={indexInGroup}
        totalShift={vis.totalShift} trackId={trackId} patternId={pattern.id}
        onMouseDown={onMouseDown} onMouseEnter={onMouseEnter}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd} onContextMenu={onContextMenu}
        onChange={onChange} onKeyDown={onKeyDown}
        onSelectForSculpt={onSelectForSculpt}
      />
    </div>
  );
};
