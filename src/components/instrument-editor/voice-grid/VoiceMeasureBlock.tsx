/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Pattern } from '../../../types';
import { VoiceBeatGroupCellList } from './VoiceBeatGroupCellList';

interface VoiceMeasureBlockProps {
  measure: { measureIndex: number; groups: Array<{ beatIndex: number; steps: number[]; resolution: number }> };
  totalMeasures: number;
  pattern: Pattern;
  trackId: number;
  lang: string;
  isTupletEditMode: boolean;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean | null;
  selectedStepRange: any;
  isMultiSelectActive: boolean;
  preRollLengthComputed: number;
  swingOffsets: Float32Array | number[];
  isStepInRange: (range: any, cellIsPreRoll: boolean, cellStep: number, preRollCount: number) => boolean;
  onBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
  onDeleteMeasure: (trackId: number, patternId: number, measureIdx: number) => void;
  confirmFn: (message: string) => Promise<boolean>;
  stepHandlers: any;
}

export const VoiceMeasureBlock: React.FC<VoiceMeasureBlockProps> = React.memo((props) => {
  const {
    measure, totalMeasures, pattern, trackId, lang, isTupletEditMode,
    selectedPatternId, selectedStepIdx, selectedStepIsPreRoll, selectedStepRange,
    isMultiSelectActive, preRollLengthComputed, swingOffsets, isStepInRange,
    onBeatResolutionChange, onDeleteMeasure, confirmFn, stepHandlers,
  } = props;

  const m = measure.measureIndex;
  const groups = measure.groups;
  const halfPoint = Math.ceil(groups.length / 2);
  const firstHalf = groups.slice(0, halfPoint);
  const secondHalf = groups.slice(halfPoint);

  const handleDelete = async () => {
    const confirmMsg = lang === 'fr'
      ? `Supprimer la mesure ${m + 1} du motif ? Cette action est irréversible.`
      : `Excluir o compasso ${m + 1} do padrão? Esta ação é irreversível.`;
    const confirmed = await confirmFn(confirmMsg);
    if (!confirmed) return;
    onDeleteMeasure(trackId, pattern.id, m);
  };

  const renderGroup = (groupItem: typeof groups[0]) => (
    <VoiceBeatGroupCellList
      key={`beat-group-${m}-${groupItem.beatIndex}`}
      groupItem={groupItem} measureIndex={m} pattern={pattern} trackId={trackId}
      lang={lang} isTupletEditMode={isTupletEditMode} selectedPatternId={selectedPatternId}
      selectedStepIdx={selectedStepIdx} selectedStepIsPreRoll={selectedStepIsPreRoll}
      selectedStepRange={selectedStepRange} isMultiSelectActive={isMultiSelectActive}
      preRollLengthComputed={preRollLengthComputed} swingOffsets={swingOffsets}
      isStepInRange={isStepInRange} onBeatResolutionChange={onBeatResolutionChange}
      {...stepHandlers}
    />
  );

  return (
    <div key={`voice-measure-${m}`} className="flex flex-col gap-1 w-full">
      <div className="text-[9px] font-bold text-[#1a1a1a]/40 tracking-wider uppercase pl-1 flex items-center gap-2">
        <span>{lang === 'fr' ? `Mesure ${m + 1}` : `Compasso ${m + 1}`}</span>
        {totalMeasures > 1 && (
          <button
            onClick={handleDelete}
            className="text-[#8b2a1a] hover:text-[#a63d2d] transition-colors p-0.5 hover:bg-[#8b2a1a]/10 rounded cursor-pointer"
            title={lang === 'fr' ? 'Supprimer cette mesure' : 'Excluir este compasso'}
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 w-full p-1 bg-[#ece4d0]/10 border border-[#1a1a1a]/15 rounded-md">
        <div className="flex flex-row gap-1.5 sm:gap-2 w-full justify-between items-stretch">
          {firstHalf.map(renderGroup)}
        </div>
        {secondHalf.length > 0 && (
          <div className="flex flex-row gap-1.5 sm:gap-2 w-full justify-between items-stretch">
            {secondHalf.map(renderGroup)}
          </div>
        )}
      </div>
    </div>
  );
});

VoiceMeasureBlock.displayName = 'VoiceMeasureBlock';
