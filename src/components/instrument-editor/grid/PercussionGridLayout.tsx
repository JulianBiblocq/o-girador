
import React from 'react';
import { Pattern } from '../../../types';
import { computePercussionGridGroups } from './percussionGridHelpers';
import { splitIntoHalfMeasures } from './gridSymmetricSplitter';
import { PercussionStepWrapper } from './PercussionStepWrapper';

export interface PercussionGridLayoutProps {
  trackId: number;
  pattern: Pattern;
  instrument: { id: string; colors: Record<string, string>; [key: string]: any };
  isTupletEditMode: boolean;
  selectedStepIndices: number[];
  selectedStepIdx: number | null;
  selectedSubIndex: 0 | 1 | null;
  activeTool?: string;
  isMultiSelectActive: boolean;
  swingOffsets: Record<number, number>;
  activeVigilanceFocus: { patternId?: number; stepIndex?: number; trackId?: number } | null;
  handlePatternBeatResolutionChange: (patternId: number, groupIdx: number, resolution: number) => void;
  handleGridTouchMove: (e: React.TouchEvent) => void;
  handleGridTouchEnd: (e: React.TouchEvent) => void;
  handleCellTouchMove?: (e: React.TouchEvent) => void;
  handleCellTouchEnd: (e: React.TouchEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  handleCellMouseDown: (e: React.MouseEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  handleCellMouseEnter: (i: number) => void;
  handleCellTouchStart: (e: React.TouchEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  handleCellContextMenu: (e: React.MouseEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  handleCellChange: (e: React.ChangeEvent<HTMLInputElement>, i: number, val: any, subIndex?: 0 | 1) => void;
  handleCellKeyDown: (e: React.KeyboardEvent<any>, i: number, val: any, subIndex?: 0 | 1) => void;
  handleSelectStepForSculpt: (i: number, subIndex?: 0 | 1) => void;
}

export const PercussionGridLayout: React.FC<PercussionGridLayoutProps> = ({
  trackId, pattern, instrument, isTupletEditMode, selectedStepIndices,
  selectedStepIdx, selectedSubIndex, activeTool, isMultiSelectActive,
  swingOffsets, activeVigilanceFocus, handlePatternBeatResolutionChange,
  handleGridTouchMove, handleGridTouchEnd, handleCellTouchMove, handleCellTouchEnd,
  handleCellMouseDown, handleCellMouseEnter, handleCellTouchStart, handleCellContextMenu,
  handleCellChange, handleCellKeyDown, handleSelectStepForSculpt,
}) => {
  const { groups } = computePercussionGridGroups(pattern);
  const { firstHalf, secondHalf, isSymmetric } = splitIntoHalfMeasures(groups);

  const renderBeatGroup = (group: number[], groupIdx: number) => {
    const isTriplet = group.length === 3;
    const isSextuplet = group.length === 6;
    const isOcto = group.length === 8;

    return (
      <div key={groupIdx} className="flex flex-col gap-1 w-full min-w-0 flex-1">
        {isTupletEditMode && (
          <div className="flex justify-center mb-1">
            <select
              value={group.length}
              onChange={(e) => handlePatternBeatResolutionChange(pattern.id, groupIdx, parseInt(e.target.value, 10))}
              className="text-[10px] bg-[#ece4d0] border border-[#1a1a1a]/20 rounded-sm outline-none px-1 py-0.5 font-bold cursor-pointer hover:bg-[#ece4d0]/80 transition-colors"
            >
              <option value="3">3 (Triolet)</option>
              <option value="4">4 (D.Croches)</option>
              <option value="6">6 (Sextolet)</option>
              <option value="8">8 (Fusas)</option>
            </select>
          </div>
        )}
        <div
          className={`p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm relative w-full min-w-0 ${
            isSextuplet
              ? 'h-[72px]'
              : isTriplet
              ? 'grid grid-cols-3 gap-1'
              : isOcto
              ? 'grid grid-cols-8 gap-0.5'
              : 'grid grid-cols-4 gap-1'
          }`}
        >
          {group.map((i, indexInGroup) => (
            <PercussionStepWrapper
              key={i}
              i={i}
              indexInGroup={indexInGroup}
              isTriplet={isTriplet}
              isSextuplet={isSextuplet}
              isOcto={isOcto}
              pattern={pattern}
              trackId={trackId}
              instrument={instrument}
              swingOffsets={swingOffsets}
              activeVigilanceFocus={activeVigilanceFocus}
              selectedStepIndices={selectedStepIndices}
              selectedStepIdx={selectedStepIdx}
              selectedSubIndex={selectedSubIndex}
              activeTool={activeTool}
              isMultiSelectActive={isMultiSelectActive}
              onMouseDown={handleCellMouseDown}
              onMouseEnter={handleCellMouseEnter}
              onTouchStart={handleCellTouchStart}
              onTouchMove={handleCellTouchMove}
              onTouchEnd={handleCellTouchEnd}
              onContextMenu={handleCellContextMenu}
              onChange={handleCellChange}
              onKeyDown={handleCellKeyDown}
              onSelectForSculpt={handleSelectStepForSculpt}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="step-boxes flex flex-wrap gap-2 lg:gap-3 w-full"
      id={`detail-steps-${trackId}-${pattern.id}`}
      onTouchMove={handleGridTouchMove}
      onTouchEnd={handleGridTouchEnd}
    >
      {isSymmetric ? (
        <>
          <div className="flex flex-nowrap items-stretch gap-2 lg:gap-3 flex-1 min-w-[210px]">
            {firstHalf.map((group, idx) => renderBeatGroup(group, idx))}
          </div>
          <div className="flex flex-nowrap items-stretch gap-2 lg:gap-3 flex-1 min-w-[210px]">
            {secondHalf.map((group, idx) => renderBeatGroup(group, firstHalf.length + idx))}
          </div>
        </>
      ) : (
        groups.map((group, groupIdx) => renderBeatGroup(group, groupIdx))
      )}
    </div>
  );
};
