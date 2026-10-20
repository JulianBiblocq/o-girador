/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getVocalMeasureGroups } from '../../utils/vocalTimingUtils';
import { useSequencer } from '../../contexts/SequencerContext';
import { VoicePatternGridSectionProps } from './voice-grid/voiceGridTypes';
import { VoicePatternGridTupletBar } from './voice-grid/VoicePatternGridTupletBar';
import { VoiceMeasureBlock } from './voice-grid/VoiceMeasureBlock';

export type { VoicePatternGridSectionProps };

export const VoicePatternGridSection: React.FC<VoicePatternGridSectionProps> = (props) => {
  const {
    trackId, pattern, timeSig = '4/4', lang, isTupletEditMode, selectedPatternId,
    selectedStepIdx, selectedStepIsPreRoll, selectedStepRange, isMultiSelectActive,
    preRollLengthComputed, swingOffsets, isStepInRange, handlePatternBeatResolutionChange,
    handleSetPatternAllBeatsResolution, handleDeletePatternMeasure, confirmAsync: propConfirmAsync,
    ...stepHandlers
  } = props;

  const sequencer = useSequencer();
  const confirmFn = propConfirmAsync || sequencer.confirmAsync;

  let inferredBeats = 4;
  if (timeSig === '3/4') inferredBeats = 3;
  if (timeSig === '2/4' || timeSig === '6/8') inferredBeats = 2;
  if (timeSig === '12/8') inferredBeats = 4;

  const beatsPerMeasure = inferredBeats;
  const measureGroups = getVocalMeasureGroups(pattern.steps || 16, pattern.beatResolutions, beatsPerMeasure);

  const isCurrentAll12 = Array.isArray(pattern.beatResolutions) && pattern.beatResolutions.length >= beatsPerMeasure && pattern.beatResolutions.slice(0, beatsPerMeasure).every(r => r === 3);
  const isCurrentAll16 = !pattern.beatResolutions || pattern.beatResolutions.slice(0, beatsPerMeasure).every(r => r === 4);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {isTupletEditMode && (
        <VoicePatternGridTupletBar
          pattern={pattern} lang={lang} isCurrentAll12={isCurrentAll12} isCurrentAll16={isCurrentAll16}
          onSetAllBeatsResolution={handleSetPatternAllBeatsResolution}
        />
      )}

      {measureGroups.map((measure) => (
        <VoiceMeasureBlock
          key={`voice-measure-${measure.measureIndex}`} measure={measure} totalMeasures={measureGroups.length}
          pattern={pattern} trackId={trackId} lang={lang} isTupletEditMode={isTupletEditMode}
          selectedPatternId={selectedPatternId} selectedStepIdx={selectedStepIdx} selectedStepIsPreRoll={selectedStepIsPreRoll}
          selectedStepRange={selectedStepRange} isMultiSelectActive={isMultiSelectActive} preRollLengthComputed={preRollLengthComputed}
          swingOffsets={swingOffsets} isStepInRange={isStepInRange} onBeatResolutionChange={handlePatternBeatResolutionChange}
          onDeleteMeasure={handleDeletePatternMeasure} confirmFn={confirmFn} stepHandlers={stepHandlers}
        />
      ))}
    </div>
  );
};
